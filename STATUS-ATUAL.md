# STATUS ATUAL DO PROJETO GURIRI EXPRESS

**Data:** 06 de Dezembro de 2025  
**Última atualização:** 16:20 PM

## ✅ SISTEMA FUNCIONANDO

### Servidor

- **Status:** ATIVO e RODANDO
- **URL:** <http://localhost:5000>
- **Porta:** 5000
- **Ambiente:** Development
- **Node Version:** 18.20.8
- **Vite Version:** 5.4.10 (downgrade de 7.2.2 para compatibilidade com Node 18)

### Cadastro PF/PJ Unificado

- **Endpoint:** `POST /api/auth/register` (rate limit: 3 tentativas/15 min por IP)
- **Fluxo:** recebe `name`, `email`, telefone, `documentType`, `documentNumber`, endereço fixo completo, senha e aceite explícito do uso do endereço.
- **Retorno:** `{ access_token, profile }` para autenticação imediata.
- **Frontend:** landing page com abas "Entrar" e "Cadastrar" usando o mesmo schema Zod compartilhado (`shared/contracts.ts`).

### Pedidos com Endereço Fixo (Etapa 06)

- **Endpoint:** `GET /api/me/profile` entrega o `ClientProfileDto` para o dashboard.
- **Fluxo:** clientes logados têm a coleta bloqueada por padrão; `POST /api/orders` sobrescreve rua/número/bairro/CEP com o endereço cadastrado.
- **Override:** Toggle "Emergência" libera edição manual (`coletaOverride = true`) e o backend respeita apenas nesses casos.
- **UI:** formulário exibe mensagem educativa e reidrata automaticamente os campos com o endereço fixo.

### Como Iniciar o Servidor

Use o script PowerShell criado:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\JEAN\GuririExpressReplit\GuririExpress\start-server.ps1"
```

Ou manualmente:

```powershell
cd C:\Users\JEAN\GuririExpressReplit\GuririExpress
npm run dev
```

### Parar o Servidor

```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

---

## 🔧 ÚLTIMAS MODIFICAÇÕES (06/12)

- **Escalas dos motoboys seedadas:** `npx tsx server/scripts/seed-motoboy-schedules.ts` executado; tabela `motoboySchedules` com 127 entradas para todos os motoboys cadastrados.
- **Disponibilidade mais clara na Central:** badges agora mostram "Disponível", "Próximo turno" ou "Folga hoje" conforme a escala do dia; o modal de schedule refaz o fetch ao abrir.
- **Configurações do motoboy:** bloco de documentos sempre visível e exibe links para CNH e comprovante de residência já enviados.
- **Rotas de schedules:** backend expõe `GET/POST /api/motoboys/:id/schedules` para Central e para o próprio motoboy manter sua escala.

## 🔧 ÚLTIMAS MODIFICAÇÕES (15/11)

### Configuração

- **Provider:** Neon PostgreSQL
- **Status:** CONFIGURADO e POPULADO
- **Connection String:**

```text
[REDACTED - SEE ENVIRONMENT VARIABLES]
```

- **Escalas populadas:** tabela `motoboySchedules` com 127 registros (seed executado em 06/12 via `server/scripts/seed-motoboy-schedules.ts`).

### Usuários Importados (39 total)

#### 👨‍💼 ADMIN (1)

- Email: `admin@guriri.com`
- Senha: `[REDACTED]`
- Role: `central`

#### 🏍️ MOTOBOYS (10)

Todos com senha: `[REDACTED]`

1. JOÃO - `joao@guriri.com` - (27) 99999-0001
2. YURI - `yuri@guriri.com` - (27) 99999-0002
3. DOUGLAS - `douglas@guriri.com` - (27) 99999-0003
4. RAFAEL - `rafael@guriri.com` - (27) 99999-0004
5. EDUARDO - `eduardo@guriri.com` - (27) 99999-0005
6. LUCAS - `lucas@guriri.com` - (27) 99999-0006
7. FELIPE - `felipe@guriri.com` - (27) 99999-0007
8. GABRIEL - `gabriel@guriri.com` - (27) 99999-0008
9. HENRIQUE - `henrique@guriri.com` - (27) 99999-0009
10. BRUNO - `bruno@guriri.com` - (27) 99999-0010

