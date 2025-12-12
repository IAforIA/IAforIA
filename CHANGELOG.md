# Changelog - Guriri Express

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Unreleased]

## [2.1.0] - 2025-12-12

### ✨ Novos Recursos

#### Cadastro de Motoboys na Landing Page
- **Nova rota:** `POST /api/auth/register/motoboy` para auto-cadastro de entregadores
- **Schema de validação:** `motoboyOnboardingSchema` em `shared/contracts.ts`
- **Interface:** Modal dedicado na landing page com campos nome, email, telefone, CPF, placa (opcional)
- **Segurança:** Rate limit de 3 tentativas/15min, aceite de termos obrigatório
- **Inicialização:** Cria automaticamente escalas padrão (todos os turnos habilitados)

#### Dados Bancários do Motoboy
- **Novos campos no banco:** `pixKey`, `pixKeyType`, `bankName`, `bankCode`, `bankAgency`, `bankAccount`, `bankAccountDigit`, `bankAccountType`, `bankHolderName`
- **Seção de configurações:** Motoboy pode gerenciar PIX e dados bancários em Configurações
- **Auto-save:** Campos salvam automaticamente ao perder foco (onBlur)
- **Segurança:** PIX removido do cadastro inicial - coletado apenas após aprovação

#### Filtro de Período em Pedidos
- **Filtro por intervalo:** Substituído filtro de data única por Data Inicial e Data Final
- **Visualização:** Grid de 6 colunas nos filtros de pedidos
- **Compatibilidade:** Mantido fallback para data única se período não definido

### 🔧 Correções

#### WebSocket
- **ChatWidget:** Aplicado padrão `useRef` para `refetch`, evitando reconexões desnecessárias
- **Dependências:** Corrigidas de `[shouldFetchMessages, refetch]` para `[shouldFetchMessages, token]`
- **Consistência:** Mesmo padrão dos dashboards (driver, client, central)

#### Rotas e Imports
- **Rota `/health` duplicada:** Removida duplicação em `server/routes/index.ts`
- **Imports ES Modules:** Adicionada extensão `.js` em:
  - `server/chatbot-filter.ts` → `./storage.js`
  - `server/analytics.ts` → `./db.js`, `./financial-engine.js`

#### Interface
- **Landing page dark mode:** Adicionado `bg-background` ao container principal
- **FinancialRoute props:** Corrigidos nomes de props (`handleFinMotoboyFilterChange`, `handleFinClientFilterChange`)
- **Acessibilidade:** Adicionados atributos `title` aos selects de dados bancários

#### Código de Exemplo
- **security-integration-example.ts:** Comentado código com sintaxe inválida (`[...]`)

### 📦 Arquivos Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `shared/schema.ts` | Schema | 9 novos campos bancários em `motoboys` |
| `shared/contracts.ts` | Tipos | Novo `motoboyOnboardingSchema` |
| `server/routes/auth.ts` | API | Rota `/auth/register/motoboy` |
| `server/storage/users.ts` | Storage | Função `createMotoboyWithUser` |
| `server/storage.ts` | Storage | Método wrapper `createMotoboyWithUser` |
| `server/routes/index.ts` | API | Removida `/health` duplicada |
| `server/chatbot-filter.ts` | Import | Extensão `.js` |
| `server/analytics.ts` | Import | Extensões `.js` |
| `client/src/pages/landing.tsx` | UI | Modal motoboy + dark mode fix |
| `client/src/components/SettingsPage.tsx` | UI | Seção dados bancários |
| `client/src/components/ChatWidget.tsx` | WebSocket | Padrão useRef |
| `client/src/hooks/use-order-filters.ts` | Hook | Filtro período |
| `client/src/pages/central-dashboard.tsx` | UI | Props + filtros período |
| `client/src/pages/central/orders.tsx` | UI | Data Inicial/Final |
| `client/src/services/orders.ts` | Service | Filtro período |
| `client/src/types/orders.ts` | Tipos | `startDate`, `endDate` |

### 🗄️ Migração de Banco

Execute para adicionar os novos campos:

```bash
npm run db:push
```

Novos campos adicionados à tabela `motoboys`:
- `pix_key` (text, nullable)
- `pix_key_type` (text, nullable)
- `bank_name` (text, nullable)
- `bank_code` (text, nullable)
- `bank_agency` (text, nullable)
- `bank_account` (text, nullable)
- `bank_account_digit` (text, nullable)
- `bank_account_type` (text, nullable)
- `bank_holder_name` (text, nullable)

---

## [2.0.0] - 2025-12-10

### ✨ Novos Recursos

- Deploy VPS com trust proxy configurado
- Correção de rota PATCH para motoboys
- Migração de bcrypt para bcryptjs (compatibilidade VPS)
- WebSocket loop fix (useRef para evitar re-renders no iPhone)
- Escalas de motoboys com seed script

### 🔧 Correções

- Fix iPhone flashing issue no driver dashboard
- Schedules dos motoboys funcionando corretamente

---

## [1.0.0] - 2025-11-15

### ✨ Lançamento Inicial

- Sistema de entregas B2B completo
- 3 dashboards: Central, Cliente, Motoboy
- WebSocket para atualizações em tempo real
- Autenticação JWT
- Cadastro PF/PJ unificado
- Pedidos com endereço fixo
- Chat entre participantes

---

_Este changelog é mantido manualmente. Para contribuir, adicione suas mudanças na seção [Unreleased] seguindo o formato existente._
