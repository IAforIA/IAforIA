# POST {{API_URL}}/api/v1/auth/register

Complete onboarding for PF (individual) or PJ (company) clients.

**Rate Limit:** 3 requests per 15 minutes

**Validation:**
- CPF: exactly 11 digits (no mask)
- CNPJ: exactly 14 digits
- IE: required only for `documentType=PJ`
- Password: min 6 characters

**Auto-creates:**
1. User account (role: `client`)
2. Client profile with registered address
3. JWT token for immediate login

## Request

```
POST {{API_URL}}/api/v1/auth/register
```
### Headers

| Key | Value |
|-----|-------|
| Content-Type | application/json |

### Body

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
  "subscriptionPlan": "COM_MENSALIDADE"
}
```


## Responses

### 201 Created

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Pizzaria Bella",
    "email": "contato@pizzariabella.com",
    "role": "client",
    "status": "active"
  }
}
```

### 400 Bad Request - Invalid Data

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "cpf",
      "message": "CPF deve conter exatamente 11 dígitos"
    }
  ]
}
```

### 409 Conflict - Email Already Exists

```json
{
  "error": "EMAIL_IN_USE",
  "message": "Email já cadastrado no sistema"
}
```
