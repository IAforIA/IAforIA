# Stub: Relatorios (motoboy, cliente, company)

Objetivo: fornecer dados agregados para cada perfil.

## Rotas completas (modelo)

```ts
router.get("/api/reports/motoboys/:id", authenticateToken, requireRole("central", "motoboy"), getMotoboyReportController);
router.get("/api/reports/clients/:id", authenticateToken, requireRole("central", "client"), getClientReportController);
router.get("/api/reports/company", authenticateToken, requireRole("central"), getCompanyReportController);
```

## Controller motoboy (exemplo)

```ts
async function getMotoboyReportController(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id obrigatorio" });
  return res.status(200).json({
    motoboyId: id,
    delivered: 18,
    canceled: 2,
    earnings: 540.5,
    avgResponseSec: 55
  });
}
```

## Controller cliente (exemplo)

```ts
async function getClientReportController(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id obrigatorio" });
  return res.status(200).json({
    clientId: id,
    ordersTotal: 34,
    active: 3,
    canceled: 1,
    spend: 3120.75
  });
}
```

## Controller company (exemplo)

```ts
async function getCompanyReportController(req, res) {
  return res.status(200).json({
    period: { from: req.query.from ?? "2025-12-01", to: req.query.to ?? "2025-12-08" },
    orders: { total: 120, delivered: 110, canceled: 10 },
    revenue: 18200.4,
    topClients: [ { id: "c_1", name: "Cliente A", spend: 5200 } ],
    topDrivers: [ { id: "m_2", name: "Motoboy B", delivered: 26 } ]
  });
}
```

## Validacao simples

- Params `id` obrigatorio para rotas de motoboy/cliente.
- Query `from`/`to` opcionais (ISO) para filtros.

## Resposta JSON (exemplo motoboy)

```json
{
  "motoboyId": "m_123",
  "delivered": 18,
  "canceled": 2,
  "earnings": 540.5,
  "avgResponseSec": 55
}
```

## Resposta JSON (exemplo cliente)

```json
{
  "clientId": "c_456",
  "ordersTotal": 34,
  "active": 3,
  "canceled": 1,
  "spend": 3120.75
}
```

## Resposta JSON (exemplo company)

```json
{
  "period": { "from": "2025-12-01", "to": "2025-12-08" },
  "orders": { "total": 120, "delivered": 110, "canceled": 10 },
  "revenue": 18200.4,
  "topClients": [ { "id": "c_1", "name": "Cliente A", "spend": 5200 } ],
  "topDrivers": [ { "id": "m_2", "name": "Motoboy B", "delivered": 26 } ]
}
```
