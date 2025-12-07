# GET {{API_URL}}/api/v1/chat

Retrieve chat messages filtered by RBAC.

**Filters:**
- Client: Only messages where they are sender/receiver
- Motoboy: Messages involving them + general broadcasts
- Central: All messages (full visibility)

**Returns:** Ordered by timestamp DESC (newest first)

## Request

```
GET {{API_URL}}/api/v1/chat
```

## Responses

### 200 OK

```json
[
  {
    "id": "msg-1",
    "senderId": "user-1",
    "senderName": "Pizzaria Bella",
    "receiverId": "motoboy-1",
    "receiverName": "João Silva",
    "content": "Pedido saiu para entrega?",
    "timestamp": "2024-11-24T10:50:00Z",
    "read": false
  }
]
```
