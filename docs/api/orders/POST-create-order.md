# POST {{API_URL}}/api/v1/orders

Create new delivery order.

**Auth Required:** Yes (client or central)
**Rate Limit:** 100 req/min

**Auto-Fill Behavior:**
- When `coletaOverride=false`: pickup address filled from client profile
- Server calculates `taxaMotoboy` based on TABELA_REPASSE

**Allowed Values (depends on subscription):**
- WITH subscription: R$ 15, 20, 30 (commission: R$ 9, 12, 18)
- WITHOUT subscription: R$ 20, 25, 30, 35 (commission: R$ 12, 14, 16, 18)

**WebSocket Event:** Broadcasts `new_order` to all connected users

## Request

```
POST {{API_URL}}/api/v1/orders
```
### Headers

| Key | Value |
|-----|-------|
| Content-Type | application/json |

### Body

```json
{
  "entregaRua": "Av. Atlântica",
  "entregaNumero": "1500",
  "entregaBairro": "Praia do Morro",
  "entregaCep": "29216000",
  "entregaComplemento": "Casa azul",
  "valor": "15.00",
  "formaPagamento": "pix",
  "descricao": "Pizza margherita + refrigerante",
  "coletaOverride": false
}
```


## Responses

### 201 Created

```json
{
  "id": "order-uuid-123",
  "clientId": "client-uuid",
  "clientName": "Pizzaria Bella",
  "status": "pending",
  "coletaRua": "Rua das Flores",
  "coletaNumero": "500",
  "coletaBairro": "Centro",
  "entregaRua": "Av. Atlântica",
  "entregaNumero": "1500",
  "entregaBairro": "Praia do Morro",
  "entregaCep": "29216000",
  "valor": "15.00",
  "taxaMotoboy": "9.00",
  "formaPagamento": "pix",
  "descricao": "Pizza margherita + refrigerante",
  "createdAt": "2024-11-24T10:30:00Z"
}
```

### 400 Invalid Value

```json
{
  "error": "Valor R$ 25.00 não permitido para cliente SEM mensalidade. Valores válidos: R$ 15, 20, 30"
}
```
