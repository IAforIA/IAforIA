# GET {{API_URL}}/api/v1/analytics/dashboard

Central dashboard Key Performance Indicators.

**Auth:** Central only
**Metrics:**
- Total orders (today, this month)
- Revenue breakdown
- Active motoboys count
- Average delivery time
- Top performing drivers
- Pending orders count

## Request

```
GET {{API_URL}}/api/v1/analytics/dashboard
```

## Responses

### 200 OK

```json
{
  "today": {
    "totalOrders": 45,
    "revenue": "675.00",
    "averageDeliveryTime": "28min"
  },
  "thisMonth": {
    "totalOrders": 1230,
    "revenue": "18450.00",
    "topMotoboy": {
      "name": "João Silva",
      "deliveries": 87
    }
  },
  "activeMotoboys": 12,
  "pendingOrders": 3
}
```
