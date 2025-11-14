var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { Router } from "express";

// server/storage.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc } from "drizzle-orm";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  chatMessages: () => chatMessages,
  clientSchedules: () => clientSchedules,
  clients: () => clients,
  insertChatMessageSchema: () => insertChatMessageSchema,
  insertClientScheduleSchema: () => insertClientScheduleSchema,
  insertClientSchema: () => insertClientSchema,
  insertLiveDocSchema: () => insertLiveDocSchema,
  insertMotoboyLocationSchema: () => insertMotoboyLocationSchema,
  insertMotoboyScheduleSchema: () => insertMotoboyScheduleSchema,
  insertMotoboySchema: () => insertMotoboySchema,
  insertOrderSchema: () => insertOrderSchema,
  insertUserSchema: () => insertUserSchema,
  liveDocs: () => liveDocs,
  motoboyLocations: () => motoboyLocations,
  motoboySchedules: () => motoboySchedules,
  motoboys: () => motoboys,
  orders: () => orders,
  users: () => users
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  phone: text("phone"),
  email: text("email"),
  password: text("password").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertUserSchema = createInsertSchema(users).omit({ createdAt: true });
var motoboys = pgTable("motoboys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone"),
  placa: text("placa"),
  cpf: text("cpf"),
  taxaPadrao: decimal("taxa_padrao", { precision: 10, scale: 2 }).notNull().default("7.00"),
  status: text("status").notNull().default("ativo"),
  online: boolean("online").default(false),
  // REMOVIDOS: currentLat e currentLng
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertMotoboySchema = createInsertSchema(motoboys).omit({
  id: true,
  createdAt: true,
  online: true
  // currentLat e currentLng não estão mais aqui
});
var motoboyLocations = pgTable("motoboy_locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  motoboyId: varchar("motoboy_id").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  // Usando decimal para precisão GPS
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var insertMotoboyLocationSchema = createInsertSchema(motoboyLocations).omit({
  id: true,
  timestamp: true
});
var clients = pgTable("clients", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  company: text("company"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertClientSchema = createInsertSchema(clients).omit({ createdAt: true });
var orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  clientName: text("client_name").notNull(),
  clientPhone: text("client_phone").notNull(),
  coletaRua: text("coleta_rua").notNull(),
  coletaNumero: text("coleta_numero").notNull(),
  coletaComplemento: text("coleta_complemento"),
  coletaBairro: text("coleta_bairro").notNull(),
  coletaCep: text("coleta_cep").notNull(),
  entregaRua: text("entrega_rua").notNull(),
  entregaNumero: text("entrega_numero").notNull(),
  entregaComplemento: text("entrega_complemento"),
  entregaBairro: text("entrega_bairro").notNull(),
  entregaCep: text("entrega_cep").notNull(),
  referencia: text("referencia"),
  observacoes: text("observacoes"),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  taxaMotoboy: decimal("taxa_motoboy", { precision: 10, scale: 2 }).notNull().default("7.00"),
  formaPagamento: text("forma_pagamento").notNull(),
  hasTroco: boolean("has_troco").default(false),
  trocoValor: decimal("troco_valor", { precision: 10, scale: 2 }),
  motoboyId: varchar("motoboy_id"),
  motoboyName: text("motoboy_name"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  deliveredAt: timestamp("delivered_at")
});
var insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
  deliveredAt: true,
  motoboyId: true,
  motoboyName: true,
  status: true
});
var liveDocs = pgTable("live_docs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull(),
  motoboyId: varchar("motoboy_id").notNull(),
  tipo: text("tipo").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull(),
  gpsLat: decimal("gps_lat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gps_lng", { precision: 10, scale: 7 }),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull()
});
var insertLiveDocSchema = createInsertSchema(liveDocs).omit({
  id: true,
  uploadedAt: true
});
var chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromId: varchar("from_id").notNull(),
  fromName: text("from_name").notNull(),
  fromRole: text("from_role").notNull(),
  toId: varchar("to_id"),
  message: text("message").notNull(),
  orderId: varchar("order_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true
});
var motoboySchedules = pgTable("motoboy_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  motoboyId: varchar("motoboy_id").notNull(),
  diaSemana: integer("dia_semana").notNull(),
  turnoManha: boolean("turno_manha").default(false),
  turnoTarde: boolean("turno_tarde").default(false),
  turnoNoite: boolean("turno_noite").default(false)
});
var insertMotoboyScheduleSchema = createInsertSchema(motoboySchedules).omit({ id: true });
var clientSchedules = pgTable("client_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull(),
  horaAbertura: text("hora_abertura"),
  horaFechamento: text("hora_fechamento"),
  fechado: boolean("fechado").default(false)
});
var insertClientScheduleSchema = createInsertSchema(clientSchedules).omit({ id: true });