#### 🏪 CLIENTES (28)

Todos com senha: `[REDACTED]`

| # | Nome | Email | Telefone | Mensalidade | Horário |
|---|------|-------|----------|-------------|---------|
| 1 | SAMPAIO | `sampaio@cliente.com` | (27) 99999-1001 | R$ 240 | 07:00-18:00 |
| 2 | TAKEDA | `takeda@cliente.com` | (27) 99999-1002 | R$ 240 | 08:00-18:00 |
| 3 | IRMÃOS NUNES | `irmaos.nunes@cliente.com` | (27) 99999-1003 | R$ 240 | 07:00-19:00 |
| 4 | FARMA CONDE | `farma.conde@cliente.com` | (27) 99999-1004 | R$ 240 | 07:00-22:00 |
| 5 | MARMORARIA COLOSSO | `marmoraria.colosso@cliente.com` | (27) 99999-1005 | R$ 240 | 07:00-17:00 |
| 6 | UVA E MEL | `uva.mel@cliente.com` | (27) 99999-1006 | R$ 200 | 08:00-19:00 |
| 7 | BOUTIQUE DE CARNES | `boutique.carnes@cliente.com` | (27) 99999-1007 | R$ 150 | 07:00-19:00 |
| 8 | DROGAVET | `drogavet@cliente.com` | (27) 99999-1008 | R$ 150 | 07:30-18:00 |
| 9 | PADARIA PONTO NOBRE | `padaria.pnobre@cliente.com` | (27) 99999-1009 | R$ 140 | 05:00-20:00 |
| 10 | PIZZARIA NOBRE | `pizzaria.nobre@cliente.com` | (27) 99999-1010 | R$ 140 | 18:00-00:00 |
| 11 | MORRO MORENO | `morro.moreno@cliente.com` | (27) 99999-1011 | R$ 100 | 06:00-22:00 |
| 12 | PIZZARIA CAPRIXO | `pizzaria.caprixo@cliente.com` | (27) 99999-1012 | R$ 100 | 18:00-23:00 |
| 13 | QUITANDA JULIÃO | `quitanda.juliao@cliente.com` | (27) 99999-1013 | R$ 100 | 06:00-19:00 |
| 14 | EMPÓRIO TREM MINEIRO | `emporio.tmineiro@cliente.com` | (27) 99999-1014 | R$ 90 | 08:00-20:00 |
| 15 | PADARIA CASA NOVA | `padaria.cnova@cliente.com` | (27) 99999-1015 | R$ 60 | 05:00-20:00 |
| 16 | RESTAURANTE E PIZZARIA ATLÂNTICO | `restaurante.atlantico@cliente.com` | (27) 99999-1016 | R$ 60 | 11:00-23:00 |
| 17 | AÇAÍTERIA DA PONTE | `acaiteria.ponte@cliente.com` | (27) 99999-1017 | R$ 50 | 10:00-22:00 |
| 18 | PIZZARIA PIZZELA | `pizzaria.pizzela@cliente.com` | (27) 99999-1018 | R$ 50 | 18:00-23:00 |
| 19 | DRY WASH GURIRI | `drywash.guriri@cliente.com` | (27) 99999-1019 | R$ 30 | 08:00-18:00 |
| 20 | OFICINA DU CLÁUDIO | `oficina.claudio@cliente.com` | (27) 99999-1020 | R$ 0 | 08:00-18:00 |
| 21 | LAVA CAR NOBRE | `lavacar.nobre@cliente.com` | (27) 99999-1021 | R$ 0 | 08:00-18:00 |
| 22 | RESTAURANTE TAPIOCA DA HORA | `restaurante.tapioca@cliente.com` | (27) 99999-1022 | R$ 0 | 11:00-22:00 |
| 23 | CHURRASCARIA O REI DO ESPETO | `churrascaria.rei@cliente.com` | (27) 99999-1023 | R$ 0 | 11:00-23:00 |
| 24 | QUITANDA DO ZEZINHO | `quitanda.zezinho@cliente.com` | (27) 99999-1024 | R$ 0 | 06:00-19:00 |
| 25 | SUPERMERCADO VILA NOVA | `supermercado.vnova@cliente.com` | (27) 99999-1025 | R$ 0 | 07:00-21:00 |
| 26 | EMPÓRIO DO SABOR | `emporio.sabor@cliente.com` | (27) 99999-1026 | R$ 0 | 08:00-20:00 |
| 27 | PIZZARIA SABOR ITALIANO | `pizzaria.italiano@cliente.com` | (27) 99999-1027 | R$ 0 | 18:00-23:00 |
| 28 | LANCHONETE BOM APETITE | `lanchonete.bapetite@cliente.com` | (27) 99999-1028 | R$ 0 | 06:00-22:00 |

