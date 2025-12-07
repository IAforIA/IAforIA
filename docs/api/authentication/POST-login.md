# POST {{API_URL}}/api/v1/auth/login

Authenticate user with email and password.

**Rate Limit:** 100 requests per 15 minutes

**Returns:**
- JWT token (expires in 24h)
- User profile (without password)

**Security:**
- Password compared with bcrypt hash
- Token signed with JWT_SECRET

## Request

```
POST {{API_URL}}/api/v1/auth/login
```
### Headers

| Key | Value |
|-----|-------|
| Content-Type | application/json |

### Body

```json
{
  "email": "contato@pizzariabella.com",
  "password": "senha123"
}
```


## Responses

### 200 OK

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

### 400 Bad Request

```json
{
  "error": "Email e senha são obrigatórios"
}
```

### 401 Unauthorized

```json
{
  "error": "Credenciais inválidas"
}
```
