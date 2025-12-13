# Guriri Express - WebSocket Events

> **Versão:** 2.1.0 | **Endpoint:** `ws://host/ws?token=<JWT>`

---

## Conexão

```typescript
const ws = new WebSocket(`${protocol}//${host}/ws?token=${jwtToken}`);
```

O token JWT é validado na conexão. Se inválido, a conexão é recusada.

---

## Eventos Server → Client

### `new_order`
Novo pedido criado.

**Trigger:** `POST /api/orders`

```json
{
  "type": "new_order",
  "payload": {
    "id": "uuid",
    "clientId": "uuid",
    "clientName": "Empresa XYZ",
    "status": "pending",
    "valor": "15.00",
    "entregaRua": "Rua das Flores",
    "entregaBairro": "Centro",
    "createdAt": "2025-12-13T10:00:00Z"
  }
}
```

**Quem recebe:** Central, Motoboys

---

### `order_accepted`
Pedido aceito por motoboy.

**Trigger:** `POST /api/orders/:id/accept`

```json
{
  "type": "order_accepted",
  "payload": {
    "id": "uuid",
    "status": "in_progress",
    "motoboyId": "uuid",
    "motoboyName": "Carlos Silva",
    "acceptedAt": "2025-12-13T10:05:00Z"
  }
}
```

**Quem recebe:** Central, Cliente (dono do pedido)

---

### `order_declined`
Motoboy recusou pedido atribuído pela central.

**Trigger:** `POST /api/orders/:id/decline`

```json
{
  "type": "order_declined",
  "payload": {
    "id": "uuid",
    "status": "pending",
    "motoboyId": null,
    "motoboyName": null
  }
}
```

**Quem recebe:** Central (para escolher outro motoboy)

---

### `order_delivered`
Pedido entregue.

**Trigger:** `POST /api/orders/:id/deliver`

```json
{
  "type": "order_delivered",
  "payload": {
    "id": "uuid",
    "status": "delivered",
    "deliveredAt": "2025-12-13T10:30:00Z",
    "proofUrl": "/uploads/comprovante.jpg"
  }
}
```

**Quem recebe:** Central, Cliente

---

### `order_cancelled`
Pedido cancelado.

**Trigger:** `PATCH /api/orders/:id/cancel`

```json
{
  "type": "order_cancelled",
  "payload": {
    "id": "uuid",
    "status": "cancelled"
  }
}
```

**Quem recebe:** Todos os dashboards

---

### `order_reassigned`
Pedido reatribuído para outro motoboy.

**Trigger:** `PATCH /api/orders/:id/reassign`

```json
{
  "type": "order_reassigned",
  "payload": {
    "id": "uuid",
    "motoboyId": "novo-uuid",
    "motoboyName": "Novo Motoboy"
  }
}
```

**Quem recebe:** Central, Motoboys

---

### `chat_message`
Nova mensagem no chat.

**Trigger:** `POST /api/chat`

```json
{
  "type": "chat_message",
  "payload": {
    "id": "uuid",
    "senderId": "uuid",
    "senderName": "João",
    "senderRole": "client",
    "receiverId": "uuid",
    "message": "Olá, preciso de ajuda",
    "category": "suporte",
    "threadId": "uuid_suporte",
    "createdAt": "2025-12-13T10:00:00Z"
  }
}
```

**Quem recebe:** Participantes da conversa

---

### `chat_ai_suggestion_available`
Sugestão de IA disponível para central.

**Trigger:** Mensagem filtrada pelo ChatbotFilter

```json
{
  "type": "chat_ai_suggestion_available",
  "payload": {
    "messageId": "uuid",
    "userId": "uuid",
    "userName": "Cliente",
    "message": "Texto original",
    "category": "status_entrega",
    "confidence": 85,
    "requiresHuman": false,
    "reasoning": "Pergunta sobre status"
  }
}
```

**Quem recebe:** Central

---

### `driver_online`
Motoboy conectou ao WebSocket.

```json
{
  "type": "driver_online",
  "payload": { "id": "uuid" }
}
```

**Quem recebe:** Central

---

### `driver_offline`
Motoboy desconectou do WebSocket.

```json
{
  "type": "driver_offline",
  "payload": { "id": "uuid" }
}
```

**Quem recebe:** Central

---

## Padrão de Uso no Frontend

```typescript
// CRÍTICO: Usar useRef para evitar loops infinitos
const refetchRef = useRef(refetch);
refetchRef.current = refetch;

useEffect(() => {
  if (!token) return;
  
  const ws = new WebSocket(resolveWebSocketUrl(token));
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'new_order':
      case 'order_accepted':
      case 'order_delivered':
      case 'order_cancelled':
      case 'order_reassigned':
        refetchRef.current();
        break;
      case 'chat_message':
        // Atualizar chat
        break;
    }
  };
  
  return () => ws.close();
}, [token]); // NÃO incluir refetch nas dependências!
```

---

## Server Broadcast

```typescript
// server/ws/broadcast.js
import { broadcast } from '../ws/broadcast.js';

// Após salvar no DB:
broadcast({ type: 'new_order', payload: order });
```
