# README dos Stubs (local_fixes/stubs)

Arquivos sao modelos seguros para futuras implementacoes. Nada aqui toca o codigo real.

## O que cada stub faz

- `patch-users-id.stub.md`: modelo de rota PATCH `/api/users/:id` para atualizar nome/role/status.
- `get-clients-id-schedules.stub.md`: modelo GET `/api/clients/:id/schedules` para listar agendas do cliente.
- `availability-insights.stub.md`: modelo GET `/api/reports/availability-insights` com janelas e disponibilidade.
- `upload-livedocs.stub.md`: modelo POST `/api/upload/live-doc` para anexar comprovantes.
- `reports.stub.md`: modelos de relatorios de motoboy, cliente e company.
- `websocket-events.stub.md`: exemplos de eventos WebSocket e payloads.

## Onde aplicar no projeto real

- Rotas backend em `server/routes/*.ts` com imports `.js` conforme padrao ESM do repo.
- Controllers em `server/controllers/*` ou no mesmo arquivo de rota, seguindo storage/servicos reais.
- Validacao pode usar Zod/express-validator alinhado ao padrao atual.

## Como aplicar manualmente depois

1) Copiar a rota do stub para o arquivo de rotas real e ajustar import/export com extensao `.js`.
2) Implementar controller usando `storage` ou Drizzle conforme necessidade.
3) Substituir dados mock por queries reais; adicionar autenticao `authenticateToken` e `requireRole`.
4) Ajustar validacao com schemas (Zod) e adicionar tests se existentes.

## Riscos se aplicar errado

- Ausencia de validacao pode expor dados ou quebrar contratos de API.
- Falha em usar `.js` nas imports no servidor pode quebrar resolucao de modulo.
- Respostas fora do formato esperado podem quebrar frontend ou integrações.
- Faltas de checks de role podem permitir acesso indevido.

Stubs criados com segurança.
