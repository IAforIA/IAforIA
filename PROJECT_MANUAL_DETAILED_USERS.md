# Manual Detalhado por Usuário (Motoboy, Cliente, Central)

> Linguagem simples. Cada seção começa com um resumo rápido e segue com passos detalhados, referências a arquivos e exemplos de requisição.

## Índice rápido

- [Motoboy](#motoboy)
- [Cliente](#cliente)
- [Central](#central)
- [Cheatsheets](#cheatsheets-rápidos-resumo)
- [Checklist de segurança e privacidade](#checklist-de-segurança-e-privacidade)

---

## Motoboy

Resumo: Motoboy acessa painel para ficar online, receber pedidos em tempo real, aceitar/entregar, enviar comprovantes (Live Docs) e conversar via chat.

### 1. Acesso e cadastro (Motoboy)

- Cadastro/registro: UI de registro padrão (ver `client/src/pages/landing.tsx`, ~linhas 80-140). Campos comuns: email, senha, nome; para motoboy, documentação pode ser solicitada via uploads depois.
- Endpoint exemplo de cadastro (se habilitado no front): `POST /api/auth/register` com JSON:

```json
{
  "email": "motoboy@teste.com",
  "password": "senha123",
  "name": "Motoboy Teste"
}
```

### 2. Login e recuperação (Motoboy)

- Login: botão "Entrar" (landing). Endpoint `POST /api/auth/login`.
- Recuperação de senha: não há fluxo explícito identificado no front; se necessário, contato manual com admin.

### 3. Perfil e documentos (Motoboy)

- Perfil básico exibido no dashboard do motoboy (`client/src/pages/driver-dashboard.tsx`, ~linhas 35-120). Mostra pedidos e dados do usuário.
- Atualização de dados: PATCH `/api/users/:id` **ainda não exposto** no front; recomendação: usar rota administrativa quando liberada.
- Upload de documentos: `POST /api/upload/motoboy-doc` (arquivo multipart/form-data). Campos típicos: `file` (binário), headers com JWT. Local de uso: fluxo de entrega/Live Doc.

### 4. Fluxo principal (passo a passo) — Motoboy

1. **Ficar online**: rota PATCH `/api/motoboys/:id/online` (frontend central dispara; motoboy pode usar `/motoboys/me` para ver status). Evento WS: `driver_online`/`driver_offline`.
2. **Receber pedidos**: WebSocket em `ws://<host>/ws?token=<JWT>`; escuta eventos `new_order`. Arquivo: `client/src/pages/driver-dashboard.tsx` (~linhas 35-90) usa React Query para `/api/orders` e `/api/reports/motoboys/:id`.
3. **Aceitar pedido**: botão "Aceitar" chama `POST /api/orders/:id/accept`. Exemplo JSON:

```json
{ "motoboyId": "<id>" }
```

1. **Marcar entregue**: `POST /api/orders/:id/deliver` com `{ proofUrl }` se houver comprovante. Evento: `order_delivered`.
2. **Enviar Live Doc**: `POST /api/upload/live-doc` multipart; associar `orderId` no corpo (ex.: campo texto). Após upload, a prova é exibida nos detalhes do pedido (front central/cliente).

### 5. Uploads e Live Docs (Motoboy)

- Endpoint: `POST /api/upload/live-doc` (headers: `Authorization: Bearer <token>`). Corpo multipart:

```text
file: <binário>
orderId: <id do pedido>
```

- Visualização: na listagem de pedidos (central/cliente) — confira `client/src/pages/central/orders.tsx`, ~linhas 60-140.

### 6. Filtros e buscas (Motoboy)

- Dashboard do motoboy é enxuto; filtros principais ficam no central. Para motoboy, a lista de pedidos pode ser filtrada por status (client/src/pages/driver-dashboard.tsx, hooks de query keys `/api/orders`).

### 7. Chat e IA (Motoboy)

- Chat disponível em `/api/chat` com broadcast `chat_message`. Front usa `client/src/pages/central/…` e `client/src/pages/driver-dashboard.tsx` para listar/conversar (se habilitado). IA: `POST /api/chat/ai-suggest` (central apenas) — motoboy recebe mensagens normais via WS.

### 8. Relatórios e export (Motoboy)

- Endpoint consumido: `/api/reports/motoboys/:id` (linha ~40 em `client/src/pages/driver-dashboard.tsx` queryKey `['/api/reports/motoboys', user?.id]`). Retorna KPIs próprios.
- Exportações CSV/XLS não vistas no front; se necessário, usar dados JSON retornados.

### 9. Mapa/Geolocalização (Motoboy)

- Localização enviada por API (não vista explicitamente no front). Backend guarda em `motoboyLocations`. Atualização mais recente via `GET /api/motoboys/locations/latest` (central). Se precisar enviar do app motoboy: `POST /api/motoboys/:id/location` (ver storage/motoboys). Payload:

```json
{ "lat": -23.5, "lng": -46.6 }
```

### 10. Troubleshooting rápido (Motoboy)

- Não recebe pedidos: checar WS token; reconectar ao `/ws?token=`.
- 401: token expirou → relogar.
- Upload falha: conferir tamanho/formatos; repetir com conexão estável.
- Ver logs em ambiente dev: `npm run dev` (console). Produção: `pm2 logs guriri-backend`.

### 11. Cenas para vídeo (Motoboy)

- **Cena:** "Motoboy aceita pedido" (30s)
  - Passos: abrir driver dashboard → clicar em pedido pendente → botão "Aceitar" → confirmar.
  - Curl de apoio: `curl -X POST http://localhost:5000/api/orders/<id>/accept -H "Authorization: Bearer <JWT>" -d '{"motoboyId":"<id>"}'`.
  - Narrador: "O motoboy vê o pedido em tempo real, aceita com um clique e o sistema avisa todos os painéis imediatamente."
- **Cena:** "Motoboy entrega com comprovante" (40s)
  - Passos: abrir pedido aceito → botão "Entregar" → anexar foto → enviar.
  - Curl upload: `curl -F "file=@foto.jpg" -F "orderId=<id>" http://localhost:5000/api/upload/live-doc`.
  - Narrador: "Ao finalizar, ele envia o comprovante. A central e o cliente veem o status atualizado na hora."

### 12. Cheatsheet rápido (Motoboy)

- Entrar: landing → email/senha.
- Ver pedidos: driver dashboard.
- Aceitar: botão "Aceitar" → POST `/api/orders/:id/accept`.
- Entregar: botão "Entregar" → POST `/api/orders/:id/deliver`.
- Upload: POST `/api/upload/live-doc`.
- Status online: WS `driver_online`/`driver_offline`.
- Chat: `/api/chat` (se habilitado).
- Relatório: GET `/api/reports/motoboys/:id`.
- Suporte: relogar se 401; verificar WS se sem eventos.

---

## Cliente

Resumo: Cliente cria e acompanha pedidos, vê relatórios próprios, conversa via chat e pode atualizar seus dados.

### 1. Acesso e cadastro (Cliente)

- Cadastro no landing (`client/src/pages/landing.tsx`, ~linhas 80-140). Campos típicos: nome, email, senha, possivelmente CNPJ/CPF. Endpoint `POST /api/auth/register`.
- Exemplo de payload:

```json
{
  "email": "cliente@empresa.com",
  "password": "segura123",
  "name": "Empresa Exemplo",
  "document": "12.345.678/0001-90"
}
```

### 2. Login e recuperação (Cliente)

- Login: `POST /api/auth/login` (mesma tela). Recuperação de senha não exibida; contatar admin se necessário.

### 3. Perfil e documentos (Cliente)

- Perfil do cliente exibido em `client/src/pages/client-dashboard.tsx` (~linhas 30-120) com queries: `/api/orders`, `/api/reports/clients/:id`, `/api/me/profile`, `/api/clients/:id/schedules`.
- Atualização de cadastro próprio: PATCH `/api/clients/me` (front usa mutate em `client-dashboard.tsx` para endereço/documentos). Campos principais: endereço, contatos.
- Uploads: comprovantes via `/api/upload/client-doc` ou `/api/upload/live-doc` (quando anexando ao pedido). Multipart com `file` e `orderId`.

### 4. Fluxo principal (passo a passo) — Cliente

1. **Criar pedido**: Form em `client/src/pages/client/create-order-dialog.tsx` (~linhas 150-260). Chama `POST /api/orders` com:

```json
{
  "pickup": "Rua A, 123",
  "dropoff": "Rua B, 456",
  "scheduledFor": "2025-12-08T14:00:00Z",
  "paymentMethod": "card",
  "notes": "Fragil"
}
```

1. **Acompanhar**: Lista em `client-dashboard.tsx` usando query `/api/orders` e relatório `/api/reports/clients/:id`.
2. **Chat**: `/api/chat` para mensagens; WebSocket para `chat_message`.
3. **Ver comprovantes**: uploads associados ao pedido (Live Doc) aparecem na UI de pedidos.

### 5. Uploads e Live Docs (Cliente)

- Endpoint: `POST /api/upload/client-doc` ou `POST /api/upload/live-doc`. Use multipart:

```text
file: <binário>
orderId: <id>
```

- Tamanho/formatos: seguir aceitação padrão do multer (imagens/pdf). Se falhar, reduzir tamanho.

### 6. Filtros e buscas (Cliente)

- Filtros no dashboard central impactam cliente indiretamente. Para cliente, filtros simples por status/data podem existir na listagem (ver hooks em `client-dashboard.tsx`). QueryKey principal: `['/api/orders']`.

### 7. Chat e IA (Cliente)

- Iniciar conversa: botão de chat (ver `client/src/components/ChatWidget` referenciado no build output). Endpoint `/api/chat` (GET/POST). IA é central; cliente recebe mensagens padrões.

### 8. Relatórios e export (Cliente)

- Endpoint: `/api/reports/clients/:id` (query em `client-dashboard.tsx`). Resposta inclui KPIs e histórico. Exportações não vistas; usar JSON retornado.

### 9. Mapa/Geolocalização (Cliente)

- Rastreamento depende de `motoboys/locations/latest` consumido pelo painel central; cliente visualiza estado do pedido no card. Coordenadas vêm de backend (WS ou GET). Payload exemplo de atualização (motoboy): `{ "lat": -23.5, "lng": -46.6 }`.

### 10. Troubleshooting rápido (Cliente)

- Pedido não aparece: recarregar; checar token; `/api/orders` deve responder 200.
- Chat sem mensagens: ver WS; se 401, refazer login.
- Upload falha: verificar tamanho; tentar novamente com rede estável.

### 11. Cenas para vídeo (Cliente)

- **Cena:** "Cliente cria pedido" (45s)
  - Passos: abrir dashboard cliente → botão "Novo pedido" → preencher coleta/entrega/data → confirmar.
  - Curl apoio: `curl -X POST http://localhost:5000/api/orders -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" -d '{"pickup":"Rua A,123","dropoff":"Rua B,456"}'`.
  - Narrador: "O cliente preenche origem e destino, confirma e o pedido entra na fila para a Central e motoboys."
- **Cena:** "Cliente vê comprovante" (30s)
  - Passos: abrir pedido concluído → seção de comprovantes → abrir imagem/PDF.
  - Narrador: "Após a entrega, o comprovante fica disponível para consulta segura."

### 12. Cheatsheet rápido (Cliente)

- Entrar: landing → email/senha.
- Novo pedido: botão "Novo pedido" → POST `/api/orders`.
- Histórico: lista `/api/orders`.
- Relatório: GET `/api/reports/clients/:id`.
- Chat: `/api/chat`.
- Upload comprovante: `/api/upload/client-doc` ou `/upload/live-doc`.
- Suporte: se 401, relogar; se nada atualiza, verificar WS.

---

## Central

Resumo: Central administra usuários, clientes, motoboys, pedidos, relatórios, chat e monitora localização.

### 1. Acesso e cadastro (Central)

- Login central com credenciais pré-criadas (não há auto-cadastro público). Endpoint `POST /api/auth/login`.

### 2. Login e recuperação (Central)

- Mesma tela de login; recuperação não implementada — usar canal interno.

### 3. Perfil e documentos (Central)

- Usuário central pode listar usuários e alterar status/role em `client/src/pages/central/users.tsx` (~linhas 10-60) chamando:
  - PATCH `/api/users/:id/status`
  - PATCH `/api/users/:id/role`
- Atualização própria via PATCH `/api/users/:id` ainda não exposta no front; pode ser adicionada.

### 4. Fluxo principal (passo a passo) — Central

1. **Visão geral**: `client/src/pages/central-dashboard.tsx` (~linhas 30-90) carrega `/api/orders`, `/api/motoboys`, `/api/motoboys/locations/latest`, `/api/schedules/all-clients`, `/api/schedules/all-motoboys`.
2. **Pedidos**: `client/src/pages/central/orders.tsx` (~linhas 40-110). Ações:
   - Cancelar: PATCH `/api/orders/:id/cancel`
   - Reatribuir: PATCH `/api/orders/:id/reassign` com `{ motoboyId }`
   - Aceitar/entregar são ações do motoboy, mas Central pode monitorar.
3. **Motoboys**: `client/src/pages/central/drivers.tsx` (~linhas 20-120, 230-360) para listar/criar/editar motoboys e alternar online: `PATCH /api/motoboys/:id/online`, `POST /api/motoboys`, `PATCH /api/motoboys/:id`.
4. **Clientes**: `client/src/pages/central/clients.tsx` (~linhas 160-320) para criar/editar e ver horários: `POST /api/clients`, `PATCH /api/clients/:id`, `GET /api/clients/:id/schedules`.
5. **Relatórios**: `client/src/pages/central/financial.tsx` e `client/src/components/OperationalInsights.tsx` consultam `/api/reports/company`, `/api/reports/orders`, `/api/reports/clients/:id`, `/api/reports/motoboys/:id`.
6. **Chat**: `client/src/pages/central/...` usa `/api/chat` e IA via `/api/chat/ai-suggest` (central only).

### 5. Uploads e Live Docs (Central)

- Central visualiza comprovantes enviados; uploads principais são feitos por motoboy/cliente. Endpoints: `/api/upload/live-doc`, `/api/upload/client-doc`, `/api/upload/motoboy-doc`.

### 6. Filtros e buscas (Central)

- Orders: filtros por status/data/motoboy em `central/orders.tsx` (ver hooks e queryKey `/api/orders`).
- Relatórios: filtros de data/status embutidos nos endpoints (`reports.ts` parseia query params).

### 7. Chat e IA (Central)

- Envia/recebe `chat_message` via WS e `/api/chat`.
- IA: `POST /api/chat/ai-suggest` gera sugestão; `POST /api/chat/ai-feedback` registra feedback.

### 8. Relatórios e export (Central)

- Company: `/api/reports/company` (role central).
- Clientes: `/api/reports/clients/:id`.
- Motoboys: `/api/reports/motoboys/:id` (ou alias `/api/reports/motoboys/:id`).
- Orders: `/api/reports/orders`.
- Export explícito (CSV) não visto; usar JSON.

### 9. Mapa/Geolocalização (Central)

- Dados via `/api/motoboys/locations/latest`. Atualizados por WS `driver_online/offline` e eventos de pedidos.

### 10. Troubleshooting rápido (Central)

- Relatório 403: checar role e token.
- Filtros vazios: conferir query params (datas válidas) e CORS.
- Sem localização: verificar se motoboys enviam posição; conferir WS.

### 11. Cenas para vídeo (Central)

- **Cena:** "Central reatribui pedido" (40s)
  - Passos: abrir pedidos → selecionar pedido → clicar "Reatribuir" → escolher motoboy → confirmar.
  - Curl: `curl -X PATCH http://localhost:5000/api/orders/<id>/reassign -H "Authorization: Bearer <JWT>" -H "Content-Type: application/json" -d '{"motoboyId":"<id-moto>"}'`.
  - Narrador: "A central realoca o pedido em segundos, e o motoboy escolhido recebe a notificação imediatamente."
- **Cena:** "Central gera relatório" (30s)
  - Passos: abrir tela financeira → escolher período → clicar "Gerar".
  - Curl: `curl "http://localhost:5000/api/reports/company?from=2025-12-01&to=2025-12-07" -H "Authorization: Bearer <JWT>"`.
  - Narrador: "Com poucos cliques, a central vê KPIs de pedidos, clientes e motoboys."

### 12. Cheatsheet rápido (Central)

- Pedidos: GET `/api/orders`; cancelar `/api/orders/:id/cancel`; reassign `/api/orders/:id/reassign`.
- Motoboys: GET `/api/motoboys`; online `/api/motoboys/:id/online`; criar `POST /api/motoboys`.
- Clientes: GET `/api/clients`; horários `/api/clients/:id/schedules`.
- Relatórios: `/api/reports/company`, `/api/reports/orders`, `/api/reports/clients/:id`, `/api/reports/motoboys/:id`.
- Chat/IA: `/api/chat`, `/api/chat/ai-suggest`.
- Localização: `/api/motoboys/locations/latest`.

---

## Cheatsheets rápidos (resumo)

### Cheatsheet: Motoboy

- Login: POST `/api/auth/login`
- Online/offline: PATCH `/api/motoboys/:id/online`
- Aceitar: POST `/api/orders/:id/accept`
- Entregar: POST `/api/orders/:id/deliver`
- Upload: POST `/api/upload/live-doc`
- Relatório: GET `/api/reports/motoboys/:id`

### Cheatsheet: Cliente

- Login: POST `/api/auth/login`
- Criar pedido: POST `/api/orders`
- Histórico: GET `/api/orders`
- Relatório: GET `/api/reports/clients/:id`
- Upload: POST `/api/upload/client-doc`

### Cheatsheet: Central

- Pedidos: GET `/api/orders`; reassign `/api/orders/:id/reassign`
- Motoboys: GET `/api/motoboys`; online `/api/motoboys/:id/online`
- Clientes: GET `/api/clients`; horários `/api/clients/:id/schedules`
- Relatórios: `/api/reports/company` e derivados
- Chat/IA: `/api/chat`, `/api/chat/ai-suggest`

---

## Checklist de segurança e privacidade

- Use contas de teste em gravações; não exponha dados reais.
- Oculte `.env` e segredos; jamais mostre JWT em tela.
- Em vídeos, borre nomes/documentos e endereços reais.
- Para uploads, use arquivos fictícios com tamanho pequeno.
- Sempre testar em ambiente de staging antes de produção.

---

> Referências de arquivos citados (caminhos + linhas aproximadas):
>
> - `client/src/pages/landing.tsx` (~80-140): login/cadastro
> - `client/src/pages/driver-dashboard.tsx` (~35-120): pedidos do motoboy, relatórios próprios
> - `client/src/pages/client-dashboard.tsx` (~30-120): pedidos e relatórios do cliente
> - `client/src/pages/client/create-order-dialog.tsx` (~150-260): formulário de novo pedido
> - `client/src/pages/central-dashboard.tsx` (~30-90): visão geral central
> - `client/src/pages/central/orders.tsx` (~40-110): lista e ações de pedidos
> - `client/src/pages/central/drivers.tsx` (~20-120, 230-360): gestão de motoboys
> - `client/src/pages/central/clients.tsx` (~160-320): gestão de clientes
> - `client/src/pages/central/users.tsx` (~10-60): gestão de usuários (status/role)
> - `client/src/components/OperationalInsights.tsx` (~10-120): blocos de KPIs/relatórios
> - WS eventos: definidos no backend (`server/routes/orders.ts`, `server/routes/chat.ts`, `server/index.ts`).

Concluído — manual detalhado salvo em PROJECT_MANUAL_DETAILED_USERS.md.
