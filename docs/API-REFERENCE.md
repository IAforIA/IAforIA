# Guriri Express - API Reference

> **Versão:** 2.1.0 | **Base URL:** `/api`

---

## Autenticação

Todas as rotas (exceto login/register) requerem header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Auth (`/api/auth/*`)

### POST `/api/auth/login`
Login de usuário.

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| email | string | ✅ |
| password | string | ✅ |

**Response 200:**
```json
{
  "access_token": "eyJ...",
  "id": "uuid",
  "name": "João Silva",
  "role": "client|motoboy|central",
  "phone": "11999999999",
  "email": "joao@email.com"
}
```

**Erros:** 401 (credenciais inválidas), 429 (rate limit)

---

### POST `/api/auth/register`
Registro de novo cliente (empresa).

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| name | string | ✅ |
| email | string | ✅ |
| password | string | ✅ (min 8) |
| phone | string | ✅ |
| document | string | ✅ (CNPJ/CPF) |
| address.rua | string | ✅ |
| address.numero | string | ✅ |
| address.bairro | string | ✅ |
| address.cep | string | ✅ |
| address.complemento | string | ❌ |

**Response 201:**
```json
{
  "access_token": "eyJ...",
  "profile": { "id": "uuid", "name": "...", ... }
}
```

**Erros:** 400 (validação), 409 (email/documento duplicado), 429 (rate limit)

---

### POST `/api/auth/register/motoboy`
Registro de novo motoboy (entregador).

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| name | string | ✅ |
| email | string | ✅ |
| password | string | ✅ (min 8) |
| phone | string | ✅ |
| cpf | string | ✅ |
| acceptTerms | boolean | ✅ (deve ser true) |

**Response 201:**
```json
{
  "access_token": "eyJ...",
  "id": "uuid",
  "name": "...",
  "role": "motoboy",
  "phone": "...",
  "email": "..."
}
```

**Erros:** 400 (validação), 409 (email/CPF duplicado), 429 (rate limit)

---

### GET `/api/me/profile`
Perfil do cliente logado.

**Auth:** `client` only

**Response 200:**
```json
{
  "id": "uuid",
  "name": "Empresa XYZ",
  "email": "...",
  "phone": "...",
  "document": "...",
  "address": { "rua": "...", ... },
  "mensalidade": "0.00"
}
```

---

## 2. Orders (`/api/orders/*`)

### GET `/api/orders`
Lista pedidos (filtrado por role).

**Auth:** Qualquer role autenticado

**Comportamento por role:**
- `central`: Todos os pedidos
- `client`: Apenas pedidos do cliente
- `motoboy`: Pedidos pendentes + pedidos atribuídos ao motoboy

**Response 200:** `Order[]`

---

### GET `/api/orders/pending`
Lista pedidos pendentes (status = pending).

**Auth:** Qualquer role

**Response 200:** `Order[]`

---

### POST `/api/orders`
Cria novo pedido.

**Auth:** `client`, `central`

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| destinatarioNome | string | ✅ | Nome do destinatário |
| destinatarioTelefone | string | ✅ | Telefone do destinatário |
| entregaRua | string | ✅ | Endereço de entrega |
| entregaNumero | string | ✅ | |
| entregaBairro | string | ✅ | |
| entregaCep | string | ❌ | |
| valor | string | ✅ | Valor da entrega (R$) |
| coletaOverride | boolean | ❌ | Se true, usa endereço de coleta customizado |
| coletaRua | string | ❌* | *Obrigatório se coletaOverride=true |
| coletaNumero | string | ❌* | |
| coletaBairro | string | ❌* | |

**Response 201:** `Order`

**WebSocket:** Broadcast `{ type: "new_order", payload: Order }`

---

### POST `/api/orders/:id/accept`
Motoboy aceita pedido.

**Auth:** `motoboy`, `central`

| Campo | Tipo | Obrigatório | Notas |
|-------|------|-------------|-------|
| motoboyId | string | ❌* | *Obrigatório para central |
| motoboyName | string | ❌* | *Obrigatório para central |

**Response 200:** `Order` (status: accepted)

**WebSocket:** Broadcast `{ type: "order_accepted", payload: Order }`

---

### POST `/api/orders/:id/deliver`
Motoboy confirma entrega.