// server/storage.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required.");
}
var db = drizzle(neon(process.env.DATABASE_URL), { schema: schema_exports });
var DrizzleStorage = class {
  // --- Métodos de Usuário ---
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  // CORREÇÃO: Adicionada a nova função para buscar por email
  async getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }
  // --- Métodos de Localização ---
  async updateMotoboyLocation(id, lat, lng) {
    const newLocation = {
      motoboyId: id,
      latitude: lat.toString(),
      longitude: lng.toString()
    };
    await db.insert(motoboyLocations).values(newLocation);
  }
  async getLatestMotoboyLocations() {
    const allLocations = await db.select().from(motoboyLocations).orderBy(desc(motoboyLocations.timestamp));
    const latestByMotoboy = /* @__PURE__ */ new Map();
    for (const location of allLocations) {
      if (!latestByMotoboy.has(location.motoboyId)) {
        const normalizedLocation = {
          ...location,
          latitude: typeof location.latitude === "string" ? parseFloat(location.latitude) : location.latitude || 0,
          longitude: typeof location.longitude === "string" ? parseFloat(location.longitude) : location.longitude || 0
        };
        latestByMotoboy.set(location.motoboyId, normalizedLocation);
      }
    }
    return latestByMotoboy;
  }
  // --- Métodos de Motoboy ---
  async getAllMotoboys() {
    return await db.select().from(motoboys);
  }
  async getMotoboy(id) {
    const result = await db.select().from(motoboys).where(eq(motoboys.id, id)).limit(1);
    return result[0];
  }
  async createMotoboy(insertMotoboy) {
    const result = await db.insert(motoboys).values(insertMotoboy).returning();
    return result[0];
  }
  async updateMotoboy(id, data) {
    await db.update(motoboys).set(data).where(eq(motoboys.id, id));
  }
  async setMotoboyOnline(id, online) {
    await db.update(motoboys).set({ online }).where(eq(motoboys.id, id));
  }
  // --- Métodos de Pedidos ---
  async getAllOrders() {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }
  async getOrder(id) {
    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return result[0];
  }
  async getPendingOrders() {
    return await db.select().from(orders).where(eq(orders.status, "pending"));
  }
  async createOrder(order) {
    const result = await db.insert(orders).values(order).returning();
    return result[0];
  }
  async updateOrderStatus(id, status) {
    await db.update(orders).set({ status, deliveredAt: /* @__PURE__ */ new Date() }).where(eq(orders.id, id));
  }
  async assignOrderToMotoboy(orderId, motoboyId, motoboyName) {
    await db.update(orders).set({
      motoboyId,
      motoboyName,
      status: "in_progress",
      acceptedAt: /* @__PURE__ */ new Date()
    }).where(eq(orders.id, orderId));
  }
  // --- Métodos de Chat ---
  async getChatMessages(limit) {
    const query = db.select().from(chatMessages).orderBy(desc(chatMessages.createdAt));
    if (limit) query.limit(limit);
    return await query;
  }
  async createChatMessage(message) {
    const result = await db.insert(chatMessages).values(message).returning();
    return result[0];
  }
};
var storage = new DrizzleStorage();

// server/routes.ts
import bcrypt from "bcryptjs";
import jwt2 from "jsonwebtoken";

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required for security");
}
var JWT_SECRET = process.env.JWT_SECRET;
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
function verifyTokenFromQuery(token) {
  if (!token) {
    return null;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.warn("Invalid token from query parameter.");
    return null;
  }
}

