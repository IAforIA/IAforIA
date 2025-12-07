---
title: POST /api/v1/orders
sidebar_label: Create Order
api_version: v1.0
last_updated: 2024-11-24
tags: [orders, create, client, central]
---

[Home](../../index.md) › [Orders](./index.md) › POST /api/v1/orders

# 🟡 POST /api/v1/orders

Create new delivery order with automatic pickup address fill and commission calculation.

## 📋 Description

Creates a delivery order with intelligent auto-fill of pickup address from client profile. Server validates order value against subscription plan and calculates motoboy commission automatically.

## 🔐 Authentication

**Required:** Yes  
**Allowed Roles:** `client`, `central`  
**Header:** `Authorization: Bearer <JWT_TOKEN>`

## 📥 Request

### Headers

```http
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Body Schema

```typescript
{
  entregaRua: string,           // Required: Delivery street
  entregaNumero: string,        // Required: Delivery number
  entregaBairro: string,        // Required: Delivery neighborhood
  entregaCep: string,           // Required: Delivery ZIP (8 digits)
  entregaComplemento?: string,  // Optional: Delivery complement
  valor: string,                // Required: Order value (must match TABELA_REPASSE)
  formaPagamento: "dinheiro" | "pix" | "credito" | "debito",  // Required
  descricao?: string,           // Optional: Order description
  coletaOverride?: boolean      // Optional: Use alternate pickup (default: false)
}
```

### Validation Rules

| Field | Type | Validation |
|-------|------|------------|
| `entregaCep` | string | Exactly 8 digits |
| `valor` | string | Must exist in TABELA_REPASSE for client's subscription plan |
| `formaPagamento` | enum | One of: dinheiro, pix, credito, debito |
| `coletaOverride` | boolean | If false, pickup address auto-filled from client profile |

### Example Request

```json
{
  "entregaRua": "Av. Atlântica",
  "entregaNumero": "1500",
  "entregaBairro": "Praia do Morro",
  "entregaCep": "29216000",
  "entregaComplemento": "Casa azul, portão preto",
  "valor": "15.00",
  "formaPagamento": "pix",
  "descricao": "Pizza margherita + refrigerante 2L"
}
```

## 📤 Responses

### 201 Created

Order successfully created.

```json
{
  "id": "order-uuid-550e8400",
  "clientId": "client-uuid",
  "clientName": "Pizzaria Bella",
  "status": "pending",
  "coletaRua": "Rua das Flores",
  "coletaNumero": "500",
  "coletaBairro": "Centro",
  "coletaCep": "29200000",
  "coletaComplemento": "Loja 2",
  "entregaRua": "Av. Atlântica",
  "entregaNumero": "1500",
  "entregaBairro": "Praia do Morro",
  "entregaCep": "29216000",
  "entregaComplemento": "Casa azul, portão preto",
  "valor": "15.00",
  "taxaMotoboy": "9.00",
  "formaPagamento": "pix",
  "descricao": "Pizza margherita + refrigerante 2L",
  "createdAt": "2024-11-24T10:30:00.000Z",
  "motoboyId": null,
  "motoboyName": null
}
```

### 400 Bad Request

Invalid order value for subscription plan.

```json
{
  "error": "Valor R$ 25.00 não permitido para cliente SEM mensalidade. Valores válidos: R$ 15, 20, 30"
}
```

**Or validation error:**

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "entregaCep",
      "message": "CEP deve ter 8 dígitos"
    }
  ]
}
```

### 401 Unauthorized

Missing or invalid token.

```json
{
  "error": "Token inválido ou expirado"
}
```

### 403 Forbidden

User role not allowed.

```json
{
  "error": "Acesso negado: apenas clientes e central podem criar pedidos"
}
```

### 404 Not Found

Client profile not found (should never happen if properly authenticated).

```json
{
  "error": "CLIENT_PROFILE_NOT_FOUND",
  "message": "Perfil do cliente não encontrado"
}
```

