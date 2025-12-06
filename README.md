# 🚚 Guriri Express

Sistema completo de entregas com rastreamento em tempo real, notificações via WebSocket e dashboards para Central, Clientes e Motoboys.

---

## 🎯 Início Rápido

### Pré-requisitos

- Node.js 18+ (recomendado: 20 LTS)
- Conta [Neon PostgreSQL](https://neon.tech) ou instância PostgreSQL local
- npm ou pnpm

### Instalação

```bash
# Clone e instale dependências
git clone <seu-repo>
cd GuririExpress
npm install
```

### Configuração

1. **Copie o template de variáveis:**

   ```bash
   cp .env.example .env.local
   ```

2. **Edite `.env.local` com suas credenciais:**

   ```dotenv
   DATABASE_URL=postgresql://user:password@host:5432/guriri_express?sslmode=require
   JWT_SECRET=<gere-um-hash-seguro-de-32-chars>
   SESSION_SECRET=<outro-hash-seguro>
   PORT=5000
   WS_PORT=5001
   NODE_ENV=development
   ```

   > **Dica:** gere secrets com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

3. **Envie o schema para o banco:**

   ```bash
   npm run db:push
   ```

4. **Popule usuários iniciais (opcional):**

   ```bash
   # Edite server/scripts/seed-users.ts antes de executar
   npx tsx server/scripts/seed-users.ts
   ```

   Isso criará 3 usuários de teste e gravará um CSV com as credenciais em `.output/`.

5. **Popule horários dos motoboys (opcional):**

   ```bash
   npx tsx server/scripts/seed-motoboy-schedules.ts
   ```

   Gera as escalas semanais (manhã/tarde/noite) para todos os motoboys cadastrados, usadas pela Central para ver disponibilidade e pelos badges "Disponível"/"Próximo turno" na UI.

### Desenvolvimento

```bash
npm run dev
```

Isso inicia:

- **API REST** em `http://localhost:5000`
- **WebSocket** em `ws://localhost:5001/ws`
- **Vite HMR** servindo o frontend React

Acesse `http://localhost:5000` e faça login com as credenciais do seed.

---

## 🪵 Logs, Debug e Build Guard

- Cada requisição recebe `X-Request-Id` e é logada no formato estruturado (`logs/app.log`, `logs/error.log`). Em erros, o `requestId` também retorna no JSON para rastrear no log.
- Para builds: `npm run build:ci` roda `npm run build` + `npm run check:bundle` e falha se algum chunk gzip > 550 kB.
- Dev: `npm run dev` (API + Vite), Prod: `npm run build` e `npm start`.
- Health checks: `GET /health` (liveness) e `GET /ready` (readiness com ping no banco).

---

## 🗓️ Escalas de Motoboys

- Endpoints: `GET /api/motoboys/:id/schedules` e `POST /api/motoboys/:id/schedules` (central ou o próprio motoboy).
- Seed rápido: `npx tsx server/scripts/seed-motoboy-schedules.ts` preenche 7 dias por motoboy com turnos manhã/tarde/noite.
- UI: badges de disponibilidade mostram "Disponível", "Próximo turno (hora)" ou "Folga hoje" conforme a escala do dia; o modal "Ver schedule" sempre refaz o fetch ao abrir para refletir atualizações.
- Driver Settings: a seção de documentos do motoboy agora exibe links para CNH e comprovante já enviados.

---

## 📦 Estrutura do Projeto

```text
GuririExpress/
├── client/               # React + shadcn/ui + TanStack Query
│   ├── src/
│   │   ├── pages/        # central-dashboard, client-dashboard, driver-dashboard
│   │   ├── components/   # UI reutilizáveis (OrderCard, StatCard, etc)
│   │   └── lib/          # queryClient, utils, resolveWebSocketUrl
│   └── index.html
├── server/               # Express + Drizzle ORM + WebSocket
│   ├── index.ts          # Servidor principal (API em PORT, WS em WS_PORT)
│   ├── routes.ts         # Rotas REST /api/*
│   ├── storage.ts        # Camada de acesso a dados
│   ├── db.ts             # Cliente Drizzle
│   ├── middleware/       # auth.ts (JWT)
│   └── scripts/          # seed-users, import-*, credential-helper
├── shared/
│   └── schema.ts         # Tabelas Drizzle + tipos TypeScript
├── docs/                 # Documentação do projeto (manuais, relatórios)
├── scripts/              # Scripts de automação e manutenção (start, audit, tests)
├── .env.example          # Template de variáveis
├── drizzle.config.ts     # Configuração Drizzle
├── vite.config.ts        # Configuração Vite
└── package.json
```

---

## 🔐 Segurança e Credenciais

- **Senhas dinâmicas:** todos os scripts de importação (`import-users.ts`, `import-empresa-completa.ts`, etc.) utilizam `credential-helper` para gerar senhas únicas por usuário.
- **CSV auditável:** cada execução grava um arquivo `.output/<prefix>-<timestamp>.csv` com `id,email,role,tempPassword`. Distribua esse arquivo via canal seguro e delete após o uso.
- **Sem hard-code:** nenhuma senha padrão permanece no código-fonte.
- **Bcrypt:** todas as senhas são hashadas com custo 10 antes de serem armazenadas.

---

## 🌐 Deploy em Produção

### Railway (recomendado)

```bash
npm install -g @railway/cli
railway login
railway init
railway add -d postgres
railway variables set JWT_SECRET="<seu-secret>"
railway variables set SESSION_SECRET="<seu-secret>"
railway variables set WS_PORT="5001"
railway up
```

### Render / Vercel / Fly.io

1. Configure as variáveis `DATABASE_URL`, `JWT_SECRET`, `SESSION_SECRET`, `PORT` e `WS_PORT`.
2. Execute `npm run build` para gerar `dist/`.
3. Inicie com `node dist/index.js` (ou o comando de start do seu provedor).

> **Nota:** em produção, o WebSocket continuará em `WS_PORT`. Garanta que firewalls/balanceadores permitam tráfego WebSocket nessa porta.

---

## 🧪 Testes

```bash
# Build (valida tipagem e bundle)
npm run build

# Suite de serviços + hooks (Vitest + jsdom)
npm run test
```

- Os testes cobrem os serviços puros (`client/src/services`) e os hooks derivados (`client/src/hooks`).
- Utilize `npm run test -- --watch` durante o desenvolvimento para feedback contínuo.
- Consulte `docs/architecture/testing-strategy.md` para orientações de cobertura e exemplos de fixtures.

---

## 📚 Documentação Adicional

- **[RELATORIO-AUDITORIA.md](./RELATORIO-AUDITORIA.md):** auditoria técnica completa, histórico de problemas e soluções aplicadas.
- **[INICIO-RAPIDO.md](./INICIO-RAPIDO.md):** guia de lançamento interno em 4 passos.
- **[CONFIGURAR-BANCO.md](./CONFIGURAR-BANCO.md):** detalhes sobre Neon, Drizzle e migrações.
- **[DEPLOYMENT.md](./DEPLOYMENT.md):** instruções específicas para diferentes plataformas.

---

## 🛠️ Variáveis de Ambiente

| Variável          | Descrição                                  | Default       |
|-------------------|--------------------------------------------|---------------|
| `DATABASE_URL`    | Connection string PostgreSQL (obrigatório) | —             |
| `JWT_SECRET`      | Chave para assinar tokens JWT (obrigatório)| —             |
| `SESSION_SECRET`  | Secret para sessões Express (obrigatório)  | —             |
| `PORT`            | Porta do servidor HTTP (API + Vite)        | `5000`        |
| `WS_PORT`         | Porta do servidor WebSocket                | `5001`        |
| `NODE_ENV`        | Ambiente (`development` ou `production`)   | `development` |
| `VITE_WS_URL`     | Override completo do WebSocket (cliente)   | —             |
| `VITE_WS_HOST`    | Host do WebSocket (cliente)                | hostname atual|
| `VITE_WS_PORT`    | Porta do WebSocket (cliente)               | `5001`        |

---

## 🤝 Contribuindo

1. Crie uma branch feature: `git checkout -b feature/minha-feature`
2. Commit suas mudanças: `git commit -m 'Add nova feature'`
3. Push para a branch: `git push origin feature/minha-feature`
4. Abra um Pull Request

---

## 📝 Licença

Este projeto é privado e proprietário. Todos os direitos reservados.

---

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação em `RELATORIO-AUDITORIA.md` ou abra uma issue no repositório interno.
