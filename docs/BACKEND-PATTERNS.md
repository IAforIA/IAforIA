# Guriri Express - Backend Patterns

> **Versão:** 2.1.0 | **Atualizado:** 2025-12-13

---

## 1. Estrutura do Backend

### 1.1 Arquivos Principais

| Arquivo | Propósito |
|---------|-----------|
| `server/index.ts` | Entry point, Express + WebSocket setup |
| `server/routes/index.ts` | Aggregador de rotas |
| `server/routes/*.ts` | Rotas organizadas por domínio |
| `server/storage.ts` | Data Access Layer (DAL) |
| `server/db.ts` | Conexão Drizzle com PostgreSQL |
| `server/middleware/auth.ts` | JWT authentication |
| `server/ws/broadcast.js` | WebSocket helpers |
| `server/ai-engine.ts` | IA para assignment e pricing |
| `server/chatbot-filter.ts` | Filtro de chat com IA |

### 1.2 Organização de Rotas

```
server/routes/
├── index.ts        # Aggregador - monta todas as rotas
├── auth.ts         # /api/auth/* (login, register)
├── orders.ts       # /api/orders/*
├── motoboys.ts     # /api/motoboys/*
├── clients.ts      # /api/clients/*
├── users.ts        # /api/users/*
├── chat.ts         # /api/chat/*
├── reports.ts      # /api/reports/*
├── analytics.ts    # /api/analytics/*
├── uploads.ts      # /api/upload/*
├── schedules.ts    # /api/schedules/*
└── health.ts       # /api/health, /api/ready
```

---

## 2. Middleware de Autenticação

### 2.1 authenticateToken

Extrai e valida JWT do header Authorization.

```typescript
// server/middleware/auth.ts
import jwt from 'jsonwebtoken';

export interface AuthUser {
  id: string;
  role: 'client' | 'motoboy' | 'central';
  name: string;
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1]; // "Bearer <token>"
  
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}
```

### 2.2 requireRole

Verifica se usuário tem permissão baseado no role.

```typescript
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    next();
  };
}
```

### 2.3 Uso nas Rotas

```typescript
import { authenticateToken, requireRole } from '../middleware/auth.ts';

// Apenas central
router.get('/motoboys', 
  authenticateToken, 
  requireRole('central'), 
  async (req, res) => { ... }
);

// Motoboy ou central
router.post('/orders/:id/accept',
  authenticateToken,
  requireRole('motoboy', 'central'),
  async (req, res) => { ... }
);

// Qualquer autenticado
router.get('/orders',
  authenticateToken,
  async (req, res) => { ... }
);
```

---

## 3. Storage Layer (DAL)

### 3.1 Estrutura

```typescript
// server/storage.ts
import { db } from './db.ts';
import { users, orders, motoboys, clients, ... } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

class DrizzleStorage {
  // Users
  async getUserByEmail(email: string) { ... }
  async getUserById(id: string) { ... }
  async createUser(data: InsertUser) { ... }
  async updateUser(id: string, data: Partial<User>) { ... }
  
  // Orders
  async getAllOrders() { ... }
  async getOrdersByClientId(clientId: string) { ... }
  async createOrder(data: InsertOrder) { ... }
  async updateOrderStatus(id: string, status: string) { ... }
  
  // Motoboys
  async getAllMotoboys() { ... }
  async getMotoboy(id: string) { ... }
  async updateMotoboy(id: string, data: Partial<Motoboy>) { ... }
  
  // ... outros métodos
}

export const storage = new DrizzleStorage();
```

### 3.2 Padrões de Query

```typescript
// Busca com filtro
async getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0]; // undefined se não encontrar
}

// Lista com ordenação
async getAllOrders(): Promise<Order[]> {
  return db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt));
}

// Insert com retorno
async createOrder(data: InsertOrder): Promise<Order> {
  const result = await db
    .insert(orders)
    .values(data)
    .returning();
  return result[0];
}

// Update
async updateOrderStatus(id: string, status: string): Promise<void> {
  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id));
}
```

---