**Auth:** `motoboy`, `central`

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| proofUrl | string | ❌ (recomendado) |

> ⚠️ **IMPORTANTE:** O motoboy deve enviar LiveDoc (comprovante) via `/api/upload/live-doc` ANTES de chamar esta rota.

**Response 200:** `Order` (status: delivered)

**WebSocket:** Broadcast `{ type: "order_delivered", payload: Order }`

---

### PATCH `/api/orders/:id/cancel`
Central cancela pedido.

**Auth:** `central` only

**Response 200:** `Order` (status: cancelled)

**WebSocket:** Broadcast `{ type: "order_cancelled", payload: Order }`

---

### PATCH `/api/orders/:id/reassign`
Central reatribui pedido para outro motoboy.

**Auth:** `central` only

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| motoboyId | string | ✅ |

**Response 200:** `Order` (com novo motoboyId/motoboyName)

**WebSocket:** Broadcast `{ type: "order_reassigned", payload: Order }`

---

## 3. Motoboys (`/api/motoboys/*`)

### GET `/api/motoboys`
Lista todos os motoboys.

**Auth:** `central` only

**Response 200:** `Motoboy[]`

---

### GET `/api/motoboys/me`
Perfil do motoboy logado.

**Auth:** `motoboy` only

**Response 200:** `Motoboy`

---

### PATCH `/api/motoboys/me`
Motoboy atualiza seu cadastro (endereço, banco, documentos).

**Auth:** `motoboy` only

| Campo | Tipo | Notas |
|-------|------|-------|
| pixKey | string | Chave PIX |
| pixKeyType | string | cpf, phone, email, random |
| bankName | string | Nome do banco |
| bankCode | string | Código do banco |
| bankAgency | string | Agência |
| bankAccount | string | Conta |
| bankAccountDigit | string | Dígito |
| bankAccountType | string | corrente, poupanca |
| bankHolderName | string | Titular |

**Response 200:** `Motoboy` atualizado

---

### GET `/api/motoboys/locations/latest`
Últimas localizações GPS de todos os motoboys.

**Auth:** `central` only

**Response 200:**
```json
{ "locations": [{ "motoboyId": "...", "lat": -23.5, "lng": -46.6, "timestamp": "..." }] }
```

---

### PATCH `/api/motoboys/:id`
Central atualiza motoboy.

**Auth:** `central` only

**Response 200:** `Motoboy` atualizado

---

### GET `/api/motoboys/:id/schedules`
Lista disponibilidade do motoboy por dia/turno.

**Auth:** `central` ou próprio `motoboy`

**Response 200:** `MotoboySchedule[]`

---

### POST `/api/motoboys/:id/schedules`
Atualiza disponibilidade do motoboy.

**Auth:** `central` ou próprio `motoboy`

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| diaSemana | number | ✅ (0-6, domingo=0) |
| turnoManha | boolean | ❌ |
| turnoTarde | boolean | ❌ |
| turnoNoite | boolean | ❌ |

**Response 200:** `{ success: true, schedule: MotoboySchedule }`

---

## 4. Clients (`/api/clients/*`)

### GET `/api/clients`
Lista todos os clientes.

**Auth:** `central` only

**Response 200:** `Client[]`

---

### POST `/api/clients`
Central cria novo cliente.

**Auth:** `central` only

**Response 201:** `Client`

---

### PATCH `/api/clients/:id`
Central atualiza cliente.

**Auth:** `central` only

**Response 200:** `Client` atualizado

---

### PATCH `/api/clients/me`
Cliente atualiza próprio cadastro.

**Auth:** `client` only

**Response 200:** `Client` atualizado

---

### GET `/api/clients/:id/schedules`
Horários de funcionamento do cliente.

**Auth:** `central` ou próprio `client`

**Response 200:** `ClientSchedule[]`

---

## 5. Users (`/api/users/*`)

### GET `/api/users`
Lista todos os usuários (sem passwords).

**Auth:** `central` only

**Response 200:** `User[]` (sem campo password)

---

### PATCH `/api/users/:id`
Atualiza perfil (nome, telefone, senha).

**Auth:** Próprio usuário ou `central`

| Campo | Tipo | Notas |
|-------|------|-------|
| name | string | Min 3 chars |
| phone | string | |
| password | string | Min 8 chars (será hasheado) |

