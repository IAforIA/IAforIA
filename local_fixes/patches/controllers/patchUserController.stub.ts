// PATCH /api/users/:id controller stub (local-only). Adapt imports to your project.
// TODO: replace `usersService.updateUser` import/path according to your codebase.
import type { Request, Response } from 'express';
// import { usersService } from '../services/usersService'; // TODO: real path

const ALLOWED_FIELDS = ['name', 'phone', 'address', 'avatarUrl'] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

type PatchUserPayload = Partial<Record<AllowedField, string>>;

function sanitizePayload(body: any): PatchUserPayload {
  const payload: PatchUserPayload = {};
  ALLOWED_FIELDS.forEach((key) => {
    const value = body?.[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      // basic length guard; adjust as needed per field
      if (value.length > 255) return;
      payload[key] = value.trim();
    }
  });
  return payload;
}

export async function patchUserController(req: Request, res: Response) {
  const { id } = req.params;
  const payload = sanitizePayload(req.body);

  if (!id) return res.status(400).json({ error: 'user id requerido' });
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo permitido informado' });
  }

  try {
    // TODO: replace with actual call
    // const updated = await usersService.updateUser(id, payload);
    const updated = { id, ...payload }; // placeholder to allow wiring without runtime crash in stub
    return res.status(200).json(updated);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erro ao atualizar usuário' });
  }
}
