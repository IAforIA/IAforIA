import { Router } from "express";
import { storage } from "./storage.js";
import { AIEngine } from "./ai-engine.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertOrderSchema, insertMotoboySchema, insertChatMessageSchema } from "@shared/schema";
import { authenticateToken, requireRole, verifyTokenFromQuery } from "./middleware/auth.js";
// Importa a função broadcast global do index.ts
import { broadcast } from "./index.js";

// CRÍTICO: Variáveis de ambiente separadas para melhor segurança
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for security');
}
const JWT_SECRET = process.env.JWT_SECRET;

// A função `registerRoutes` agora retorna apenas o router
export async function registerRoutes() {
  const router = Router();

  // --- Rotas de Autenticação ---
  router.post("/api/auth/login", async (req, res) => {
    try {
      // CORREÇÃO: Espera 'email' em vez de 'id'
      const { email, password } = req.body;

      // CORREÇÃO: Usa a nova função 'getUserByEmail' (que adicionaremos no storage.ts)
      const user = await storage.getUserByEmail(email);

      if (!user) {
        // Agora este erro está correto (Email não encontrado)
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Senha inválida" });
      }

      // O 'id' do usuário (UUID) é usado para criar o token, o que está PERFEITO.
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

      res.json({
        access_token: token,
        id: user.id,
        name: user.name,
        role: user.role
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  // --- Rotas de Pedidos (AGORA AUTENTICADAS) ---
  router.get("/api/orders", authenticateToken, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pedidos" });
    }
  });

  router.get("/api/orders/pending", authenticateToken, async (req, res) => {
    try {
      const orders = await storage.getPendingOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pedidos pendentes" });
    }
  });

  router.post("/api/orders", authenticateToken, requireRole('client', 'central'), async (req, res) => {
    try {
      const validated = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validated);
      broadcast({ type: 'new_order', payload: order });
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao criar pedido" });
    }
  });

  router.post("/api/orders/:id/accept", authenticateToken, requireRole('motoboy', 'central'), async (req, res) => {
    try {
      const { motoboyId, motoboyName } = req.body;
      await storage.assignOrderToMotoboy(req.params.id, motoboyId, motoboyName);
      const order = await storage.getOrder(req.params.id);
      broadcast({ type: 'order_accepted', payload: order });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Erro ao aceitar pedido" });
    }
  });

  router.post("/api/orders/:id/deliver", authenticateToken, requireRole('motoboy', 'central'), async (req, res) => {
    try {
      await storage.updateOrderStatus(req.params.id, 'delivered');
      const order = await storage.getOrder(req.params.id);
      broadcast({ type: 'order_delivered', payload: order });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Erro ao entregar pedido" });
    }
  });

  // --- Rotas de Motoboys (AGORA AUTENTICADAS/AUTORIZADAS) ---
  router.get("/api/motoboys", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const motoboys = await storage.getAllMotoboys();
      res.json(motoboys);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar motoboys" });
    }
  });

  router.post("/api/motoboys/:id/location", authenticateToken, requireRole('motoboy'), async (req, res) => {
    try {
      const { lat, lng } = req.body;
      await storage.updateMotoboyLocation(req.params.id, Number(lat), Number(lng));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar localização" });
    }
  });

  // --- Rotas de Chat e Insights (AGORA AUTENTICADAS) ---
  router.get("/api/chat", authenticateToken, async (req, res) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
  });

  router.post("/api/chat", authenticateToken, async (req, res) => {
    try {
      const validated = insertChatMessageSchema.parse(req.body);
      const message = await storage.createChatMessage(validated);
      broadcast({ type: 'chat_message', payload: message });
      res.json(message);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Erro ao enviar mensagem" });
    }
  });

  router.get("/api/insights", authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      const motoboys = await storage.getAllMotoboys();
      // ... (Insights logic) ...
      res.json({ message: "Insights functionality paused until storage is updated." });
    } catch (error) {
      res.status(500).json({ error: "Erro ao gerar insights" });
    }
  });

  router.post("/api/upload/live-doc", authenticateToken, async (req, res) => {
    res.status(501).json({ message: "Upload functionality not implemented yet." });
  });

  return router;
}