# POST {{API_URL}}/api/v1/orders/{{ORDER_ID}}/deliver

Mark order as delivered.

**Auth:** motoboy (assigned) or central
**Validation:** Order must be `in_progress`
**WebSocket:** Broadcasts `order_delivered`

## Request

```
POST {{API_URL}}/api/v1/orders/{{ORDER_ID}}/deliver
```

## Responses

### 200 OK

```json
{
  "id": "order-1",
  "status": "delivered",
  "deliveredAt": "2024-11-24T11:15:00Z"
}
```
