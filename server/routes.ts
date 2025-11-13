import type { Express } from "express";
import { Router } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { AIEngine } from "./ai-engine";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { insertOrderSchema, insertMotoboySchema, insertChatMessageSchema } from "@shared/schema";
import { authenticateToken, requireRole, verifyTokenFromQuery } from "./middleware/auth";

const router = Router();
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required for security');
}
const JWT_SECRET = process.env.SESSION_SECRET;

const wsClients = new Map<string, WebSocket>();

function broadcast(message: any, excludeId?: string) {
  const data = JSON.stringify(message);
  wsClients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

router.post("/api/auth/login", async (req, res) => {
  try {
    const { id, password } = req.body;
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    
    res.json({ 
      access_token: token,
      refresh_token: token,
      id: user.id,
      name: user.name,
      role: user.role 
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao fazer login" });
  }
});

router.get("/api/orders", async (req, res) => {
  try {
    const orders = await storage.getAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
});

router.get("/api/orders/pending", async (req, res) => {
  try {
    const orders = await storage.getPendingOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar pedidos pendentes" });
  }
});

router.post("/api/orders", async (req, res) => {
  try {
    const validated = insertOrderSchema.parse(req.body);
    const order = await storage.createOrder(validated);
    
    broadcast({
      type: 'new_order',
      payload: order
    });
    
    res.json(order);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar pedido" });
  }
});

router.post("/api/orders/:id/accept", async (req, res) => {
  try {
    const { motoboyId, motoboyName } = req.body;
    await storage.assignOrderToMotoboy(req.params.id, motoboyId, motoboyName);
    const order = await storage.getOrder(req.params.id);
    
    broadcast({
      type: 'order_accepted',
      payload: order
    });
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Erro ao aceitar pedido" });
  }
});

router.post("/api/orders/:id/deliver", async (req, res) => {
  try {
    await storage.updateOrderStatus(req.params.id, 'delivered');
    const order = await storage.getOrder(req.params.id);
    
    broadcast({
      type: 'order_delivered',
      payload: order
    });
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: "Erro ao entregar pedido" });
  }
});

router.get("/api/motoboys", async (req, res) => {
  try {
    const motoboys = await storage.getAllMotoboys();
    res.json(motoboys);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar motoboys" });
  }
});

router.post("/api/motoboys", async (req, res) => {
  try {
    const validated = insertMotoboySchema.parse(req.body);
    const motoboy = await storage.createMotoboy(validated);
    res.json(motoboy);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao criar motoboy" });
  }
});

router.put("/api/motoboys/:id", async (req, res) => {
  try {
    await storage.updateMotoboy(req.params.id, req.body);
    const motoboy = await storage.getMotoboy(req.params.id);
    res.json(motoboy);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar motoboy" });
  }
});

router.post("/api/motoboys/:id/location", async (req, res) => {
  try {
    const { lat, lng } = req.body;
    await storage.updateMotoboyLocation(req.params.id, lat, lng);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar localização" });
  }
});

router.get("/api/chat", async (req, res) => {
  try {
    const messages = await storage.getChatMessages();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar mensagens" });
  }
});

router.post("/api/chat", async (req, res) => {
  try {
    const validated = insertChatMessageSchema.parse(req.body);
    const message = await storage.createChatMessage(validated);
    
    broadcast({
      type: 'chat_message',
      payload: message
    });
    
    res.json(message);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao enviar mensagem" });
  }
});

router.get("/api/insights", async (req, res) => {
  try {
    const orders = await storage.getAllOrders();
    const motoboys = await storage.getAllMotoboys();
    const insights = AIEngine.generateInsights(orders, motoboys);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar insights" });
  }
});

router.post("/api/upload/live-doc", async (req, res) => {
  try {
    const { orderId, motoboyId, tipo, fileData, fileName, gpsLat, gpsLng } = req.body;
    
    const fileUrl = `data:image/jpeg;base64,${fileData}`;
    
    const doc = await storage.createLiveDoc({
      orderId,
      motoboyId,
      tipo,
      fileUrl,
      fileName,
      gpsLat,
      gpsLng,
    });
    
    broadcast({
      type: 'live_doc_uploaded',
      payload: doc
    });
    
    res.json(doc);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Erro ao fazer upload" });
  }
});

router.get("/api/live-docs/:orderId", async (req, res) => {
  try {
    const docs = await storage.getLiveDocsByOrder(req.params.orderId);
    res.json(docs);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar documentos" });
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(router);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    wsClients.set(userId, ws);
    
    console.log(`WebSocket client connected: ${userId}`);
    
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'chat') {
          const chatMsg = await storage.createChatMessage({
            fromId: message.fromId,
            fromName: message.fromName,
            fromRole: message.fromRole,
            toId: message.toId || null,
            message: message.message,
            orderId: message.orderId || null,
          });
          
          broadcast({ type: 'chat_message', payload: chatMsg });
        }
        
        if (message.type === 'location_update') {
          await storage.updateMotoboyLocation(message.motoboyId, message.lat, message.lng);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      wsClients.delete(userId);
      console.log(`WebSocket client disconnected: ${userId}`);
    });
  });

  return httpServer;
}
