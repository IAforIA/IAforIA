---
title: API v1.0
sidebar_label: API Reference
---

[Home](../README.md) › API v1.0

# Guriri Express API v1.0

**Base URL:** `{{API_URL}}/api/v1`  
**Authentication:** Bearer Token (JWT)  
**Protocol:** HTTPS (production), HTTP (development)

---

## 🔐 Authentication

All endpoints (except login and register) require JWT authentication.

**Header Format:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Lifecycle:**
- **Expiration:** 24 hours
- **Refresh:** Not implemented (user must login again)
- **Revocation:** Change `JWT_SECRET` environment variable

[→ Authentication Endpoints](./endpoints/authentication/index.md)

---

## 📚 Endpoint Categories

### 🔓 [Authentication](./endpoints/authentication/index.md)

Public endpoints for user registration and login.

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| 🟡 POST | [/api/v1/auth/register](./endpoints/authentication/POST-register.md) | Register new client (PF/PJ) | 3/15min |
| 🟡 POST | [/api/v1/auth/login](./endpoints/authentication/POST-login.md) | Login with email/password | 100/15min |

### 📦 [Orders](./endpoints/orders/index.md)

Complete order lifecycle management.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| 🟢 GET | [/api/v1/orders](./endpoints/orders/GET-list-orders.md) | List orders (filtered by role) | Required |
| 🟢 GET | [/api/v1/orders/pending](./endpoints/orders/GET-pending-orders.md) | Pending orders only | Required |
| 🟡 POST | [/api/v1/orders](./endpoints/orders/POST-create-order.md) | Create delivery order | Client, Central |
| 🟡 POST | [/api/v1/orders/:id/accept](./endpoints/orders/POST-accept-order.md) | Motoboy accepts order | Motoboy, Central |
| 🟡 POST | [/api/v1/orders/:id/deliver](./endpoints/orders/POST-deliver-order.md) | Mark as delivered | Motoboy, Central |
| 🔵 PATCH | [/api/v1/orders/:id/cancel](./endpoints/orders/PATCH-cancel-order.md) | Cancel order | Central |
| 🔵 PATCH | [/api/v1/orders/:id/reassign](./endpoints/orders/PATCH-reassign-order.md) | Reassign to different motoboy | Central |

### 🏍️ [Motoboys](./endpoints/motoboys/index.md)

Driver management and GPS tracking.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| 🟢 GET | [/api/v1/motoboys](./endpoints/motoboys/GET-list-motoboys.md) | List all drivers | Central |
| 🟢 GET | [/api/v1/users/online](./endpoints/motoboys/GET-online-users.md) | Connected users (WebSocket) | Central |
| 🟡 POST | [/api/v1/motoboys](./endpoints/motoboys/POST-create-motoboy.md) | Create motoboy | Central |
| 🔵 PATCH | [/api/v1/motoboys/:id](./endpoints/motoboys/PATCH-update-motoboy.md) | Update motoboy info | Central |
| 🔵 PATCH | [/api/v1/motoboys/:id/online](./endpoints/motoboys/PATCH-online-status.md) | Set online/offline | Central |
| 🟡 POST | [/api/v1/motoboys/:id/location](./endpoints/motoboys/POST-update-location.md) | Update GPS coords | Motoboy |

### 🏢 [Clients](./endpoints/clients/index.md)

Business customer management.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| 🟢 GET | [/api/v1/clients](./endpoints/clients/GET-list-clients.md) | List all clients | Central |
| 🟡 POST | [/api/v1/clients](./endpoints/clients/POST-create-client.md) | Create client | Central |
| 🔵 PATCH | [/api/v1/clients/:id](./endpoints/clients/PATCH-update-client.md) | Update client info | Central |

### 💬 [Chat & AI](./endpoints/chat/index.md)

Real-time messaging with intelligent AI filtering.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| 🟢 GET | [/api/v1/chat](./endpoints/chat/GET-messages.md) | Get messages (RBAC filtered) | Required |
| 🟡 POST | [/api/v1/chat](./endpoints/chat/POST-send-message.md) | Send message (AI filtered) | Required |
| 🟢 GET | [/api/v1/chat/threads](./endpoints/chat/GET-threads.md) | List user threads | Required |
| 🟡 POST | [/api/v1/chat/ai-suggest](./endpoints/chat/POST-ai-suggestion.md) | Generate AI response | Central |
| 🟡 POST | [/api/v1/chat/ai-feedback](./endpoints/chat/POST-ai-feedback.md) | Rate AI suggestion | Central |
| 🟢 GET | [/api/v1/chat/usage-stats](./endpoints/chat/GET-usage-stats.md) | AI usage statistics | Required |
| 🟢 GET | [/api/v1/chat/budget-history](./endpoints/chat/GET-budget-history.md) | Cost tracking history | Central |

### 📊 [Analytics](./endpoints/analytics/index.md)