---

## 🔧 ÚLTIMAS MODIFICAÇÕES

### Arquivos Modificados (15/11)

1. **shared/contracts.ts** *(novo)* — Centraliza DTOs (`ClientProfileDto`, `OrderSummaryDto`, etc.) e schemas (`clientOnboardingSchema`) para frontend e backend.
2. **server/storage.ts** — Implementado `createClientWithUser` e reuso de `mapClientToProfile` para cadastro e consultas.
3. **server/routes.ts** — `POST /api/auth/register` com rate limiter + `GET /api/me/profile` e autopreenchimento obrigatório na criação de pedidos.
4. **client/src/pages/landing.tsx** — Tabs "Entrar"/"Cadastrar" com React Hook Form + Zod reutilizando os mesmos schemas compartilhados.
5. **docs/CONTRATOS-COMPARTILHADOS.md** — Documento aponta explicitamente para `shared/contracts.ts` como fonte única dos contratos.
6. **shared/schema.ts** — Adicionada coluna `coleta_override` com default `false` e schema de inserção estendido.
7. **client/src/pages/client-dashboard.tsx** — Dashboard do cliente consome `/api/me/profile`, bloqueia coleta e envia `coletaOverride` quando necessário.
8. **docs/ETAPA06-ESCOPO.md** — Novo escopo detalha objetivos, componentes impactados e critérios de aceite da etapa.
9. **docs/architecture/*.md** — Adicionados `system-overview`, `frontend-architecture` e `testing-strategy` descrevendo a nova separação em adapters → services → hooks e o plano de testes com Vitest.
10. **docs/api/** — Estrutura reconstruída com o gerador DocGoat (`npm run docs:api`) lendo `docs/postman/GuririExpress.postman_collection.json`. A versão anterior foi arquivada em `docs/api-legacy/` para referência.

---

## ⚠️ PROBLEMAS ATUAIS

1. **Tela branca no navegador**
   - `npm run build` gera o bundle normalmente, mas o Simple Browser ainda não renderiza a UI.
   - Próximos passos: conferir console do navegador, testar `curl http://localhost:5000`, abrir em Chrome/Firefox e validar se o Vite proxy está respondendo.
2. **Aviso do PostCSS**
   - Durante o build surge o warning "A PostCSS plugin did not pass the `from` option". O bundle funciona, porém precisamos identificar qual plugin (provavelmente tailwind/postcss-nesting) está omitindo `from` para evitar transformações incorretas.
3. **Drizzle CLI desatualizado**
   - `npm run db:push` e `npx drizzle-kit generate:pg` falham porque a versão 0.18.1 não oferece o comando `push` e recusa gerar migrations. Precisamos atualizar o pacote ou criar SQL manual para aplicar `orders.coleta_override`.

---

## 📁 ESTRUTURA DO PROJETO

```text
GuririExpress/
├── .env (DATABASE_URL, JWT_SECRET, SESSION_SECRET, PORT, NODE_ENV)
├── package.json (Vite 5.4.10, dependencies OK)
├── vite.config.ts (configurado, restrições removidas)
├── drizzle.config.ts (PostgreSQL dialect)
├── start-server.ps1 (script de inicialização)
├── client/
│   ├── index.html (entry point)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── components/
│       └── pages/
│           ├── landing.tsx
│           ├── central-dashboard.tsx
│           ├── client-dashboard.tsx
│           └── driver-dashboard.tsx
├── server/
│   ├── index.ts (dotenv + websockets + vite setup)
│   ├── routes.ts
│   ├── vite.ts
│   ├── db.ts
│   └── scripts/
│       └── import-empresa-completa.ts (executado ✅)
└── shared/
    └── schema.ts (tabelas: users, motoboys, clients, orders, etc.)
```

---

## 🎯 COMANDOS ÚTEIS

### Desenvolvimento

```powershell
# Iniciar servidor (recomendado)
powershell -ExecutionPolicy Bypass -File "C:\Users\JEAN\GuririExpressReplit\GuririExpress\start-server.ps1"

# Ou manualmente
cd C:\Users\JEAN\GuririExpressReplit\GuririExpress
npm run dev
```

### Database

```powershell
# Push schema
npm run db:push

# Importar usuários (já executado)
$env:DATABASE_URL="postgresql://neondb_owner:npg_37JTAgKEBSvN@ep-green-leaf-ac82i0oo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"
npx tsx server/scripts/import-empresa-completa.ts
```

### Manutenção

```powershell
# Parar todos os processos Node
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Reinstalar dependências
npm install --legacy-peer-deps

# Limpar e reinstalar
Remove-Item -Recurse -Force node_modules
npm install --legacy-peer-deps
```

---

## 🔐 SEGURANÇA

### Secrets (.env)

```env
DATABASE_URL=postgresql://neondb_owner:npg_37JTAgKEBSvN@ep-green-leaf-ac82i0oo-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=desenvolvimento-secret-key-min-32-caracteres-change-in-production
SESSION_SECRET=desenvolvimento-session-secret-min-32-caracteres-change-in-prod
PORT=5000
NODE_ENV=development
```

**⚠️ ATENÇÃO:** Alterar JWT_SECRET e SESSION_SECRET em produção!

---

## 📊 MÉTRICAS

- **Total de Usuários:** 39
  - Admin: 1
  - Motoboys: 10
  - Clientes: 28
- **Clientes com Mensalidade:** 19 (R$ 30 - R$ 240/mês)
- **Clientes sem Mensalidade:** 9 (sistema por entrega)
- **Receita Mensal Estimada:** R$ 2.520,00

---

## 🚀 DEPLOYMENT

Para deploy em produção, consultar:

- `DEPLOYMENT.md` — Guia completo de deployment
- `INICIO-RAPIDO.md` — Quick start guide
- `LANCAMENTO-INTERNO.md` — Estratégia de lançamento interno

---

**Projeto:** Guriri Express - Plataforma B2B de Entregas  
**Cliente:** JEAN  
**Localização:** `C:\Users\JEAN\GuririExpressReplit\GuririExpress`

---

## 🧪 Testes Recentes

| Data/Hora | Comando | Resultado |
|-----------|---------|-----------|
| 15/11 15:40 | `npm run build` | ✅ Sucesso (frontend + backend). Único alerta: plugin PostCSS sem `from`. |
| 15/11 16:05 | `npm run build` | ✅ Sucesso repetido. Aviso do PostCSS permanece pendente. |
| 15/11 17:05 | `npm run build` | ✅ Sucesso após Etapa 06 (novo endpoint + formulário). Aviso do PostCSS continua. |
| 15/11 17:20 | `npm run check` + `npm run build` | ✅ Type-check limpo e build final validado. Etapa 06 completa. |
