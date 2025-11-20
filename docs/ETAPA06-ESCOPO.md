# Etapa 06 — Auto-Preenchimento da Coleta (Escopo)

> Referências: `MANUAL-IMPLEMENTACAO.md` (Etapa 06) e HTML legado `attached_assets/dashboard_cliente_1763053158330.html` blocos "📍 Endereço de Coleta" (linhas 35-90), onde o endereço fixo é repetido em todo pedido.

## 1. Diagnóstico do Estado Atual

1. `client/src/pages/client-dashboard.tsx` exige que o cliente reescreva rua/número/bairro em cada pedido. Campos ficam sempre editáveis e não há indicação de endereço canônico.
2. `server/routes.ts` aceita os campos de coleta enviados pelo cliente sem recalcular com base no cadastro fixo (`clients`). Isso permite divergência e cria inconsistência com a Etapa 04 (migração do endereço).
3. `orders` (em `shared/schema.ts`) não registra se o endereço de coleta foi sobrescrito manualmente, impossibilitando auditoria ou alarmes.
4. Não existe endpoint que devolva o `ClientProfileDto` autenticado para que o frontend saiba qual endereço deve proteger.

**Risco:** os pedidos atuais podem ter coleta divergente do cadastro oficial, comprometendo roteirização automática e cálculo de taxa.

## 2. Objetivos Funcionais da Etapa 06

1. **Endereço canônico automático** — Para clientes autenticados, todo pedido deve reutilizar `clients.address` (CEP, rua, número, bairro, complemento e referência) sem intervenção manual.
2. **UX protegida** — O formulário do cliente precisa sinalizar o endereço fixo como bloqueado, com texto educativo. Um toggle de emergência deve liberar edição manual, registrando flag (`coletaOverride`).
3. **Backoffice sincronizado** — Mesmo que o cliente tente alterar o JSON, o backend força os campos para o endereço oficial quando `coletaOverride = false`.
4. **Observabilidade** — Novos pedidos devem indicar (boolean) quando houve override para facilitar auditorias do time central.

## 3. Componentes Impactados

| Área | Arquivo(s) | Ação Planejada |
|------|------------|----------------|
| Shared | `shared/schema.ts`, `shared/contracts.ts` | Adicionar coluna `coletaOverride` na tabela `orders` e expor tipo/DTO usado pelo frontend. |
| Backend | `server/storage.ts`, `server/routes.ts` | Novo método para buscar perfil do cliente, rota `GET /api/me/profile`, ajustes no `POST /api/orders` para forçar endereço oficial e registrar override. |
| Frontend | `client/src/pages/client-dashboard.tsx`, possivelmente componentes auxiliares | Buscar perfil via React Query, preencher formulário automaticamente e bloquear campos de coleta com toggle de override. |
| Documentação | `STATUS-ATUAL.md`, `RELATORIO-AUDITORIA.md` (observação), `MANUAL-IMPLEMENTACAO.md` (status da etapa) | Registrar a conclusão e instruções de QA. |
| Banco | `db:push` | Aplicar alteração da tabela `orders` para incluir flag de override. |

## 4. Sequência Técnica Proposta

1. **Schema + Contratos**
   - Adicionar `coletaOverride BOOLEAN DEFAULT false` em `orders` (`shared/schema.ts`) e refletir no `insertOrderSchema`.
   - (Opcional futuro) Exportar `ClientProfileDto` reutilizado no frontend já existente em `shared/contracts.ts`.
2. **Storage e Rotas**
   - Criar `storage.getClientProfile(id)` reutilizando `mapClientToProfile`.
   - Expor `GET /api/me/profile` (auth obrigatória, role `client`).
   - Atualizar `POST /api/orders`: para `req.user.role === 'client'`, carregar perfil, preencher `clientId`, `clientName`, `clientPhone` e todos os campos de coleta direto do cadastro. Só usar valores do body se `coletaOverride === true`.
3. **Frontend**
   - Consultar `/api/me/profile` ao carregar o dashboard.
   - Mostrar card com endereço fixo + Switch "Liberar edição emergencial". Quando Switch desligado, inputs ficam `disabled` e mostram o endereço oficial.
   - Ao ativar override, permitir edição e enviar `coletaOverride: true`. Desativar override volta aos valores do cadastro.
4. **QA e Sincronização**
   - Rodar `npm run db:push` seguido por `npm run build`/`npm run dev`.
   - Registrar testes manuais: criação de pedido com override off (valores fixos) e override on (valores custom) verificando flag no banco.

## 5. Critérios de Aceite

- Cliente autenticado cria pedido e o backend grava exatamente o endereço cadastrado (sem override) independentemente do payload.
- UI exibe mensagem clara sobre uso automático do endereço e identifica quando override está ativo.
- Novo campo `coletaOverride` visível nas consultas de pedidos e default `false`.
- Documentação (`STATUS-ATUAL.md` e manual) atualizada citando a automação da coleta e próximos passos (Etapa 07).
- Builds/dev server funcionando sem regressões; warning conhecido do PostCSS continua sendo o único alerta aberto.
