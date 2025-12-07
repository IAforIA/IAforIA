# POST {{API_URL}}/api/v1/orders/{{ORDER_ID}}/accept

Motoboy accepts pending order.

**Auth:** motoboy or central
**Validations:**
- Order must be `pending` status
- If called by motoboy: auto-assigns to them
- If called by central: requires `motoboyId` in body

**WebSocket:** Broadcasts `order_accepted` event

## Request

```
POST {{API_URL}}/api/v1/orders/{{ORDER_ID}}/accept
```

## Responses

### 200 OK

```json
{
  "id": "order-1",
  "status": "in_progress",
  "motoboyId": "motoboy-uuid",
  "motoboyName": "João Silva",
  "acceptedAt": "2024-11-24T10:45:00Z"
}
```

### 400 Already Accepted

```json
{
  "error": "Pedido já foi aceito por outro motoboy"
}
```