### 500 Internal Server Error

```json
{
  "error": "Erro ao criar pedido",
  "details": "Internal server error"
}
```

## 💼 Business Logic

### Auto-Fill Behavior (`coletaOverride=false`)

1. Server queries `clients` table by authenticated user's `clientId`
2. Populates pickup address fields:
   - `coletaRua` ← client.street
   - `coletaNumero` ← client.number
   - `coletaBairro` ← client.neighborhood
   - `coletaCep` ← client.zipCode
   - `coletaComplemento` ← client.complement

### Commission Calculation (TABELA_REPASSE)

Server automatically calculates `taxaMotoboy` based on `valor` and client's `subscriptionPlan`:

#### Client WITH Subscription (COM_MENSALIDADE)

| Order Value | Motoboy Commission |
|-------------|-------------------|
| R$ 15.00 | R$ 9.00 |
| R$ 20.00 | R$ 12.00 |
| R$ 30.00 | R$ 18.00 |

#### Client WITHOUT Subscription (SEM_MENSALIDADE)

| Order Value | Motoboy Commission |
|-------------|-------------------|
| R$ 20.00 | R$ 12.00 |
| R$ 25.00 | R$ 14.00 |
| R$ 30.00 | R$ 16.00 |
| R$ 35.00 | R$ 18.00 |

**Note:** Client CANNOT override commission value. Server-side validation ensures data integrity.

### Order Status Flow

```
pending → in_progress → delivered
           ↓
        cancelled
```

## 📡 WebSocket Event

After successful creation, server broadcasts to all connected clients:

```javascript
{
  "type": "new_order",
  "payload": {
    "id": "order-uuid",
    "clientName": "Pizzaria Bella",
    "valor": "15.00",
    "entregaBairro": "Praia do Morro",
    "status": "pending",
    "createdAt": "2024-11-24T10:30:00.000Z"
  }
}
```

## 🧪 Testing Examples

### cURL

```bash
curl -X POST https://api.guririexpress.com/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "entregaRua": "Av. Atlântica",
    "entregaNumero": "1500",
    "entregaBairro": "Praia do Morro",
    "entregaCep": "29216000",
    "valor": "15.00",
    "formaPagamento": "pix",
    "descricao": "Pizza margherita"
  }'
```

### JavaScript

```javascript
const createOrder = async (orderData) => {
  const response = await fetch('/api/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(orderData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  return response.json();
};

// Usage
const newOrder = await createOrder({
  entregaRua: "Av. Atlântica",
  entregaNumero: "1500",
  entregaBairro: "Praia do Morro",
  entregaCep: "29216000",
  valor: "15.00",
  formaPagamento: "pix",
  descricao: "Pizza margherita"
});

console.log('Order created:', newOrder.id);
```

### React Hook

```typescript
import { useMutation } from '@tanstack/react-query';

const useCreateOrder = () => {
  return useMutation({
    mutationFn: async (data: CreateOrderDto) => {
      const res = await fetch('/api/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!res.ok) throw new Error('Failed to create order');
      return res.json();
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries(['orders']);
      toast.success(`Pedido #${order.id} criado!`);
    }
  });
};
```

## 🔗 Related Endpoints

- [GET /api/v1/orders](./GET-list-orders.md) - List orders
- [POST /api/v1/orders/:id/accept](./POST-accept-order.md) - Motoboy accepts order
- [POST /api/v1/orders/:id/deliver](./POST-deliver-order.md) - Mark as delivered
- [PATCH /api/v1/orders/:id/cancel](./PATCH-cancel-order.md) - Cancel order (central only)

## 📚 See Also

- [Order Lifecycle](../../../guides/order-lifecycle.md)
- [Commission Table](../../../architecture/commission-structure.md)
- [WebSocket Events](../../websocket/events.md)
- [Schema: insertOrderSchema](../models/Order.md)
