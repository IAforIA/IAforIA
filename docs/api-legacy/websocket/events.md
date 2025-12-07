---
title: WebSocket Events
sidebar_label: Real-Time Events
last_updated: 2024-11-24
---

[Home](../index.md) › WebSocket Events

# 📡 WebSocket Events

Guriri Express uses WebSocket (Socket.IO) for real-time bidirectional communication between server and clients.

## 🔌 Connection

**URL:** `ws://localhost:5000` (or production URL)  
**Protocol:** Socket.IO v4+  
**Authentication:** Required via query parameter

### Client Connection Example

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: localStorage.getItem('authToken')
  },
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
  console.log('Socket ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('❌ Disconnected:', reason);
});
```

## 📨 Events Reference

### Server → Client Events

Events emitted by server and received by all connected clients (or specific roles).

---

#### 🆕 `new_order`

Emitted when a new delivery order is created.

**Trigger:** POST /api/v1/orders  
**Recipients:** All connected clients  
**Frequency:** On every order creation

**Payload:**

```typescript
{
  type: "new_order",
  payload: {
    id: string,              // Order UUID
    clientId: string,        // Client UUID
    clientName: string,      // Client business name
    status: "pending",       // Always pending on creation
    valor: string,           // Order value (e.g., "15.00")
    taxaMotoboy: string,     // Calculated commission
    entregaBairro: string,   // Delivery neighborhood
    entregaRua: string,      // Delivery street
    formaPagamento: string,  // Payment method
    descricao: string | null,// Order description
    createdAt: string        // ISO timestamp
  }
}
```

**Example:**

```json
{
  "type": "new_order",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "clientId": "client-uuid",
    "clientName": "Pizzaria Bella",
    "status": "pending",
    "valor": "15.00",
    "taxaMotoboy": "9.00",
    "entregaBairro": "Praia do Morro",
    "entregaRua": "Av. Atlântica",
    "formaPagamento": "pix",
    "descricao": "Pizza margherita",
    "createdAt": "2024-11-24T10:30:00.000Z"
  }
}
```

**Client Handling:**

```javascript
socket.on('new_order', (data) => {
  console.log('📦 New order available:', data.payload.id);
  
  // Update UI (React Query example)
  queryClient.invalidateQueries(['orders', 'pending']);
  
  // Show notification
  toast.info(`Novo pedido de ${data.payload.clientName}`);
  
  // Play sound for motoboys
  if (userRole === 'motoboy') {
    playNotificationSound();
  }
});
```

---

#### ✅ `order_accepted`

Emitted when a motoboy accepts a pending order.

**Trigger:** POST /api/v1/orders/:id/accept  
**Recipients:** All connected clients  
**Frequency:** On order acceptance

**Payload:**

```typescript
{
  type: "order_accepted",
  payload: {
    id: string,              // Order UUID
    status: "in_progress",   // Updated status
    motoboyId: string,       // Motoboy UUID
    motoboyName: string,     // Motoboy name
    motoboyPhone: string,    // Motoboy phone
    acceptedAt: string       // ISO timestamp
  }
}
```

**Example:**

```json
{
  "type": "order_accepted",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "in_progress",
    "motoboyId": "motoboy-uuid-123",
    "motoboyName": "João Silva",
    "motoboyPhone": "27999776655",
    "acceptedAt": "2024-11-24T10:35:00.000Z"
  }
}
```

**Client Handling:**

```javascript
socket.on('order_accepted', (data) => {
  const { id, motoboyName } = data.payload;
  
  // Update order in state
  updateOrderStatus(id, 'in_progress');
  
  // Notify client
  if (userRole === 'client' && isMyOrder(id)) {
    toast.success(`Pedido aceito por ${motoboyName}`);
  }
  
  // Remove from pending list
  queryClient.invalidateQueries(['orders', 'pending']);
});
```

---

#### 🚚 `order_delivered`

Emitted when order is marked as delivered.

**Trigger:** POST /api/v1/orders/:id/deliver  
**Recipients:** All connected clients  
**Frequency:** On order delivery

**Payload:**

```typescript
{
  type: "order_delivered",
  payload: {
    id: string,              // Order UUID
    status: "delivered",     // Final status
    deliveredAt: string      // ISO timestamp
  }
}
```

**Example:**

```json
{
  "type": "order_delivered",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "delivered",
    "deliveredAt": "2024-11-24T11:05:00.000Z"
  }
}
```

**Client Handling:**

```javascript
socket.on('order_delivered', (data) => {
  updateOrderStatus(data.payload.id, 'delivered');
  
  if (userRole === 'client' && isMyOrder(data.payload.id)) {
    toast.success('✅ Pedido entregue!');
    showRatingPrompt(data.payload.id);
  }
  
  if (userRole === 'motoboy' && isMyDelivery(data.payload.id)) {
    updateEarnings(); // Refresh earnings display
  }
});
```

---

#### ❌ `order_cancelled`

Emitted when central cancels an order.

**Trigger:** PATCH /api/v1/orders/:id/cancel  
**Recipients:** All connected clients  
**Frequency:** On order cancellation

**Payload:**

```typescript
{
  type: "order_cancelled",
  payload: {
    id: string,              // Order UUID
    status: "cancelled",     // Updated status
    cancelledAt: string,     // ISO timestamp
    reason?: string          // Cancellation reason (optional)
  }
}
```

**Example:**

```json
{
  "type": "order_cancelled",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "cancelledAt": "2024-11-24T10:40:00.000Z",
    "reason": "Cliente solicitou cancelamento"
  }
}
```

---

#### 🔄 `order_reassigned`

Emitted when central reassigns order to different motoboy.

**Trigger:** PATCH /api/v1/orders/:id/reassign  
**Recipients:** All connected clients  
**Frequency:** On order reassignment

**Payload:**

```typescript
{
  type: "order_reassigned",
  payload: {
    id: string,                  // Order UUID
    oldMotoboyId: string,        // Previous motoboy
    newMotoboyId: string,        // New motoboy
    newMotoboyName: string,      // New motoboy name
    reassignedAt: string         // ISO timestamp
  }
}
```

**Example:**

```json
{
  "type": "order_reassigned",
  "payload": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "oldMotoboyId": "motoboy-1",
    "newMotoboyId": "motoboy-2",
    "newMotoboyName": "Carlos Santos",
    "reassignedAt": "2024-11-24T10:50:00.000Z"
  }
}
```

---

#### 💬 `chat_message`

Emitted when new chat message is sent.

**Trigger:** POST /api/v1/chat  
**Recipients:** Sender and receiver only (targeted broadcast)  
**Frequency:** On every chat message

**Payload:**

```typescript
{
  type: "chat_message",
  payload: {
    id: string,              // Message UUID
    senderId: string,        // Sender user ID
    senderName: string,      // Sender name
    receiverId: string,      // Receiver user ID
    receiverName: string,    // Receiver name
    content: string,         // Message text
    orderId: string | null,  // Related order (optional)
    timestamp: string,       // ISO timestamp
    filtered: boolean,       // If AI filter modified content
    aiProcessing?: {
      spamScore: number,
      profanityDetected: boolean,
      contextRelevant: boolean
    }
  }
}
```

**Example:**

```json
{
  "type": "chat_message",
  "payload": {
    "id": "msg-uuid-123",
    "senderId": "client-uuid",
    "senderName": "Pizzaria Bella",
    "receiverId": "motoboy-uuid",
    "receiverName": "João Silva",
    "content": "Pedido já saiu?",
    "orderId": "order-uuid",
    "timestamp": "2024-11-24T10:55:00.000Z",
    "filtered": false,
    "aiProcessing": {
      "spamScore": 0.05,
      "profanityDetected": false,
      "contextRelevant": true
    }
  }
}
```

**Client Handling:**

```javascript
socket.on('chat_message', (data) => {
  const msg = data.payload;
  
  // Only show if user is sender or receiver
  if (msg.senderId === userId || msg.receiverId === userId) {
    addMessageToChat(msg);
    
    // Show notification if not currently viewing chat
    if (!isChatWindowOpen()) {
      showNotification(`Nova mensagem de ${msg.senderName}`);
      playMessageSound();
    }
  }
});
```

---

#### 🤖 `chat_ai_suggestion_available`

Emitted when AI generates response suggestion for central.

**Trigger:** POST /api/v1/chat/ai-suggest  
**Recipients:** Central users only  
**Frequency:** On AI suggestion generation

**Payload:**

```typescript
{
  type: "chat_ai_suggestion_available",
  payload: {
    threadId: string,        // Chat thread ID
    suggestion: string,      // AI-generated response
    confidence: number,      // Confidence score (0-1)
    timestamp: string        // ISO timestamp
  }
}
```

**Example:**

```json
{
  "type": "chat_ai_suggestion_available",
  "payload": {
    "threadId": "thread-uuid",
    "suggestion": "Seu pedido está a caminho! Previsão de chegada em 15 minutos.",
    "confidence": 0.92,
    "timestamp": "2024-11-24T10:58:00.000Z"
  }
}
```

---

### Client → Server Events

Events emitted by clients and handled by server.

#### 📍 `update_location` (Motoboy Only)

Motoboy sends GPS coordinates update.

**Emitter:** Motoboy clients  
**Handler:** Server saves to `motoboyLocations` table  
**Frequency:** Every 10-30 seconds when online

**Payload:**

```typescript
{
  latitude: number,    // GPS latitude
  longitude: number    // GPS longitude
}
```

**Client Code:**

```javascript
// Send location every 15 seconds
setInterval(() => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      socket.emit('update_location', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      });
    });
  }
}, 15000);
```

---

## 🔒 Security & Authentication

### JWT Verification

All WebSocket connections require valid JWT token:

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userRole = decoded.role;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});
```

