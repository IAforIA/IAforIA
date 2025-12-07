import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { storage } from '../storage.ts';

export function buildSchedulesRouter() {
  const router = Router();

  // Retorna todos os horários de funcionamento dos clientes
  router.get('/schedules/all-clients', authenticateToken, requireRole('central'), async (_req, res) => {
    try {
      const schedules = await storage.getAllClientSchedules();
      res.json(schedules);
    } catch (error: any) {
      console.error('💥 Erro ao buscar horários de clientes:', error);
      res.status(500).json({ error: 'Erro ao buscar horários de clientes' });
    }
  });

  // Retorna todos os horários/turnos dos motoboys
  router.get('/schedules/all-motoboys', authenticateToken, requireRole('central'), async (_req, res) => {
    try {
      const schedules = await storage.getAllMotoboySchedules();
      res.json(schedules);
    } catch (error: any) {
      console.error('💥 Erro ao buscar horários de motoboys:', error);
      res.status(500).json({ error: 'Erro ao buscar horários de motoboys' });
    }
  });

  return router;
}
