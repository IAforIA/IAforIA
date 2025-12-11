# Stub: Upload de LiveDocs

Objetivo: receber arquivo de comprovante vinculado a pedido.

## Rota completa (modelo)

```ts
router.post("/api/upload/live-doc", authenticateToken, upload.single("file"), uploadLiveDocController);
```

## Controller (exemplo)

```ts
async function uploadLiveDocController(req, res) {
  const { orderId } = req.body;
  const file = req.file;

  if (!orderId) {
    return res.status(400).json({ error: "orderId obrigatorio" });
  }
  if (!file) {
    return res.status(400).json({ error: "arquivo obrigatorio" });
  }

  // stub: nao salva arquivo real
  return res.status(201).json({
    orderId,
    fileName: file.originalname ?? "comprovante.jpg",
    url: "https://stub.local/live-docs/comprovante.jpg",
    uploadedAt: new Date().toISOString()
  });
}
```

## Validacao simples

- Body multipart: campo `file` (binario) e `orderId` (string) obrigatorios.
- Tamanho/formatos checados pelo middleware real (nao incluso aqui).

## Resposta JSON (exemplo)

```json
{
  "orderId": "ord_789",
  "fileName": "comprovante.jpg",
  "url": "https://stub.local/live-docs/comprovante.jpg",
  "uploadedAt": "2025-12-08T12:00:00.000Z"
}
```
