---
title: POST /api/v1/auth/login
sidebar_label: Login
api_version: v1.0
last_updated: 2024-11-24
tags: [authentication, public]
---

[Home](../../index.md) › [Authentication](./index.md) › POST /api/v1/auth/login

# 🟡 POST /api/v1/auth/login

Authenticate user with email and password, returning JWT token.

## 📋 Description

Standard email/password authentication for all user roles (client, motoboy, central). Password is compared against bcrypt hash stored in database.

## 🔓 Authentication

**Required:** No (public endpoint)  
**Rate Limit:** 100 requests per 15 minutes per IP

## 📥 Request

### Headers

```http
Content-Type: application/json
```

### Body Schema

```typescript
{
  email: string,      // Required: User email
  password: string    // Required: Plain text password
}
```

### Example Request

```json
{
  "email": "contato@pizzariabella.com",
  "password": "senha123"
}
```

## 📤 Responses

### 200 OK

Successful authentication.

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAiLCJlbWFpbCI6ImNvbnRhdG9AcGl6emFyaWFiZWxsYS5jb20iLCJyb2xlIjoiY2xpZW50IiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE3MDAwODY0MDB9.signature",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Pizzaria Bella",
    "email": "contato@pizzariabella.com",
    "role": "client",
    "phone": "27999887766",
    "status": "active"
  }
}
```

**JWT Payload:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "contato@pizzariabella.com",
  "role": "client",
  "iat": 1700000000,
  "exp": 1700086400
}
```

### 400 Bad Request

Missing required fields.

```json
{
  "error": "Email e senha são obrigatórios"
}
```

### 401 Unauthorized

Invalid credentials or inactive account.

```json
{
  "error": "Credenciais inválidas"
}
```

**Or:**

```json
{
  "error": "Conta inativa. Contate o suporte."
}
```

### 429 Too Many Requests

Rate limit exceeded (100 attempts in 15 min).

```json
{
  "error": "Muitas tentativas de login. Tente novamente em 15 minutos."
}
```

### 500 Internal Server Error

```json
{
  "error": "Erro ao fazer login",
  "details": "Internal server error"
}
```

## 🔒 Security

- **Bcrypt Comparison:** Password never stored/transmitted in plain text
- **JWT Signing:** Uses `JWT_SECRET` from environment
- **Token Expiration:** 24 hours (86400 seconds)
- **Brute Force Protection:** Rate limiter blocks after 100 attempts/15min

## 💡 Usage Flow

1. User submits email + password
2. Server queries `users` table by email
3. If user not found → 401 Unauthorized
4. If user status = 'inactive' → 401 Unauthorized
5. Server compares password with bcrypt.compare()
6. If password mismatch → 401 Unauthorized
7. Server generates JWT with payload: `{ userId, email, role }`
8. Returns token + user data (password excluded)

## 🧪 Testing Examples

### cURL

```bash
curl -X POST https://api.guririexpress.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"contato@pizzariabella.com","password":"senha123"}'
```

### JavaScript

```javascript
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'contato@pizzariabella.com',
    password: 'senha123'
  })
});

if (response.ok) {
  const { token, user } = await response.json();
  localStorage.setItem('authToken', token);
  console.log('Logged in as:', user.name);
}
```

### Postman Script (Auto-save token)

```javascript
// Test tab
if (pm.response.code === 200) {
  const { token, user } = pm.response.json();
  pm.environment.set('TOKEN', token);
  pm.environment.set('USER_ID', user.id);
  pm.environment.set('USER_ROLE', user.role);
  console.log(`✅ Logged in as ${user.role}: ${user.name}`);
}
```

## 🔗 Related Endpoints

- [POST /api/v1/auth/register](./POST-register.md) - Create new account
- [GET /api/v1/me/profile](../profile/GET-profile.md) - Get user profile

## 📚 See Also

- [Authentication Guide](../../../guides/authentication.md)
- [JWT Token Structure](../../../architecture/jwt-structure.md)
- [RBAC Permissions](../../../security/rbac.md)
