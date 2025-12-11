# Stub: PATCH /api/users/:id

Objetivo: atualizar usuario (nome/role/status) de forma segura.

## Rota completa (modelo)

```ts
router.patch("/api/users/:id", authenticateToken, requireRole("central"), patchUserController);
```

## Controller (exemplo)

```ts
async function patchUserController(req, res) {
  const { id } = req.params;
  const { name, role, status } = req.body;

  if (!id) {
    return res.status(400).json({ error: "id obrigatorio" });
  }
  if (!role) {
    return res.status(400).json({ error: "role obrigatorio" });
  }

  // stub: sem acesso a DB
  return res.status(200).json({
    id,
    name: name ?? "Nome Exemplo",
    role,
    status: status ?? "active",
    updatedAt: new Date().toISOString()
  });
}
```

## Validacao simples

- `id` vindo de `req.params` obrigatorio.
- `role` string obrigatoria ("client" | "central" | "motoboy").
- `status` opcional ("active" | "inactive").

## Resposta JSON (exemplo)

```json
{
  "id": "u_123",
  "name": "Nome Exemplo",
  "role": "central",
  "status": "active",
  "updatedAt": "2025-12-08T12:00:00.000Z"
}
```