## 4. WebSocket Broadcasting

### 4.1 Estrutura do Servidor WS

```typescript
// server/index.ts
import { WebSocketServer, WebSocket } from 'ws';

const wss = new WebSocketServer({ server });
const wsClients = new Map<string, WebSocket>();

wss.on('connection', (ws, req) => {
  // Extrai token da query string
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  
  // Valida JWT
  const user = jwt.verify(token, JWT_SECRET);
  wsClients.set(user.id, ws);
  
  // Broadcast driver online
  broadcast({ type: 'driver_online', payload: { id: user.id } });
  
  ws.on('close', () => {
    wsClients.delete(user.id);
    broadcast({ type: 'driver_offline', payload: { id: user.id } });
  });
});
```

### 4.2 Função broadcast

```typescript
// server/ws/broadcast.js
const wsClients = new Map();

export function broadcast(message, excludeId) {
  wsClients.forEach((ws, id) => {
    if (id !== excludeId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

export function getOnlineUsers() {
  return Array.from(wsClients.keys());
}
```

### 4.3 Uso nas Rotas

```typescript
import { broadcast } from '../ws/broadcast.js';

router.post('/orders', async (req, res) => {
  const order = await storage.createOrder(data);
  
  // Notifica todos os clientes WebSocket
  broadcast({ type: 'new_order', payload: order });
  
  res.status(201).json(order);
});

router.post('/orders/:id/accept', async (req, res) => {
  await storage.assignOrderToMotoboy(id, motoboyId, motoboyName);
  const order = await storage.getOrder(id);
  
  broadcast({ type: 'order_accepted', payload: order });
  
  res.json(order);
});
```

---

## 5. Padrões de Resposta

### 5.1 Formato Direto (maioria das rotas)

```typescript
// Objeto
res.json({ id: "uuid", name: "...", ... });

// Array
res.json([{ id: "..." }, { id: "..." }]);

// Com status code
res.status(201).json(order);
```

### 5.2 Formato Wrapper (rotas de reports)

```typescript
// Sucesso
res.json({
  success: true,
  data: {
    summary: { ... },
    breakdown: { ... },
    orders: [ ... ]
  }
});

// Erro
res.status(500).json({
  success: false,
  error: "Mensagem de erro"
});
```

### 5.3 Códigos de Status

| Código | Quando Usar |
|--------|-------------|
| 200 | Sucesso (GET, PATCH, POST que retorna) |
| 201 | Criado (POST) |
| 400 | Validação falhou |
| 401 | Não autenticado |
| 403 | Sem permissão (role) |
| 404 | Recurso não existe |
| 409 | Conflito (duplicado) |
| 429 | Rate limit |
| 500 | Erro interno |

---

## 6. Validação com Zod

### 6.1 Schema no shared/

```typescript
// shared/schema.ts
import { pgTable, text, timestamp, ... } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull(),
  status: text('status').default('pending'),
  valor: text('valor').notNull(),
  // ...
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof insertOrderSchema._type;
```

### 6.2 Validação nas Rotas

```typescript
import { insertOrderSchema } from '@shared/schema';
import { ZodError } from 'zod';

router.post('/orders', async (req, res) => {
  try {
    const validated = insertOrderSchema.parse(req.body);
    const order = await storage.createOrder(validated);
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        error: error.errors[0].message,
        details: error.errors 
      });
    }
    res.status(500).json({ error: 'Erro interno' });
  }
});
```

---

## 7. Rate Limiting

### 7.1 express-rate-limit

```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,                  // 100 tentativas
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Apenas 3 registros por IP
  message: { error: 'Muitas tentativas de cadastro.' },
});

router.post('/auth/login', loginLimiter, async (req, res) => { ... });
router.post('/auth/register', registerLimiter, async (req, res) => { ... });
```

---

## 8. Upload de Arquivos

### 8.1 Multer Setup

