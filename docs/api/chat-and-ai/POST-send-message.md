# POST {{API_URL}}/api/v1/chat

Send chat message with 3-layer intelligent filtering.

**AI Filters Applied:**
1. **Spam Detection:** Blocks repetitive/malicious content
2. **Profanity Filter:** Censors offensive language
3. **Context Validation:** Ensures message relevance to order

**Rate Limits (by role):**
- Client: 30 msg/hour
- Motoboy: 50 msg/hour
- Central: Unlimited

**WebSocket:** Broadcasts `chat_message` to receiver

## Request

```
POST {{API_URL}}/api/v1/chat
```
### Headers

| Key | Value |
|-----|-------|
| Content-Type | application/json |

### Body

```json
{
  "receiverId": "motoboy-uuid-123",
  "content": "Pedido chegou. Obrigado!",
  "orderId": "order-uuid-456"
}
```


## Responses

### 201 Created

```json
{
  "id": "msg-new",
  "senderId": "client-1",
  "receiverId": "motoboy-1",
  "content": "Pedido chegou. Obrigado!",
  "orderId": "order-456",
  "timestamp": "2024-11-24T11:00:00Z",
  "filtered": false,
  "aiProcessing": {
    "spamScore": 0.05,
    "profanityDetected": false,
    "contextRelevant": true
  }
}
```

### 429 Rate Limit

```json
{
  "error": "Limite de mensagens excedido. Tente novamente em 15 minutos."
}
```
