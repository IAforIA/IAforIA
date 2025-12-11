# PROJECT_MANUAL.md

> Manual detalhado por usuário: consulte também `PROJECT_MANUAL_DETAILED_USERS.md` para fluxos específicos de Motoboy, Cliente e Central.
> Manual completo e autossuficiente para entender, operar e publicar o projeto Guriri Express. Escrito para pessoa leiga, sem exigir conhecimento prévio de programação.

## 1. Visão geral do sistema

- **O que é:** Plataforma B2B de logística que conecta empresas (Clientes) a motoboys, com um painel central (Central), painel do cliente e painel do motoboy.
- **O que faz:** Cadastro de usuários, criação e gerenciamento de pedidos de entrega, rastreamento em tempo real via WebSocket, relatórios e chat.
- **Tecnologias principais:**
  - Backend: Node.js + Express (API REST) com WebSocket.
  - Frontend: React 18 + TypeScript (Vite) com TanStack Query, Wouter e shadcn/ui.
  - Storage/DB: PostgreSQL via Drizzle ORM (schemas em `shared/`).
  - Tempo real: WebSocket (`ws`).

## 2. Arquitetura (alto nível)

- **Frontend (cliente/driver/central):** SPA React que chama a API (`/api/...`) e mantém conexão WebSocket para eventos (pedidos, chat, status online).
- **Backend (Express):** Rotas REST com middlewares de autenticação/controle de acesso; WebSocket anexo ao mesmo servidor HTTP.
- **Storage:** Drizzle ORM fala com PostgreSQL (Neon ou outro). Esquemas em `shared/schema.ts`.
- **Tempo real:** WebSocket aceita conexões em `/ws?token=<JWT>` e envia eventos (`new_order`, `order_*`, `chat_message`, `driver_online/offline`, etc.).

## 3. Estrutura de pastas (explicação amigável)

- `client/`: código do frontend React.
  - `src/pages/`: páginas principais (painéis central, cliente, motoboy, testes).
  - `src/components/`: componentes reutilizáveis (badges, insights, formulários).
  - `public/`: arquivos estáticos.
- `server/`: backend Express.
  - `routes/`: rotas agrupadas (auth, orders, chat, reports, motoboys, clients, users, analytics, uploads, schedules, health).
  - `middleware/`: autenticação, contexto de requisição, etc.
  - `storage.ts` + `storage/`: camada de acesso ao DB (Drizzle) organizada por domínio (users, clients, motoboys, orders, chat, uploads).
  - `ai-engine/`, `services/`, `scripts/`: serviços auxiliares, AI, ferramentas de manutenção.
  - `ws/`: broadcast e helpers de WebSocket.
  - `index.ts`: ponto de entrada do servidor (carrega .env, aplica middlewares, inicia HTTP + WebSocket).
- `shared/`: tipos e schemas Drizzle compartilhados (tabelas, tipos TypeScript).
- `tests/`: testes (vitest), incluindo smoke de relatórios.
- `local_fixes/`: artefatos locais (relatórios e stubs) gerados sem tocar no git.
-- Raiz: `package.json`, `tsconfig.json`, `vite.config.ts`, `Dockerfile`, `docker-compose.yml`, scripts de deploy e documentação variada.

## 4. Rotas e endpoints (resumo didático)

- **Auth** (`/api/auth/login`, `/api/auth/register`, `/api/me/profile`): login por email/senha; perfil do cliente.
- **Orders** (`/api/orders`, `/api/orders/pending`, `/api/orders/:id/accept`, `/deliver`, `/cancel`, `/reassign`): criar, listar, aceitar, entregar, cancelar e reatribuir pedidos.
- **Chat** (`/api/chat`, `/threads`, `/ai-suggest`, `/ai-feedback`, `/usage-stats`, `/budget-history`): mensagens e sugestões de IA.
- **Reports** (`/api/reports/company`, `/clients/:id`, `/motoboys/:id`, alias `/reports/motoboys/:id`, `/orders`): relatórios por papel.
- **Motoboys** (`/api/motoboys`, `/motoboys/locations/latest`, `/motoboys/me`, `/motoboys/:id/schedules`, `/motoboys/:id/online`): gestão e localização.
- **Clients** (`/api/clients`, `/clients/:id/schedules`, `/clients/me`): gestão de clientes e horários.
- **Users** (`/api/users`, `/users/:id/status`, `/users/:id/role`): administração de usuários (central).
- **Analytics** (`/api/analytics/dashboard`, `/revenue`, `/mrr`, `/motoboy/:id`, `/client/:id`): métricas.
- **Uploads** (`/api/upload/live-doc`, `/client-doc`, `/motoboy-doc`): upload de arquivos.
- **Schedules** (`/api/schedules/all-clients`, `/all-motoboys`): agregados de horários.
- **Health** (`/health`): verificação simples.

