# Manual de Implementação Sequencial (20 Etapas)

> **Regras de Ouro**
> 1. Execute as etapas em ordem estrita: só avance para a próxima depois de validar totalmente a atual.
> 2. Registre evidências (commits, prints, logs) ao concluir cada etapa.
> 3. Mantenha `STATUS-ATUAL.md` sincronizado ao fim de cada etapa para toda a equipe saber o progresso.
> 4. Use feature flags para não degradar o ambiente de produção durante a transição.

---

## Etapa 01 — Congelar Escopo e Artefatos

- Revisar este manual + anexos HTML.
- Atualizar `STATUS-ATUAL.md` com o baseline atual (builds, ambientes, flags).
- Garantir que branch principal esteja limpo (rodar `npm run build`).
- **Saída:** baseline aprovado e comunicado.
- **Status atual:** ✅ Concluída em 15/11/2025 (ver `STATUS-ATUAL.md`).

## Etapa 02 — Auditoria de Templates Legados

- Mapear cada interação dos HTMLs (`dashboard_central`, `dashboard_cliente`, `dashboard_motoboy`).
- Documentar lógica/WS/endpoints detectados em `RELATORIO-AUDITORIA.md`.
- **Saída:** lista consolidada de comportamentos obrigatórios.
- **Status atual:** ✅ Concluída (artefatos listados no `RELATORIO-AUDITORIA.md`).

## Etapa 03 — Contratos de Dados Compartilhados

- Atualizar `shared/schema.ts` e DTOs para refletir todos os campos necessários.
- Versionar eventos WebSocket (chat, pedidos, live docs) num módulo comum.
- **Saída:** esquema versionado + tipos exportados.
- **Status atual:** ✅ Concluída (ver `shared/contracts.ts` e `docs/CONTRATOS-COMPARTILHADOS.md`).

## Etapa 04 — Migração do Endereço Fixo do Cliente

- Criar migração Drizzle + script de backfill.
- Atualizar `clients` com CEP, rua, número, bairro, complemento, referência e tipo PF/PJ.
- **Saída:** Neon com dados preenchidos e validados.
- **Status atual:** ✅ Concluída (dados migrados segundo `STATUS-ATUAL.md`).

## Etapa 05 — Onboarding PF/PJ Unificado

- Implementar formulário PF/PJ (frontend) coletando documentos e endereço fixo.
- Endpoint `/api/auth/register` valida e persiste `users` + `clients` completos.
- **Saída:** cadastro único funcionando com testes automatizados.
- **Status atual:** ✅ Concluída (rota `/api/auth/register` e landing page atualizadas).

## Etapa 06 — Auto-Preenchimento de Coleta em Pedidos

- Adaptar criação de pedidos para usar o endereço fixo.
- Atualizar dashboard cliente para bloquear edição da coleta (com override opcional e flag).
- **Saída:** pedidos sempre persistem coleta canônica.
- **Status atual:** ✅ Concluída (rota `/api/me/profile` + lógica de autopreenchimento + UI com toggle).

## Etapa 07 — Calculadora de Taxa & Pagamento Dinâmico

- Implementar `GET /api/taxa/calcular` com caches.
- Reproduzir UI do botão “Calcular” e regras de troco/troco obrigatório.
- **Saída:** formulário cliente calculando taxa real.

## Etapa 08 — Timeline, Chat THOR e Live Docs (Cliente)

- Integrar WS (chat/order updates) conforme template.
- Recriar timeline holográfica, chatbox e modal de Live Docs.
- **Saída:** painel cliente espelhando template com testes de tempo real.

## Etapa 09 — Configuração de Horários do Cliente

- Implementar modal + backend (`client_schedules`).
- Garantir sincronização com central (validação de janelas).
- **Saída:** cliente controla horários e dados chegam à central.

## Etapa 10 — KPIs e Pedidos em Tempo Real (Central)

- Construir cards, KPIs e feed em `central-dashboard.tsx` usando React Query + WS.
- Atualizar endpoints `/api/pedidos` para filtros necessários.
- **Saída:** painel esquerdo completo.

## Etapa 11 — Log Operacional THOR (Central)

- Reproduzir chat/log com reconexão, fila offline e status indicator.
- Mapear eventos (`new_pedido`, `pedido_assigned`, etc.) para UI.
- **Saída:** painel central funcionando como no HTML.

## Etapa 12 — Gestão de Motoboys & Emergência

- Listagem com estados online/offline, clique p/ detalhes, botão `Hot-Swap` acionando redistribuição.
- Backend executa redistribuição segura e audita resultado.
- **Saída:** painel direito espelhado e funcional.

## Etapa 13 — Missão do Motoboy: Disponíveis & Aceite

- Implementar lista de pedidos disponíveis + fluxo de aceite via `/api/pedido/:id/assign`.
- Atualizar UI com mission card e toasts.
- **Saída:** motoboy aceita pedidos direto do painel.

## Etapa 14 — GPS, Heartbeat e Mapa Placeholder

- Adicionar watcher geolocalização + envio periódico (`motoboyLocations`).
- Atualizar backend/WS para broadcast.
- **Saída:** mapa/placeholder exibindo status GPS.

## Etapa 15 — Live Docs Offline + Upload Seguro

- Implementar fila de uploads com retry e exibir estado na UI.
- Backend valida, armazena e notifica central/cliente.
- **Saída:** coleta de comprovantes resiliente.

## Etapa 16 — Chat Tático & Alertas (Motoboy)

- Refazer painel deslizante com WS compartilhado.
- Adicionar toasts para eventos críticos (novo pedido, cancelamento, rota alterada).
- **Saída:** comunicação tática 1:1 e broadcast.

## Etapa 17 — Agenda/Schedule do Motoboy

- Modal para turnos, persistência em `motoboy_schedules`, reflexo na central.
- **Saída:** escala sincronizada em tempo real.

## Etapa 18 — Telemetria & Observabilidade

- Instrumentar métricas de carregamento, erros, latência WS.
- Criar dashboards de monitoramento e alertas básicos.
- **Saída:** insights operacionais antes de GA.

## Etapa 19 — Testes Automatizados + QA Manual

- Unit + integration (Vitest) cobrindo PF/PJ, pedidos, WS handlers.
- E2E (Playwright/Cypress) pros três perfis.
- **Saída:** test suite verde e checklist QA assinado.

## Etapa 20 — Rollout Controlado e Retrospectiva

- Habilitar feature flags gradualmente (cliente → motoboy → central).
- Monitorar métricas, coletar feedback, registrar lições aprendidas.
- **Saída:** projeto em produção com paridade total e post-mortem documentado.
