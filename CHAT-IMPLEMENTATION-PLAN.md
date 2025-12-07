# 💬 Sistema de Chat - Implementação Completa

## 📋 Visão Geral

Sistema de chat em tempo real com UX diferenciada para cada tipo de usuário (Central, Cliente, Motoboy).

## 🏗️ Arquitetura

### Base de Dados
```sql
chat_messages (
  id VARCHAR PRIMARY KEY,
  sender_id VARCHAR NOT NULL,
  receiver_id VARCHAR NOT NULL,
  order_id VARCHAR NULL,          -- NULL = conversa geral
  message TEXT,
  audio_url TEXT,
  image_url TEXT,
  created_at TIMESTAMP
)
```

### Fluxo de Comunicação
- Cliente/Motoboy ↔ Central (sempre via Central)
- Mensagens podem ser sobre pedidos (orderId != null) ou gerais (orderId = null)

## 🎨 UX por Tipo de Usuário

### 1. Central Dashboard
**Componente**: `ChatConversationGrid` + `ChatPanelCentral`

**Grid (esquerda)**:
- Seção "📦 Pedidos Ativos" (cards com borda sólida)
- Seção "💬 Conversas Gerais" (cards com borda tracejada verde)
- Filtros: Todos / Pedidos / Gerais
- Busca por nome/pedido

**Painel (direita)**:
- Se pedido: Header roxo + Abas (Motoboy / Cliente)
- Se conversa geral: Header verde + SEM abas + Aviso amarelo
- Mensagens com nome do remetente
- Input com botões de anexo/áudio

### 2. Cliente Dashboard
**Componente**: `ChatWidgetSimple`

**Layout WhatsApp**:
- Header verde
- Aviso: "Mensagens com [Pedido #XXX] são sobre pedidos"
- Mensagens COM tag azul quando `orderId != null`
- Mensagens SEM tag quando `orderId = null`
- Input com anexo/áudio

### 3. Motoboy Dashboard
**Componente**: `ChatWidgetSimple`

**Layout WhatsApp**:
- Header laranja
- Aviso: "Mensagens com [Pedido #XXX] são sobre pedidos"
- Mensagens COM tag azul quando `orderId != null`
- Mensagens SEM tag quando `orderId = null`
- Input com anexo/áudio

## 🔌 Endpoints API

### POST /api/chat/send
Envia mensagem nova
```typescript
Body: {
  senderId: string,
  receiverId: string,
  orderId?: string | null,
  message?: string,
  audioUrl?: string,
  imageUrl?: string
}
Response: ChatMessage
```

### GET /api/chat/conversations
Lista conversas agrupadas (para Central)
```typescript
Response: ChatConversation[] = [{
  userId: string,
  userName: string,
  userRole: 'client' | 'motoboy',
  orderId: string | null,
  lastMessage: string,
  lastMessageAt: Date,
  unreadCount: number
}]
```

### GET /api/chat/messages?userId=X&orderId=Y
Lista mensagens de uma conversa específica
```typescript
Query: {
  userId?: string,    // Para filtrar por usuário (Central)
  orderId?: string    // Para filtrar por pedido
}
Response: ChatMessage[]
```

## 📁 Arquivos Criados

### Schema & Types
- [x] `shared/schema.ts` - Tabela chatMessages atualizada
- [x] `shared/schema.ts` - Type ChatConversation

### Components
- [x] `client/src/components/ChatConversationGrid.tsx` - Grid para Central
- [x] `client/src/components/ChatPanelCentral.tsx` - Painel para Central
- [x] `client/src/components/ChatWidgetSimple.tsx` - Chat para Cliente/Motoboy

### Backend
- [x] `server/scripts/migrate-chat-table.ts` - Migração do schema
- [ ] `server/routes.ts` - Endpoints de chat
- [ ] `server/storage.ts` - Métodos de acesso aos dados

### Integration
- [ ] `client/src/pages/central-dashboard.tsx` - Integração do grid+painel
- [ ] `client/src/pages/client-dashboard.tsx` - Substituir ChatWidget
- [ ] `client/src/pages/driver-dashboard.tsx` - Substituir ChatWidget

## ✅ Checklist de Implementação

### Backend
- [x] Atualizar schema chatMessages
- [x] Criar migration script
- [ ] Executar migração no banco
- [ ] Implementar POST /api/chat/send
- [ ] Implementar GET /api/chat/conversations
- [ ] Implementar GET /api/chat/messages
- [ ] Adicionar broadcast WebSocket

### Frontend - Central
- [x] Criar ChatConversationGrid
- [x] Criar ChatPanelCentral
- [ ] Integrar no central-dashboard
- [ ] Testar com múltiplas conversas
- [ ] Testar abas (pedido) vs direto (geral)

### Frontend - Cliente
- [x] Criar ChatWidgetSimple
- [ ] Integrar no client-dashboard
- [ ] Testar tags [Pedido #XXX]
- [ ] Testar mensagens gerais

### Frontend - Motoboy
- [ ] Integrar ChatWidgetSimple no driver-dashboard
- [ ] Testar tags [Pedido #XXX]
- [ ] Testar áudios/imagens

## 🧪 Casos de Teste

1. **Conversa Geral Cliente → Central**
   - Cliente envia: "Meu endereço mudou"
   - Central recebe: Card "💬 Cliente X" (borda verde tracejada)
   - Central responde: Sem tag de pedido
   - Cliente recebe: Mensagem SEM tag azul

2. **Conversa sobre Pedido Central → Motoboy**
   - Central envia (orderId=123): "Cadê o comprovante?"
   - Motoboy recebe: Mensagem COM tag "📦 Pedido #123"
   - Motoboy responde (orderId=123): "Mandando agora"
   - Central recebe: Na aba "Motoboy" do pedido #123

3. **Conversa Geral Motoboy → Central**
   - Motoboy envia: "Disponível amanhã?"
   - Central recebe: Card "💬 João Motoboy" (borda verde)
   - Central responde: Header verde (sem abas)
   - Motoboy recebe: Mensagem SEM tag

## 🚀 Próximos Passos

1. **AGORA**: Implementar endpoints no `routes.ts`
2. Implementar métodos no `storage.ts`
3. Executar migração do banco
4. Integrar componentes nos dashboards
5. Testar fluxo completo
6. Deploy para produção (SSH)