```typescript
import multer from 'multer';

const upload = multer({ dest: 'uploads/' });

router.post('/upload/live-doc', 
  authenticateToken,
  upload.single('file'),
  async (req, res) => {
    const { orderId, tipo, gpsLat, gpsLng } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    
    const liveDoc = await storage.createLiveDoc({
      orderId,
      motoboyId: req.user!.id,
      tipo,
      fileUrl,
      fileName: req.file.originalname,
      gpsLat,
      gpsLng,
    });
    
    res.json({ message: 'Upload realizado', liveDoc, fileUrl });
  }
);
```

---

## 9. AI Engine

### 9.1 Atribuição Automática

```typescript
// server/ai-engine.ts
export class AIEngine {
  static async findBestMotoboy(order: Order): Promise<Motoboy | null> {
    const motoboys = await storage.getAvailableMotoboys();
    const locations = await storage.getLatestMotoboyLocations();
    
    // Calcula distância para cada motoboy
    const scored = motoboys.map(m => ({
      motoboy: m,
      distance: this.calculateDistance(
        order.coletaLat, order.coletaLng,
        locations.get(m.id)?.lat, locations.get(m.id)?.lng
      ),
    }));
    
    // Retorna o mais próximo
    return scored.sort((a, b) => a.distance - b.distance)[0]?.motoboy;
  }
}
```

### 9.2 Precificação Dinâmica

```typescript
export function calculateGuririComission(valor: number, hasMensalidade: boolean) {
  // Clientes com mensalidade: comissão menor
  const rate = hasMensalidade ? 0.15 : 0.25;
  const guriri = valor * rate;
  const motoboy = valor - guriri;
  
  return { guriri, motoboy };
}
```

---

## 10. Logging

### 10.1 Logger Estruturado

```typescript
// server/logger.js
const logger = {
  info: (event: string, data?: object) => {
    console.log(JSON.stringify({ 
      level: 'info', 
      event, 
      ...data, 
      timestamp: new Date().toISOString() 
    }));
  },
  error: (event: string, data?: object) => {
    console.error(JSON.stringify({ 
      level: 'error', 
      event, 
      ...data,
      timestamp: new Date().toISOString() 
    }));
  },
  warn: (event: string, data?: object) => {
    console.warn(JSON.stringify({ 
      level: 'warn', 
      event, 
      ...data,
      timestamp: new Date().toISOString() 
    }));
  },
};

export default logger;
```

### 10.2 Uso

```typescript
import logger from '../logger.js';

router.get('/reports/company', async (req, res) => {
  logger.info('report_company_accessed', { 
    userId: req.user!.id, 
    filters: req.query 
  });
  
  try {
    const report = await getCompanyReport(filters);
    logger.info('report_company_generated', { 
      ordersCount: report.summary.totalOrders 
    });
    res.json({ success: true, data: report });
  } catch (error) {
    logger.error('report_company_error', { 
      message: error.message,
      stack: error.stack 
    });
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 11. Ordem de Rotas - CRÍTICO

> ⚠️ **IMPORTANTE:** Rotas específicas DEVEM vir ANTES de rotas com parâmetros.

```typescript
// ✅ CORRETO
router.get('/motoboys/me', ...);      // Específica primeiro
router.get('/motoboys/:id', ...);     // Parâmetro depois

// ❌ ERRADO - "me" será capturado como :id
router.get('/motoboys/:id', ...);
router.get('/motoboys/me', ...);      // Nunca será chamada!
```

---

## 12. ES Modules - CRÍTICO

Este projeto usa ES Modules. **Sempre use extensão `.js` nos imports:**

```typescript
// ✅ CORRETO
import { storage } from '../storage.js';
import { broadcast } from '../ws/broadcast.js';

// ❌ ERRADO - Causa erro de resolução
import { storage } from '../storage';
```

---

## Próximos Documentos

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Visão geral do sistema
- [API-REFERENCE.md](./API-REFERENCE.md) - Endpoints da API
- [WEBSOCKET-EVENTS.md](./WEBSOCKET-EVENTS.md) - Eventos em tempo real
- [FRONTEND-PATTERNS.md](./FRONTEND-PATTERNS.md) - Padrões do frontend
