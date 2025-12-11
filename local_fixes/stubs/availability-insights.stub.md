# Stub: AvailabilityInsights

Objetivo: expor disponibilidade de motoboys/clientes por janela de tempo.

## Rota completa (modelo)

```ts
router.get("/api/reports/availability-insights", authenticateToken, requireRole("central"), getAvailabilityInsightsController);
```

## Controller (exemplo)

```ts
async function getAvailabilityInsightsController(req, res) {
  const { from, to } = req.query;
  // Validacao simples
  if (!from || !to) {
    return res.status(400).json({ error: "from e to obrigatorios (ISO)" });
  }

  // stub data
  const availability = {
    windows: [
      { window: "09:00-12:00", driversAvailable: 12, avgResponseSec: 45 },
      { window: "12:00-15:00", driversAvailable: 8, avgResponseSec: 70 },
      { window: "15:00-18:00", driversAvailable: 15, avgResponseSec: 40 }
    ],
    busiestWindow: "12:00-15:00"
  };

  return res.status(200).json({ from, to, availability });
}
```

## Validacao simples

- Query `from` e `to` obrigatorias em ISO string.
- Opcional: `region`, `clientId` para filtro.

## Resposta JSON (exemplo)

```json
{
  "from": "2025-12-08T00:00:00Z",
  "to": "2025-12-08T23:59:59Z",
  "availability": {
    "windows": [
      { "window": "09:00-12:00", "driversAvailable": 12, "avgResponseSec": 45 },
      { "window": "12:00-15:00", "driversAvailable": 8, "avgResponseSec": 70 },
      { "window": "15:00-18:00", "driversAvailable": 15, "avgResponseSec": 40 }
    ],
    "busiestWindow": "12:00-15:00"
  }
}
```
