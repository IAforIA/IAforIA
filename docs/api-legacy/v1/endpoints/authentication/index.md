---
title: Authentication
sidebar_label: Authentication
---

[Home](../../index.md) › [API v1](../index.md) › Authentication

# 🔓 Authentication Endpoints

Public endpoints for user registration and authentication.

---

## Endpoints

| Method | Path | Description | Rate Limit |
|--------|------|-------------|------------|
| 🟡 `POST` | [/api/v1/auth/register](./POST-register.md) | Complete PF/PJ client onboarding | 3 req/15min |
| 🟡 `POST` | [/api/v1/auth/login](./POST-login.md) | Login with email/password | 100 req/15min |

---

## Authentication Flow

### 1. Registration Flow (New Client)

```mermaid
sequenceDiagram
    Client->>+API: POST /api/v1/auth/register
    API->>API: Validate Zod schema
    API->>DB: Check email uniqueness
    API->>DB: Check CPF/CNPJ uniqueness
    API->>API: Hash password (bcrypt)
    API->>DB: Create user + client (transaction)
    API->>API: Generate JWT token
    API->>-Client: Return token + user
```

**Result:** User can immediately make authenticated requests.

### 2. Login Flow (Existing User)

```mermaid
sequenceDiagram
    Client->>+API: POST /api/v1/auth/login
    API->>DB: Query user by email
    API->>API: Compare password hash (bcrypt)
    API->>API: Check user status (active?)
    API->>API: Generate JWT token
    API->>-Client: Return token + user
```

---

## JWT Token Structure

### Payload

```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "contato@pizzariabella.com",
  "role": "client",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### Properties

| Field | Type | Description |
|-------|------|-------------|
| `userId` | uuid | User unique identifier |
| `email` | string | User email (for lookup) |
| `role` | enum | One of: client, motoboy, central |
| `iat` | timestamp | Issued at (Unix timestamp) |
| `exp` | timestamp | Expiration (iat + 24h) |

### Usage

All protected endpoints require this token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Security Features

### Password Hashing

- **Algorithm:** bcrypt
- **Salt Rounds:** 10
- **Storage:** Only hash is stored, never plain text

### Rate Limiting

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| Register | 3 requests | 15 minutes | Prevent mass account creation |
| Login | 100 requests | 15 minutes | Prevent brute force attacks |

### Token Security

- **Signing:** HMAC SHA-256 with `JWT_SECRET`
- **Expiration:** 24 hours (86400 seconds)
- **Revocation:** Change `JWT_SECRET` to invalidate all tokens
- **Refresh:** Not implemented (user must login again)

---

## Error Handling

### Common Errors

| Status | Error Code | Description | Resolution |
|--------|------------|-------------|------------|
| 400 | `Validation failed` | Invalid request body | Check Zod schema requirements |
| 401 | `Credenciais inválidas` | Wrong email/password | Verify credentials |
| 409 | `EMAIL_IN_USE` | Email already registered | Use different email or login |
| 409 | `DOCUMENT_IN_USE` | CPF/CNPJ already exists | Contact support |
| 429 | `Muitas tentativas` | Rate limit exceeded | Wait and retry |

### Error Response Format

```json
{
  "error": "EMAIL_IN_USE",
  "message": "Email já cadastrado no sistema"
}
```

**Or with validation details:**

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

---

## Testing

### Postman

Import collection and run folder: `Authentication`

### cURL

**Register:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
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

**Login:**
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contato@pizzariabella.com","password":"senha123"}'
```

---

## Related Documentation

- [User Model Schema](../models/User.md)
- [Client Onboarding Schema](../models/ClientOnboarding.md)
- [RBAC Permissions](../../../security/rbac.md)
- [Client Onboarding Guide](../../../guides/client-onboarding.md)