### Rate Limiting

WebSocket events are NOT rate-limited (unlike HTTP endpoints), but excessive message frequency may trigger automatic disconnection.

---

## 🧪 Testing WebSocket

### Postman WebSocket

1. Create new WebSocket Request
2. URL: `ws://localhost:5000`
3. Connect
4. Send events:

```json
{
  "event": "update_location",
  "data": {
    "latitude": -20.6678,
    "longitude": -40.4986
  }
}
```

### Browser Console

```javascript
// Connect
const socket = io('http://localhost:5000', {
  auth: { token: 'YOUR_JWT_TOKEN' }
});

// Listen to all events
socket.onAny((eventName, ...args) => {
  console.log(`📨 Event: ${eventName}`, args);
});

// Test specific event
socket.on('new_order', (data) => {
  console.log('New order:', data);
});
```

### React Hook

```typescript
import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const useWebSocket = (token: string) => {
  useEffect(() => {
    const socket = io(API_URL, {
      auth: { token },
      transports: ['websocket']
    });

    socket.on('connect', () => console.log('✅ Connected'));
    socket.on('new_order', handleNewOrder);
    socket.on('order_accepted', handleOrderAccepted);
    socket.on('chat_message', handleChatMessage);

    return () => {
      socket.disconnect();
    };
  }, [token]);
};
```

---

## 📚 Related Documentation

- [Chat API Endpoints](../v1/endpoints/chat/index.md)
- [Order Lifecycle](../../guides/order-lifecycle.md)
- [Real-Time Architecture](../../architecture/websocket-architecture.md)
