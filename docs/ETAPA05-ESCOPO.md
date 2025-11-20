# Etapa 05 — Onboarding PF/PJ Unificado (Escopo)

> Referências de requisitos: `MANUAL-IMPLEMENTACAO.md` (Etapa 05) e HTML legado `attached_assets/dashboard_cliente_1763053158330.html` linhas 1-120 (campos de coleta/pagamento que precisam nascer completos já no cadastro).

## 1. Diagnóstico do Estado Atual

1. `server/routes.ts` só expõe `/api/auth/login`; não há rota de criação de usuários ou clientes. O middleware de autenticação depende exclusivamente de registros pré-inseridos (scripts de importação).
2. `shared/schema.ts` já contém os campos fixos no `clients` (`documentType`, `documentNumber`, `ie`, `cep`, `rua`, `numero`, `bairro`, etc.), porém todos estão com defaults artificiais e sem validação real. `insertClientSchema`/`insertUserSchema` continuam genéricos (sem zod custom) e não existe `shared/contracts.ts` para DTOs apontados em `docs/CONTRATOS-COMPARTILHADOS.md`.
3. `client/src/pages/landing.tsx` oferece apenas login (email/senha). Não há fluxo de onboarding, escolha PF/PJ ou coleta de endereço/documentos — o cliente precisa receber credenciais externas para entrar.
4. HTML legado (`dashboard_cliente_*.html`) mostra que o cliente precisa informar telefone, endereço de coleta, referência e preferências logo na primeira interação. Esse formulário também oferece cálculo de taxa, configurações de horário e campos financeiros/troco que dependem de um cadastro rico de dados.

> Conclusão: o backend não consegue receber novos clientes e o frontend não coleta dados suficientes. Etapa 05 precisa criar um fluxo único que gere `users` + `clients` completos já com endereço fixo.

## 2. Objetivos Funcionais da Etapa 05

1. **Formulário PF/PJ**
   - Seleção PF/PJ + instruções (PF: CPF obrigatório; PJ: CNPJ + IE opcional).
   - Campos de identificação: razão social/nome fantasia, contato, email corporativo, telefone/WhatsApp.
   - Endereço fixo de coleta (CEP, rua/avenida, número, complemento, bairro, referência) e possibilidade de armazenar geolocalização futura.
   - Consentimento explícito para reutilizar endereço em todos os pedidos (texto educativo alinhado ao manual).

2. **Endpoint `/api/auth/register`**
   - Validação server-side com Zod (usa contratos compartilhados) recebendo todos os campos acima + senha inicial.
   - Persistência transacional (`users` + `clients`). Deve rejeitar duplicidades por email/documentNumber.
   - Hash de senha via `bcrypt`, retorno de JWT, `ClientProfileDto` pronto para o frontend setar contexto automaticamente.
   - Logging e rate limit próprios (evitar brute force no cadastro).

3. **Sincronização de Contratos**
   - Criar `shared/contracts.ts` com `DocumentType`, `ClientProfileDto`, `ClientOnboardingPayload` (novo) e reaproveitar em ambos os lados.
   - Atualizar `docs/CONTRATOS-COMPARTILHADOS.md` → código com comentários sucintos próximos aos objetos complexos.

4. **Testabilidade**
   - Definir cenários mínimos: cadastro PF happy path, cadastro PJ com IE opcional, tentativa com email/documento duplicados, e validação de CEP inválido.

## 3. Componentes Impactados