// server/routes.ts
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required for security");
}
var JWT_SECRET2 = process.env.JWT_SECRET;
async function registerRoutes() {
  const router = Router();
  router.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Usu\xE1rio n\xE3o encontrado" });
      }
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Senha inv\xE1lida" });
      }
      const token = jwt2.sign({ id: user.id, role: user.role }, JWT_SECRET2, { expiresIn: "24h" });
      res.json({
        access_token: token,
        id: user.id,
        name: user.name,
        role: user.role,
        phone: user.phone
      });
    } catch (error) {
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });
  router.get("/api/orders", authenticateToken, async (_req, res) => {
    try {
      const orders2 = await storage.getAllOrders();
      res.json(orders2);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pedidos" });
    }
  });
  router.get("/api/orders/pending", authenticateToken, async (req, res) => {
    try {
      const orders2 = await storage.getPendingOrders();
      res.json(orders2);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar pedidos pendentes" });
    }
  });
  router.post("/api/orders", authenticateToken, requireRole("client", "central"), async (req, res) => {
    try {
      const validated = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validated);
      broadcast({ type: "new_order", payload: order });
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: error.message || "Erro ao criar pedido" });
    }
  });
  router.post("/api/orders/:id/accept", authenticateToken, requireRole("motoboy", "central"), async (req, res) => {
    try {
      const { motoboyId, motoboyName } = req.body;
      await storage.assignOrderToMotoboy(req.params.id, motoboyId, motoboyName);
      const order = await storage.getOrder(req.params.id);
      broadcast({ type: "order_accepted", payload: order });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Erro ao aceitar pedido" });
    }
  });
  router.post("/api/orders/:id/deliver", authenticateToken, requireRole("motoboy", "central"), async (req, res) => {
    try {
      await storage.updateOrderStatus(req.params.id, "delivered");
      const order = await storage.getOrder(req.params.id);
      broadcast({ type: "order_delivered", payload: order });
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Erro ao entregar pedido" });
    }
  });
  router.get("/api/motoboys", authenticateToken, requireRole("central"), async (req, res) => {
    try {
      const motoboys2 = await storage.getAllMotoboys();
      res.json(motoboys2);
    } catch (error) {
      res.status(500).json({ error: "Erro ao buscar motoboys" });
    }
  });
  router.post("/api/motoboys/:id/location", authenticateToken, requireRole("motoboy"), async (req, res) => {
    try {
      const { lat, lng } = req.body;
      await storage.updateMotoboyLocation(req.params.id, Number(lat), Number(lng));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Erro ao atualizar localiza\xE7\xE3o" });
    }
  });
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
      broadcast({ type: "chat_message", payload: message });
      res.json(message);
    } catch (error) {
      res.status(400).json({ error: error.message || "Erro ao enviar mensagem" });
    }
  });
  router.get("/api/insights", authenticateToken, requireRole("central"), async (req, res) => {
    try {
      const orders2 = await storage.getAllOrders();
      const motoboys2 = await storage.getAllMotoboys();
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

// server/vite.ts
import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    configFile: path.resolve(import.meta.dirname, "..", "vite.config.ts"),
    customLogger: {
      ...viteLogger
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplatePath = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplatePath, "utf-8");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
var app = express2();
var httpServer;
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });
  next();
});
var wsClients = /* @__PURE__ */ new Map();
function broadcast(message, excludeId) {
  const data = JSON.stringify(message);
  wsClients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}
(async () => {
  const apiRouter = await registerRoutes();
  app.use(apiRouter);
  app.use((err, _req, res, _next) => {
    console.error(err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });
  const port = parseInt(process.env.PORT || "5000", 10);
  const host = "0.0.0.0";
  if (app.get("env") === "development") {
    httpServer = createServer(app);
    await setupVite(app, httpServer);
    httpServer.listen({ port, host }, () => {
      log(`serving in development on port ${port}`);
    });
  } else {
    serveStatic(app);
    httpServer = createServer(app);
    httpServer.listen({ port, host }, () => {
      log(`serving in production on port ${port}`);
    });
  }
  if (httpServer) {
    const wss = new WebSocketServer({ server: httpServer });
    wss.on("connection", (ws, req) => {
      const urlParams = new URLSearchParams(req.url?.split("?")[1] || "");
      const token = urlParams.get("token");
      const user = verifyTokenFromQuery(token);
      if (!user) {
        ws.terminate();
        return;
      }
      wsClients.set(user.id, ws);
      log(`WebSocket connected: ${user.id} (${user.role})`);
      ws.on("close", () => {
        wsClients.delete(user.id);
        log(`WebSocket disconnected: ${user.id}`);
      });
    });
  }
})();
export {
  broadcast
};
