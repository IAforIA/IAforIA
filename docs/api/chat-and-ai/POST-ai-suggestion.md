# POST {{API_URL}}/api/v1/chat/ai-suggest

Generate AI-powered response suggestion for chat thread.

**Auth:** Central only
**AI Model:** GPT-4 Turbo
**Context:** Last 10 messages of thread
**Cost Tracking:** Logged in usage_stats table

**Returns:**
- Suggested response text
- Confidence score
- Token usage

## Request

```
POST {{API_URL}}/api/v1/chat/ai-suggest
```
### Headers

| Key | Value |
|-----|-------|
| Content-Type | application/json |

### Body

```json
{
  "threadId": "thread-uuid-123"
}
```


## Responses

### 200 OK

```json
{
  "suggestion": "Seu pedido está a caminho! Previsão de chegada em 15 minutos.",
  "confidence": 0.92,
  "usage": {
    "promptTokens": 150,
    "completionTokens": 25,
    "totalCost": 0.0023
  }
}
```
