// Compatibility wrapper for GET /api/clients/:id/schedules
// Delegates to aggregate schedule service then filters by clientId.
// TODO: wire real imports for auth and schedules service.
import { Router } from 'express';
// import { authenticateToken, requireRole } from '../../middleware/auth';
// import { schedulesService } from '../../services/schedulesService';

export function registerClientSchedulesWrapper() {
  const router = Router();

  router.get('/clients/:id/schedules', /* authenticateToken, */ async (req, res) => {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'client id requerido' });

    try {
      // Prefer calling service to avoid double HTTP hop
      // const all = await schedulesService.getAllClientSchedules();
      const all: any[] = []; // placeholder
      const filtered = all.filter((item: any) => item.clientId === id);
      return res.json(filtered);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Erro ao buscar horários do cliente' });
    }
  });

  return router;
}
