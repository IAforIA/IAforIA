import { Router } from "express";
import { ZodError } from "zod";
import { eq } from "drizzle-orm";
import { authenticateToken, requireRole } from "../middleware/auth.ts";
import { storage } from "../storage.ts";
import { db } from "../db.ts";
import { orders, clients, insertOrderSchema } from "@shared/schema";
import { calculateGuririComission, isValidDeliveryValue } from "../analytics.ts";
import * as analytics from "../analytics.ts";
import { broadcast } from "../ws/broadcast.js";

const CLIENT_PROFILE_NOT_FOUND = "CLIENT_PROFILE_NOT_FOUND";

export function buildOrdersRouter() {
  const router = Router();

  router.get("/orders", authenticateToken, async (req, res) => {
    try {
      const user = req.user!;
      if (user.role === "central") {
        const all = await storage.getAllOrders();
        return res.json(all);
      }
      if (user.role === "client") {
        const mine = await storage.getOrdersByClientId(user.id);
        return res.json(mine);
      }
      if (user.role === "motoboy") {
        const myOrders = await storage.getOrdersByMotoboyId(user.id);
        const pendingOrders = await storage.getPendingOrders();
        const allVisible = [...pendingOrders, ...myOrders].sort((a, b) => {
          const dateA = new Date(a.createdAt ?? 0).getTime();
          const dateB = new Date(b.createdAt ?? 0).getTime();
          return dateB - dateA;
        });
        return res.json(allVisible);
      }
      res.json([]);
    } catch (error) {
      console.error("💥 Erro ao buscar pedidos:", error);
      res.status(500).json({ error: "Erro ao buscar pedidos" });
    }
  });

  router.get("/orders/pending", authenticateToken, async (_req, res) => {
    try {
      const list = await storage.getPendingOrders();
      res.json(list);
    } catch (error) {
      console.error("💥 Erro ao buscar pedidos pendentes:", error);
      res.status(500).json({ error: "Erro ao buscar pedidos pendentes" });
    }
  });

  router.post("/orders", authenticateToken, requireRole("client", "central"), async (req, res) => {
    try {
      let payload = req.body ?? {};

      if (req.user?.role === "client") {
        const profile = await storage.getClientProfile(req.user.id);
        if (!profile) {
          return res.status(400).json({ error: CLIENT_PROFILE_NOT_FOUND });
        }
        const override = Boolean(payload.coletaOverride);
        payload = {
          ...payload,
          clientId: profile.id,
          clientName: profile.name,
          clientPhone: profile.phone,
          coletaRua: override ? payload.coletaRua : profile.address.rua,
          coletaNumero: override ? payload.coletaNumero : profile.address.numero,
          coletaBairro: override ? payload.coletaBairro : profile.address.bairro,
          coletaCep: override ? payload.coletaCep ?? profile.address.cep : profile.address.cep,
          coletaComplemento: override ? payload.coletaComplemento ?? null : profile.address.complemento ?? null,
          referencia: override ? payload.referencia ?? profile.address.referencia ?? null : profile.address.referencia ?? null,
          coletaOverride: override,
        };
      } else {
        payload = { coletaOverride: Boolean(payload.coletaOverride), ...payload };
      }

      if (payload.coletaOverride === false) {
        payload.coletaComplemento ??= null;
      }

      const validated = insertOrderSchema.parse(payload);
      const clienteData = await db.query.clients.findFirst({
        where: (tbl, { eq }) => eq(tbl.id, validated.clientId),
        columns: { mensalidade: true },
      });
      if (!clienteData) {
        return res.status(400).json({ error: "Cliente não encontrado" });
      }
      const hasMensalidade = Number(clienteData.mensalidade) > 0;
      const valorPedido = Number(validated.valor);
      if (!isValidDeliveryValue(valorPedido, hasMensalidade)) {
        const valoresPermitidos = analytics.getAllowedValues(hasMensalidade);
        return res.status(400).json({
          error: `Valor R$ ${valorPedido.toFixed(2)} não permitido para cliente ${hasMensalidade ? "COM" : "SEM"} mensalidade. Valores válidos: R$ ${valoresPermitidos.join(", ")}`,
        });
      }
      const comissao = calculateGuririComission(valorPedido, hasMensalidade);
      validated.taxaMotoboy = comissao.motoboy.toString();
      console.log(`💰 Pedido validado: Valor R$ ${valorPedido} | Motoboy R$ ${comissao.motoboy} | Guriri R$ ${comissao.guriri}`);
      const order = await storage.createOrder(validated);
      broadcast({ type: "new_order", payload: order });
      res.status(201).json(order);
    } catch (error: any) {
      console.error("💥 Erro ao criar pedido:", error);
      if (error.name === "ZodError") {
        const zodError = error as ZodError;
        const firstError = zodError.errors[0];
        const errorMessage = `${firstError.path.join(".")}: ${firstError.message}`;
        console.error("🔴 Erro de validação Zod:", errorMessage);
        return res.status(400).json({ error: errorMessage, details: zodError.errors });
      }
      const errorMessage = process.env.NODE_ENV === "production" ? "Erro ao processar pedido" : (error.message || "Erro ao criar pedido");
      res.status(400).json({ error: errorMessage });
    }
  });

  router.post("/orders/:id/accept", authenticateToken, requireRole("motoboy", "central"), async (req, res) => {
    try {
      let { motoboyId, motoboyName } = req.body;
      if (req.user!.role === "motoboy") {
        motoboyId = req.user!.id;
        motoboyName = req.user!.name;
      } else if (!motoboyId || !motoboyName) {
        return res.status(400).json({ error: "Motoboy ID e Nome são obrigatórios para atribuição manual" });
      }
      await storage.assignOrderToMotoboy(req.params.id, motoboyId, motoboyName);
      const order = await storage.getOrder(req.params.id);
      broadcast({ type: "order_accepted", payload: order });
      res.json(order);
    } catch (error) {
      console.error("💥 Erro ao aceitar pedido:", error);
      res.status(500).json({ error: "Erro ao aceitar pedido" });
    }
  });

  router.post("/orders/:id/deliver", authenticateToken, requireRole("motoboy", "central"), async (req, res) => {
    try {
      if (req.user!.role === "motoboy") {
        const currentOrder = await storage.getOrder(req.params.id);
        if (!currentOrder) {
          return res.status(404).json({ error: "Pedido não encontrado" });
        }
        if (currentOrder.motoboyId !== req.user!.id) {
          return res.status(403).json({ error: "Você só pode entregar pedidos atribuídos a você" });
        }
      }
      const { proofUrl } = req.body;
      console.log(`🚚 Entregando pedido ${req.params.id} com comprovante: ${proofUrl}`);
      await storage.updateOrderStatus(req.params.id, "delivered", proofUrl);
      const order = await storage.getOrder(req.params.id);
      console.log(`✅ Pedido ${req.params.id} atualizado para delivered. Status atual: ${order?.status}`);
      broadcast({ type: "order_delivered", payload: order });
      res.json(order);
    } catch (error) {
      console.error("💥 Erro ao entregar pedido:", error);
      res.status(500).json({ error: "Erro ao entregar pedido" });
    }
  });

  router.patch("/orders/:id/cancel", authenticateToken, requireRole("central"), async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      if (order.status === "delivered") {
        return res.status(400).json({ error: "Não é possível cancelar pedidos já entregues" });
      }
      await storage.updateOrderStatus(req.params.id, "cancelled");
      const updatedOrder = await storage.getOrder(req.params.id);
      console.log(`🚫 Pedido ${req.params.id} cancelado por ${req.user!.name}`);
      broadcast({ type: "order_cancelled", payload: updatedOrder });
      res.json(updatedOrder);
    } catch (error) {
      console.error("💥 Erro ao cancelar pedido:", error);
      res.status(500).json({ error: "Erro ao cancelar pedido" });
    }
  });

  router.patch("/orders/:id/reassign", authenticateToken, requireRole("central"), async (req, res) => {
    try {
      const { motoboyId } = req.body;
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      if (order.status === "delivered" || order.status === "cancelled") {
        return res.status(400).json({ error: "Não é possível reatribuir pedidos entregues ou cancelados" });
      }
      const motoboy = await storage.getMotoboy(motoboyId);
      if (!motoboy) {
        return res.status(404).json({ error: "Motoboy não encontrado" });
      }
      // Status 'pending' + motoboyId = pedido atribuído aguardando aceite do motoboy
      // O motoboy precisa aceitar para ir para 'in_progress'
      await db.update(orders)
        .set({ motoboyId, motoboyName: motoboy.name, status: "pending", acceptedAt: null })
        .where(eq(orders.id, req.params.id));
      const updatedOrder = await storage.getOrder(req.params.id);
      console.log(`🔄 Pedido ${req.params.id} atribuído para ${motoboy.name} (aguardando aceite) por ${req.user!.name}`);
      broadcast({ type: "order_reassigned", payload: updatedOrder });
      res.json(updatedOrder);
    } catch (error) {
      console.error("💥 Erro ao reatribuir pedido:", error);
      res.status(500).json({ error: "Erro ao reatribuir pedido" });
    }
  });

  // Motoboy recusa pedido atribuído a ele
  router.post("/orders/:id/decline", authenticateToken, requireRole("motoboy"), async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Pedido não encontrado" });
      }
      // Só pode recusar se o pedido está atribuído a ele e ainda pendente
      if (order.motoboyId !== req.user!.id) {
        return res.status(403).json({ error: "Este pedido não está atribuído a você" });
      }
      if (order.status !== "pending") {
        return res.status(400).json({ error: "Só é possível recusar pedidos pendentes" });
      }
      // Limpa motoboyId para que a central possa escolher outro
      await db.update(orders)
        .set({ motoboyId: null, motoboyName: null })
        .where(eq(orders.id, req.params.id));
      const updatedOrder = await storage.getOrder(req.params.id);
      console.log(`❌ Pedido ${req.params.id} recusado por ${req.user!.name}`);
      broadcast({ type: "order_declined", payload: updatedOrder });
      res.json(updatedOrder);
    } catch (error) {
      console.error("💥 Erro ao recusar pedido:", error);
      res.status(500).json({ error: "Erro ao recusar pedido" });
    }
  });

  return router;
}
