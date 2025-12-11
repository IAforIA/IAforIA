// Route registration stub for PATCH /api/users/:id (local-only).
// TODO: adjust import paths for auth middleware and controller.
import { Router } from 'express';
// import { authenticateToken, requireRole } from '../../middleware/auth';
// import { patchUserController } from '../controllers/patchUserController';

export function registerPatchUserRoute() {
  const router = Router();

  // Uses same middleware pattern as other user routes (central-only by default).
  // If clients/motoboys should update self, swap to authenticateToken + role check as desired.
  router.patch('/users/:id', /* authenticateToken, requireRole('central'), */ (req, res) => {
    // patchUserController(req, res);
    res.status(501).json({ error: 'stub - wire patchUserController here' });
  });

  return router;
}
