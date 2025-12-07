# GET {{API_URL}}/api/v1/analytics/motoboy/:id?start=2024-11-01&end=2024-11-30

Calculate motoboy earnings for date range.

**Auth:** Motoboy (own data) or Central (any)
**Query Params:**
- `start`: ISO date (YYYY-MM-DD)
- `end`: ISO date (YYYY-MM-DD)

**Calculation:**
Sum of `taxaMotoboy` from all delivered orders in period

## Request

```
GET {{API_URL}}/api/v1/analytics/motoboy/:id?start=2024-11-01&end=2024-11-30
```

## Responses

### 200 OK

```json
{
  "motoboyId": "motoboy-1",
  "motoboyName": "João Silva",
  "period": {
    "start": "2024-11-01",
    "end": "2024-11-30"
  },
  "deliveries": 87,
  "totalEarnings": "783.00",
  "averagePerDelivery": "9.00"
}
```
