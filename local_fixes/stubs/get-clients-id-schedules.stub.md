# Stub: GET /api/clients/:id/schedules

Objetivo: retornar horarios/agendamentos do cliente.

## Rota completa (modelo)

```ts
router.get("/api/clients/:id/schedules", authenticateToken, requireRole("central", "client"), getClientSchedulesController);
```

## Controller (exemplo)

```ts
async function getClientSchedulesController(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "id obrigatorio" });
  }

  // stub: sem DB
  const schedules = [
    { id: "sch_1", clientId: id, day: "2025-12-09", window: "09:00-12:00" },
    { id: "sch_2", clientId: id, day: "2025-12-10", window: "14:00-18:00" }
  ];

  return res.status(200).json({ clientId: id, schedules });
}
```

## Validacao simples

- `id` em params obrigatorio.
- Opcional: query `from`/`to` ISO strings.

## Resposta JSON (exemplo)

```json
{
  "clientId": "c_456",
  "schedules": [
    { "id": "sch_1", "clientId": "c_456", "day": "2025-12-09", "window": "09:00-12:00" },
    { "id": "sch_2", "clientId": "c_456", "day": "2025-12-10", "window": "14:00-18:00" }
  ]
}
```
