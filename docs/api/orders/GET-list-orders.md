# GET {{API_URL}}/api/v1/orders

List orders filtered by role:

**Client:** Only their own orders
**Motoboy:** Orders assigned to them or pending
**Central:** All orders

**Returns:** Array of order objects with nested client/motoboy data

## Request

```
GET {{API_URL}}/api/v1/orders
```

## Responses

### 200 OK

```json
[
  {
    "id": "order-1",
    "status": "pending",
    "valor": "15.00",
    "taxaMotoboy": "9.00",
    "client": {
      "name": "Pizzaria Bella",
      "phone": "27999887766"
    },
    "createdAt": "2024-11-24T10:30:00Z"
  }
]
```