| Área | Arquivo(s) | Ação Planejada |
|------|------------|----------------|
| Shared | `shared/schema.ts`, **novo** `shared/contracts.ts` | Ajustar schemas Zod para clientes/usuários (sem defaults falsos). Exportar DTOs e payloads usados na rota de registro e no frontend. |
| Backend | `server/routes.ts`, `server/storage.ts`, poss. utilitário `server/db.ts` | Criar rota `/api/auth/register`, adicionar rate limiter, encapsular transação `createClientWithUser`, reaproveitar hashing de `bcrypt`. |
| Frontend | `client/src/pages/landing.tsx` ou nova página `client/src/pages/onboarding.tsx` + componentes compartilhados | Introduzir wizard PF/PJ (provável modal/aba na landing), com máscara básica e validação usando os mesmos contratos Zod. Após registro bem-sucedido, reaproveitar `login()` para autenticar automaticamente. |
| Documentação | `STATUS-ATUAL.md`, `docs/CONTRATOS-COMPARTILHADOS.md`, `RELATORIO-AUDITORIA.md` (anotação de feature) | Atualizar progresso da etapa e instruções para qa/manual. |
| Scripts | `server/scripts/backfill-client-address.ts` | Validar se importações futuras precisam chamar o novo fluxo; documentar diferenças vs onboarding manual. |

## 4. Sequência Técnica Proposta

1. **Contratos e Schemas**
   - Criar `shared/contracts.ts` declarando `DocumentType`, `ClientProfileDto`, `ClientOnboardingPayload`, `RegisterResponseDto` e envelope WS reutilizável.
   - Atualizar `shared/schema.ts` para remover defaults temporários em `clients` e derivar `insertClientSchema` específico para onboarding (usa `z.string().min()` etc.).

2. **Storage e Transação**
   - Adicionar método `createClientWithUser(payload)` em `server/storage.ts` para (a) verificar se email/documentNumber existem nas tabelas correspondentes; (b) inserir `users` (role `client`); (c) inserir `clients`; (d) retornar `ClientProfileDto`.
   - Utilizar `db.transaction` do Drizzle para garantir atomicidade.

3. **Rota `/api/auth/register`**
   - Novo rate limiter (`registerLimiter`, máx 3 tentativas/15 min/IP).
   - Validação com `clientOnboardingSchema` (importado de `shared/contracts.ts` ou `zod` derivado).
   - Hash da senha (`bcrypt.hash`), chamada ao storage, geração de JWT (mesmo segredo), retorno `{ access_token, profile }`.
   - Log estruturado (evitar exposição de senha). Incluir mensagens educativas em comentários conforme instrução do cliente.

4. **Frontend (Onboarding Wizard)**
   - Implementar componente reutilizável (pode ser `OnboardingForm`) contendo:
     - Toggle PF/PJ que troca máscaras (CPF vs CNPJ) e exibe campo IE somente quando PJ.
     - Seção "Endereço fixo" replicando campos do HTML legado (linhas 30-90) porém em linguagem React + Tailwind.
     - Passo final com senha + confirmação e checkbox de aceite.
   - `useMutation` chamando `/api/auth/register`; ao sucesso, reaproveitar `login()` com as credenciais recém-criadas ou consumir `profile + token` retornados.
   - Incluir comentários breves antes de blocos complexos (ex.: "PF/PJ toggle garante coleta correta para geração automática de pedidos").

5. **Validação & QA**
   - Criar testes rápidos (Vitest) para `clientOnboardingSchema` e rota usando `supertest` ou `fetch` in-memory.
   - Atualizar `STATUS-ATUAL.md` após validação manual (cadastro PF e PJ) e documentar como rodar.

## 5. Dependências e Pontos de Atenção

- Necessário garantir `bcryptjs` disponível no frontend? Não — hashing fica no backend.
- CEP/telefone podem usar máscaras via libs leves ou Regex + dica visual; evitar dependências pesadas agora.
- Scripts de importação existentes continuarão válidos, mas devem ser anotados para aderir aos novos campos (seguir Etapa 04 + 05). Podemos abrir issue futura para atualizar `import-empresa-completa.ts`.
- Manter compatibilidade com usuários existentes: rota de login continua igual e novos campos de `clients` precisam de backfill via `server/scripts/backfill-client-address.ts` (já criado).

## 6. Aceite para Considerar Etapa 05 "Escopada"

- Plano acima revisado/validado com o cliente.
- Lista de arquivos impactados + sequência técnica acordada.
- Confirmação de que contratos/DOCs serão atualizados antes de codar.

> Após essa aprovação, seguimos para "Implement PF/PJ onboarding" (Todo #2) implementando código, testes e documentação conforme descrito.