Business intelligence and financial reporting.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| 🟢 GET | [/api/v1/analytics/dashboard](./endpoints/analytics/GET-dashboard.md) | Central KPIs | Central |
| 🟢 GET | [/api/v1/analytics/revenue](./endpoints/analytics/GET-revenue.md) | Revenue by period | Central |
| 🟢 GET | [/api/v1/analytics/motoboy/:id](./endpoints/analytics/GET-motoboy-earnings.md) | Driver earnings | Motoboy, Central |
| 🟢 GET | [/api/v1/analytics/client/:id](./endpoints/analytics/GET-client-billing.md) | Client invoice/debt | Client, Central |
| 🟢 GET | [/api/v1/analytics/mrr](./endpoints/analytics/GET-mrr.md) | Monthly Recurring Revenue | Central |

### 👥 [Users & Admin](./endpoints/admin/index.md)

User management and administration.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| 🟢 GET | [/api/v1/users](./endpoints/admin/GET-users.md) | List all users | Central |
| 🔵 PATCH | [/api/v1/users/:id/status](./endpoints/admin/PATCH-user-status.md) | Activate/deactivate user | Central |
| 🔵 PATCH | [/api/v1/users/:id/role](./endpoints/admin/PATCH-user-role.md) | Change user role | Central |
| 🔵 PATCH | [/api/v1/users/:id](./endpoints/admin/PATCH-update-user.md) | Update profile | User (own) |

---

## 📡 Real-Time Events

Guriri Express uses **WebSocket (Socket.IO)** for bidirectional real-time communication.

[→ WebSocket Events Documentation](../websocket/events.md)

**Key Events:**
- `new_order` - Order created
- `order_accepted` - Motoboy accepted
- `order_delivered` - Delivery completed
- `order_cancelled` - Order cancelled
- `order_reassigned` - Reassigned to different motoboy
- `chat_message` - New chat message
- `chat_ai_suggestion_available` - AI generated response

---

## 🔒 Authorization (RBAC)

Guriri Express uses **Role-Based Access Control** with 3 roles:

| Role | Description | Permissions |
|------|-------------|-------------|
| **client** | Business customers (restaurants, shops) | Create orders, view own orders, chat |
| **motoboy** | Delivery drivers | Accept orders, deliver, update GPS, chat |
| **central** | Admin/dispatch operators | Full access, analytics, user management |

**Endpoint Access Patterns:**

```typescript
// Public (no auth required)
POST /api/v1/auth/login
POST /api/v1/auth/register

// Authenticated (any role)
GET /api/v1/orders
GET /api/v1/chat

// Role-specific
POST /api/v1/orders                    // client, central
POST /api/v1/orders/:id/accept         // motoboy, central
PATCH /api/v1/orders/:id/cancel        // central only

// Self-access (user can only access own data)
GET /api/v1/me/profile                 // authenticated user
PATCH /api/v1/users/:id                // user must match :id
```

---

## 🚦 Rate Limiting

Protection against abuse and DDoS attacks.

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| **Login** | 100 requests | 15 minutes |
| **Register** | 3 requests | 15 minutes |
| **General API** | 100 requests | 1 minute |
| **Chat Messages** | Role-based | 1 hour |

**Rate Limit Headers:**
```http
RateLimit-Limit: 100
RateLimit-Remaining: 42
RateLimit-Reset: 1700086400
```

**429 Response:**
```json
{
  "error": "Muitas requisições. Tente novamente em 1 minuto."
}
```

---

## 📐 Data Models

### Core Entities

- [User](./models/User.md) - System users (all roles)
- [Client](./models/Client.md) - Business customer profile
- [Motoboy](./models/Motoboy.md) - Driver profile
- [Order](./models/Order.md) - Delivery order
- [ChatMessage](./models/ChatMessage.md) - Chat message
- [MotoboyLocation](./models/MotoboyLocation.md) - GPS tracking

### Schemas & Validation

All request bodies are validated with **Zod schemas**:

- [clientOnboardingSchema](./models/ClientOnboarding.md)
- [insertOrderSchema](./models/InsertOrder.md)
- [insertChatMessageSchema](./models/InsertChatMessage.md)

---

## 🧪 Testing

### Postman Collection

Download and import: [GuririExpress.postman_collection.json](../postman/GuririExpress.postman_collection.json)

**Features:**
- Pre-configured environments (dev, production)
- Auto-save JWT token after login
- Test scripts for response validation
- Example requests/responses

### cURL Examples

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"senha123"}'
```

**Create Order (with token):**
```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entregaRua": "Av. Atlântica",
    "entregaNumero": "1500",
    "entregaBairro": "Praia",
    "entregaCep": "29216000",
    "valor": "15.00",
    "formaPagamento": "pix"
  }'
```

---

## 🔗 Related Documentation

- [WebSocket Events](../websocket/events.md)
- [System Architecture](../../architecture/system-overview.md)
- [Database Schema](../../architecture/database-schema.md)
- [Authentication Guide](../../guides/authentication.md)
- [Deployment Guide](../../deployment/production.md)

---

**API Version:** v1.0  
**Last Updated:** 2024-11-24