## 5. Controllers (como pensar neles)

- Cada arquivo em `server/routes/` atua como "controller": recebe a requisição, valida, chama storage/serviço e responde.
- Ex.: `orders.ts` valida o papel do usuário, chama `storage.createOrder` ou atualiza status e envia eventos via `broadcast`.

## 6. Serviços (helpers/lógicas)

- `storage.ts` e submódulos em `server/storage/` encapsulam queries Drizzle para cada domínio (users, clients, motoboys, orders, chat, uploads).
- `ai-engine/` e `services/` contêm lógica complementar (IA, webhooks, chat server, etc.).

## 7. Middlewares

- `middleware/auth.ts`: autentica JWT, aplica `requireRole` (central, client, motoboy).
- `middleware/request-context.ts`: anexa `requestId` para logs.
- Outros: helmet (segurança de headers), cors (origens permitidas), JSON body parser com limite.

## 8. WebSocket (funcionamento)

- Endpoint: `/ws?token=<JWT>`; token validado.
- Eventos emitidos: `new_order`, `order_accepted`, `order_delivered`, `order_cancelled`, `order_reassigned`, `chat_message`, `chat_ai_suggestion_available`, `driver_online`, `driver_offline`.
- `ws/broadcast.ts` mantém mapa de conexões e envia mensagens em JSON para todos (ou todos menos o originador).

## 9. Storage / banco

- PostgreSQL via Drizzle. Esquemas em `shared/schema.ts` (tabelas: users, motoboys, motoboyLocations, clients, orders, liveDocs, chatMessages, etc.).
- Campos decimais são strings; usar `parseFloat` para cálculos.
- Operações de leitura/escrita ficam em `server/storage/*.ts` e são reexportadas por `server/storage.ts`.

## 10. Variáveis de ambiente (.env)

- Principais: `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `PORT` (5000), `WS_PORT` (5001 ou compartilhado), `NODE_ENV`, `FRONTEND_URL`, `BACKEND_URL`, `ALLOWED_ORIGINS`, `OPENAI_API_KEY`, `OPENAI_FINETUNED_MODEL_CEO`, `OPENAI_FINETUNED_MODEL_COMUNICACAO`, `OPENAI_BASE_MODEL`, `OPENAI_MODE`, `SLACK_WEBHOOK_URL`, `AI_CHAT_PORT`, `CENTRAL_USER_ID`.
- Por que importam: definem conexões, segurança de tokens e origens permitidas, chaves de IA e notificações.
- Nunca commitar `.env`; use `.env.example` como modelo.

## 11. Fluxo de uma requisição (resumo)

1) Frontend chama `/api/...` com token JWT no header `Authorization: Bearer <token>`.
2) Express recebe, `authenticateToken` valida e anexa `req.user`.
3) `requireRole` (quando presente) restringe o papel.
4) Controller chama storage/serviço → Drizzle → PostgreSQL.
5) Resposta JSON volta ao frontend; caches TanStack Query invalidam/atualizam.

## 12. Fluxo completo por papel

- **Central:** Faz login → vê dashboards (pedidos, motoboys, clientes, relatórios) → ações disparam rotas protegidas (central) → eventos WS atualizam telas.
- **Cliente:** Login → cria pedidos → acompanha status → acessa relatórios próprios → recebe updates via WS.
- **Motoboy:** Login → recebe pedidos (`new_order`), aceita/entrega via API → localização atualizada → status online/offline via WS.

## 13. Build, testes e scripts npm

- Scripts chave (`package.json`):
  - `npm run dev`: inicia backend em tsx (dev, porta 5000) + Vite dev server interno.
  - `npm run build`: build do frontend (Vite) + bundle do backend com esbuild em `dist/`.
  - `npm start`: roda backend bundlado (`dist/index.js`).
  - `npm test`: vitest.
  - Outras tarefas: `db:push` (drizzle-kit), `docs:api`, scripts de importação/seed.
- Observação: `npm ci` requer Node ≥20 e lockfile em sincronia.

## 14. Como rodar localmente (resumo prático)

1) Pré-requisitos: Node 20+, npm 10+, PostgreSQL (ou URL Neon) e `.env` preenchido.
2) `npm install` (ou `npm ci` se lock em dia e Node compatível).
3) `npm run dev` (porta 5000; WS compartilhado) — acessa o frontend em `http://localhost:5173` se Vite estiver ativo.
4) Testes: `npm test`.
5) Build: `npm run build`; produção: `npm start` após build.

## 15. VPS (Ubuntu) — preparação

- Atualizar pacotes: `sudo apt update && sudo apt upgrade -y`.
- Instalar Node 20 (nvm ou NodeSource):
  - `curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -`
  - `sudo apt install -y nodejs build-essential`