**Response 200:** `User` (sem password)

---

### PATCH `/api/users/:id/status`
Ativa/desativa usuário.

**Auth:** `central` only

| Campo | Tipo | Valores |
|-------|------|---------|
| status | string | active, inactive |

**Response 200:** `User`

---

### PATCH `/api/users/:id/role`
Altera role do usuário.

**Auth:** `central` only

| Campo | Tipo | Valores |
|-------|------|---------|
| role | string | client, motoboy, central |

**Response 200:** `User`

---

## 6. Reports (`/api/reports/*`)

> ⚠️ **FORMATO DE RESPOSTA:** Rotas de reports usam wrapper `{ success: true, data: T }`

### GET `/api/reports/company`
Relatório geral da empresa.

**Auth:** `central` only

**Query params:** `startDate`, `endDate`, `period` (today, week, month, custom)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "summary": { "totalOrders": 100, "totalRevenue": "5000.00", ... },
    "breakdown": { ... }
  }
}
```

---

### GET `/api/reports/clients/:clientId`
Relatório de um cliente.

**Auth:** `central` ou próprio `client`

**Response 200:** `{ success: true, data: ClientReport }`

---

### GET `/api/reports/motoboys/:motoboyId`
Relatório de um motoboy.

**Auth:** `central` ou próprio `motoboy`

**Response 200:** `{ success: true, data: MotoboyReport }`

---

### GET `/api/reports/orders`
Relatório de pedidos com filtros.

**Auth:** Qualquer role (filtrado por permissão)

**Response 200:** `{ success: true, data: OrdersReport }`

---

## 7. Chat (`/api/chat/*`)

### GET `/api/chat`
Lista mensagens do chat.

**Auth:** Qualquer role (filtrado por permissão)

**Query params:** `threadId` (opcional)

**Response 200:** `ChatMessage[]`

---

### POST `/api/chat`
Envia mensagem.

**Auth:** Qualquer role

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| message | string | ✅ |
| category | string | ✅ (status_entrega, suporte, problema) |
| orderId | string | ❌ |
| threadId | string | ❌ |
| toId | string | ❌ (obrigatório para central) |

**Response 200:** `ChatMessage`

**WebSocket:** Broadcast `{ type: "chat_message", payload: ChatMessage }`

---

### GET `/api/chat/threads`
Lista threads de conversa.

**Auth:** Qualquer role

**Response 200:** `ChatThread[]`

---

### POST `/api/chat/ai-suggest`
Gera sugestão de resposta via IA.

**Auth:** `central` only

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| message | string | ✅ |
| category | string | ✅ |
| userId | string | ❌ |

**Response 200:** `{ suggestion: string }`

---

## 8. Upload (`/api/upload/*`)

### POST `/api/upload/live-doc`
Upload de comprovante de entrega (LiveDoc).

**Auth:** `motoboy`

**Form-data:**
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| file | File | ✅ |
| orderId | string | ✅ |
| tipo | string | ✅ |
| gpsLat | string | ❌ |
| gpsLng | string | ❌ |

**Response 200:**
```json
{
  "message": "Upload realizado com sucesso",
  "liveDoc": { ... },
  "fileUrl": "/uploads/filename.jpg"
}
```

---

### POST `/api/upload/client-doc`
Upload de documento do cliente (CNPJ/licença).

**Auth:** `client` only

**Form-data:** `file` (obrigatório)

**Response 200:** `{ message, fileUrl, client }`

---

### POST `/api/upload/motoboy-doc`
Upload de documento do motoboy (CNH/comprovante).

**Auth:** `motoboy` only

**Form-data:**
| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| file | File | ✅ |
| tipo | string | ✅ (license, residence) |

**Response 200:** `{ message, fileUrl, motoboy }`

---

## Códigos de Erro Padrão

| Código | Significado |
|--------|-------------|
| 400 | Bad Request - Validação falhou |
| 401 | Unauthorized - Token ausente/inválido |
| 403 | Forbidden - Role sem permissão |
| 404 | Not Found - Recurso não existe |
| 409 | Conflict - Duplicado (email/documento) |
| 429 | Too Many Requests - Rate limit |
| 500 | Internal Error - Erro no servidor |
