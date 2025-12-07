---
title: POST /api/v1/auth/register
sidebar_label: Register Client
api_version: v1.0
last_updated: 2024-11-24
tags: [authentication, public, onboarding]
---

[Home](../../index.md) › [Authentication](./index.md) › POST /api/v1/auth/register

# 🟡 POST /api/v1/auth/register

Complete onboarding for PF (individual) or PJ (company) clients with auto-created user account and client profile.

## 📋 Description

This endpoint handles the complete registration flow for new business customers:
1. Validates client data (PF/PJ with custom rules)
2. Creates user account with hashed password (bcrypt)
3. Creates client profile with registered address
4. Returns JWT token for immediate authentication

## 🔓 Authentication

**Required:** No (public endpoint)  
**Rate Limit:** 3 requests per 15 minutes per IP

## 📥 Request

### Headers

```http
Content-Type: application/json
```

### Body Schema

```typescript
{
  documentType: "PF" | "PJ",           // Required: Business type
  cpf?: string,                         // Required for PF (11 digits, no mask)
  cnpj?: string,                        // Required for PJ (14 digits, no mask)
  ie?: string,                          // Required for PJ only
  name: string,                         // Required: Business name
  email: string,                        // Required: Valid email (unique)
  password: string,                     // Required: Min 6 characters
  phone: string,                        // Required: Phone number
  street: string,                       // Required: Pickup address street
  number: string,                       // Required: Street number
  neighborhood: string,                 // Required: Neighborhood
  city: string,                         // Required: City
  state: string,                        // Required: State code (2 letters)
  zipCode: string,                      // Required: CEP (8 digits)
  complement?: string,                  // Optional: Address complement
  subscriptionPlan: "COM_MENSALIDADE" | "SEM_MENSALIDADE"  // Required
}
```

### Validation Rules

| Field | Type | Validation |
|-------|------|------------|
| `documentType` | enum | Must be "PF" or "PJ" |
| `cpf` | string | Exactly 11 digits (required if PF) |
| `cnpj` | string | Exactly 14 digits (required if PJ) |
| `ie` | string | Required only for PJ |
| `email` | string | Valid email format, unique in database |
| `password` | string | Minimum 6 characters |
| `zipCode` | string | Exactly 8 digits |

### Example Request

```json
{
  "documentType": "PF",
  "cpf": "12345678901",
  "name": "Pizzaria Bella",
  "email": "contato@pizzariabella.com",
  "password": "senha123",
  "phone": "27999887766",
  "street": "Rua das Flores",
  "number": "500",
  "neighborhood": "Centro",
  "city": "Guarapari",
  "state": "ES",
  "zipCode": "29200000",
  "complement": "Loja 2",
  "subscriptionPlan": "COM_MENSALIDADE"
}
```

## 📤 Responses

### 201 Created

Successful registration with JWT token.

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImNvbnRhdG9AcGl6emFyaWFiZWxsYS5jb20iLCJyb2xlIjoiY2xpZW50IiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwODY0MDB9.signature",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Pizzaria Bella",
    "email": "contato@pizzariabella.com",
    "role": "client",
    "status": "active",
    "createdAt": "2024-11-24T10:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `token` | string | JWT authentication token (valid 24h) |
| `user.id` | uuid | User unique identifier |
| `user.name` | string | Business name |
| `user.email` | string | User email |
| `user.role` | string | Always "client" for this endpoint |
| `user.status` | string | Account status (always "active" on creation) |

### 400 Bad Request

Validation errors in request body.

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "cpf",
      "message": "CPF deve conter exatamente 11 dígitos"
    },
    {
      "field": "email",
      "message": "Email inválido"
    }
  ]
}
```

### 409 Conflict

Email or document already registered.

```json
{
  "error": "EMAIL_IN_USE",
  "message": "Email já cadastrado no sistema"
}
```

**Or:**

```json
{
  "error": "DOCUMENT_IN_USE",
  "message": "CPF/CNPJ já cadastrado"
}
```

### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "error": "Muitas tentativas de cadastro. Aguarde alguns minutos."
}
```

**Headers:**
```http
RateLimit-Limit: 3
RateLimit-Remaining: 0
RateLimit-Reset: 1700086400
```

### 500 Internal Server Error

Server-side error.

```json
{
  "error": "Erro ao criar conta",
  "details": "Internal server error"
}
```

## 🔒 Security

- **Password Hashing:** bcrypt with 10 salt rounds
- **JWT Secret:** Signed with `JWT_SECRET` environment variable
- **Token Expiration:** 24 hours
- **Rate Limiting:** Prevents mass account creation attacks

## 💼 Business Logic

### Auto-Created Records

1. **User Table:**
   - `role`: Set to "client"
   - `status`: Set to "active"
   - `password`: Bcrypt hash (original password never stored)

2. **Client Table:**
   - Links to created user via `userId`
   - Stores complete address (used for auto-fill in order creation)
   - `subscriptionPlan`: Determines allowed delivery values

### Subscription Plans

| Plan | Allowed Order Values | Commission Structure |
|------|---------------------|---------------------|
| COM_MENSALIDADE | R$ 15, 20, 30 | R$ 9, 12, 18 |
| SEM_MENSALIDADE | R$ 20, 25, 30, 35 | R$ 12, 14, 16, 18 |

## 🧪 Testing Examples

### cURL

```bash
curl -X POST https://api.guririexpress.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "PF",
    "cpf": "12345678901",
    "name": "Pizzaria Bella",
    "email": "contato@pizzariabella.com",
    "password": "senha123",
    "phone": "27999887766",
    "street": "Rua das Flores",
    "number": "500",
    "neighborhood": "Centro",
    "city": "Guarapari",
    "state": "ES",
    "zipCode": "29200000",
    "subscriptionPlan": "COM_MENSALIDADE"
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentType: "PF",
    cpf: "12345678901",
    name: "Pizzaria Bella",
    email: "contato@pizzariabella.com",
    password: "senha123",
    phone: "27999887766",
    street: "Rua das Flores",
    number: "500",
    neighborhood: "Centro",
    city: "Guarapari",
    state: "ES",
    zipCode: "29200000",
    subscriptionPlan: "COM_MENSALIDADE"
  })
});

const { token, user } = await response.json();
localStorage.setItem('token', token);
```

### Python (requests)

```python
import requests

payload = {
    "documentType": "PF",
    "cpf": "12345678901",
    "name": "Pizzaria Bella",
    "email": "contato@pizzariabella.com",
    "password": "senha123",
    "phone": "27999887766",
    "street": "Rua das Flores",
    "number": "500",
    "neighborhood": "Centro",
    "city": "Guarapari",
    "state": "ES",
    "zipCode": "29200000",
    "subscriptionPlan": "COM_MENSALIDADE"
}

response = requests.post(
    'https://api.guririexpress.com/api/v1/auth/register',
    json=payload
)

data = response.json()
token = data['token']
```

## 🔗 Related Endpoints

- [POST /api/v1/auth/login](./POST-login.md) - Login with created account
- [GET /api/v1/me/profile](../profile/GET-profile.md) - Get client profile
- [POST /api/v1/orders](../orders/POST-create-order.md) - Create first order

## 📚 See Also

- [Authentication Guide](../../../guides/authentication.md)
- [Client Onboarding Flow](../../../guides/client-onboarding.md)
- [Schema: clientOnboardingSchema](../models/ClientOnboarding.md)