- Instalar git: `sudo apt install -y git`.
- Instalar nginx: `sudo apt install -y nginx`.
- Instalar certbot: `sudo apt install -y certbot python3-certbot-nginx`.
- Instalar pm2: `sudo npm install -g pm2`.
- Firewall (ufw):
  - `sudo ufw allow OpenSSH`
  - `sudo ufw allow 'Nginx Full'`
  - `sudo ufw enable`

## 16. Guia de deploy (paso a passo)

1) Clonar projeto: `git clone <repo> && cd <repo>`.
2) Configurar `.env` (copiar `.env.example` e preencher).
3) Instalar deps: `npm install` (ou `npm ci` se lock e Node ok).
4) Build frontend+backend: `npm run build` (gera `dist/`).
5) Servir backend com pm2:
   - `pm2 start dist/index.js --name guriri-backend`
   - `pm2 save && pm2 startup` (gera comando; execute-o para boot persistente).
6) Nginx como reverse proxy (exemplo `/etc/nginx/sites-available/guriri`):

   ```nginx
   server {
     listen 80;
     server_name exemplo.com;

     location / {
       proxy_pass http://127.0.0.1:5000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
     }
   }
   ```

   - `sudo ln -s /etc/nginx/sites-available/guriri /etc/nginx/sites-enabled/`
   - `sudo nginx -t && sudo systemctl reload nginx`
7) SSL com Certbot: `sudo certbot --nginx -d exemplo.com -d www.exemplo.com` (renovações automáticas).
8) Frontend em produção:

   - O build Vite já está em `dist/public` e é servido pelo backend/express estático configurado em `server/vite.ts` (modo prod). O proxy nginx aponta para o backend, que serve estáticos e API.

## 17. Configurações de segurança

- Mantenha `JWT_SECRET` e `SESSION_SECRET` fortes (≥32 chars).
- Restrinja `ALLOWED_ORIGINS` em produção.
- Limite de payload já configurado (10mb) e helmet/cors ativos.
- Não exponha `.env`; não commitar segredos.
- Use HTTPS (nginx + certbot) e firewall ufw.

## 18. Checklist final de deploy

- [ ] `.env` preenchido (DB, JWT, FRONTEND/BACKEND_URL, IA se usada).
- [ ] `npm run build` sem erros.
- [ ] `pm2 start dist/index.js` em execução (`pm2 status`).
- [ ] nginx testado (`sudo nginx -t`) e recarregado.
- [ ] Certbot emitido e renovação agendada.
- [ ] Smokes manuais: `/health`, `/api/schedules/all-clients`, `/api/motoboys/locations/latest`, WS conexão OK.

## 19. Troubleshooting (erros comuns)

- **`npm ci` reclama de lock ou versão de Node:** alinhe lock com `npm install` ou use Node 20+.
- **CORS bloqueado:** revise `ALLOWED_ORIGINS` e ambiente (produção aplica restrição).
- **WS não conecta:** garanta proxy com `Upgrade`/`Connection upgrade` e token JWT válido em `?token=`.
- **DB falha:** confira `DATABASE_URL`, acessos e SSL (`sslmode=require`).
- **Build falha:** cheque versões de esbuild/vite e Node; reinstale dependências.
- **404 em estáticos:** confirmar que backend está servindo `dist/public` em produção.

## 20. Glossário simples

- **API REST:** cardápio de URLs que recebem/mandam dados em JSON.
- **WebSocket:** canal aberto para mensagens em tempo real (como um walkie-talkie entre servidor e navegador).
- **Middleware:** porteiro que checa/transforma requisições antes do destino.
- **Token JWT:** crachá digital assinado, prova de identidade.
- **ORM (Drizzle):** tradutor entre código e banco, evitando SQL manual.
- **pm2:** gerente de processos Node (inicia, reinicia, mantém vivo).
- **Reverse proxy (nginx):** recepção que encaminha visitantes para o app Node.
- **Env vars (.env):** bilhetes de configuração (senhas/URLs) lidos na inicialização.

## 21. Fluxo de debug (onde olhar)

- Logs HTTP no console do backend (reqId, método, path, status, tempo).
- WS eventos registrados em `index.ts` e `broadcast` quando conexões entram/saem.
- Use `pm2 logs guriri-backend` em produção.
- Para requests: testar com `curl -i http://localhost:5000/health` e demais rotas; para WS, usar wscat ou navegador.

## 22. Mini diagramas textuais

**Fluxo HTTP:**

```text
Front → (JWT) → Express → Middleware auth/role → Controller → Storage/DB → resposta JSON → Front atualiza UI
```

**Fluxo WS:**

```text
Front abre ws://host/ws?token=JWT → servidor valida → adiciona à lista → servidor envia eventos (orders/chat/status) → front reage em tempo real
```

**Build/deploy:**

```text
Código → npm run build → dist/ (frontend+backend) → pm2 roda dist/index.js → nginx expõe 80/443 → usuários acessam
```
