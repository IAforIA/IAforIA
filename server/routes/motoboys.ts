import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { storage } from '../storage.ts';
import { getOnlineUsers, broadcast } from '../ws/broadcast.js';

export function buildMotoboysRouter() {
  const router = Router();

  router.get('/users/online', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const onlineUserIds = getOnlineUsers();
      console.log('🔌 Usuários online via WebSocket:', onlineUserIds);
      res.json({ onlineUsers: onlineUserIds });
    } catch (error) {
      console.error('❌ Erro ao buscar usuários online:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários online' });
    }
  });

  router.get('/motoboys', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const motoboys = await storage.getAllMotoboys();
      res.json(motoboys);
    } catch (error) {
      console.error('Erro ao buscar motoboys', error);
      res.status(500).json({ error: 'Erro ao buscar motoboys' });
    }
  });

  // Últimas localizações conhecidas dos motoboys (mapa tempo real)
  router.get('/motoboys/locations/latest', authenticateToken, requireRole('central'), async (_req, res) => {
    try {
      const latest = await storage.getLatestMotoboyLocations();
      // storage returns Map; expor como array para o front
      res.json({ locations: Array.from(latest.values()) });
    } catch (error) {
      console.error('Erro ao buscar localizações de motoboys', error);
      res.status(500).json({ error: 'Erro ao buscar localizações de motoboys' });
    }
  });

  // Perfil do motoboy logado
  router.get('/motoboys/me', authenticateToken, requireRole('motoboy'), async (req, res) => {
    try {
      const motoboy = await storage.getMotoboy(req.user!.id);
      if (!motoboy) return res.status(404).json({ error: 'Motoboy não encontrado' });
      res.json(motoboy);
    } catch (error) {
      console.error('Erro ao buscar perfil do motoboy', error);
      res.status(500).json({ error: 'Erro ao buscar perfil do motoboy' });
    }
  });

  // Motoboy atualiza seu cadastro (endereço/documentos/banco)
  // IMPORTANTE: Esta rota deve vir ANTES de /motoboys/:id para evitar conflito
  router.patch('/motoboys/me', authenticateToken, requireRole('motoboy'), async (req, res) => {
    try {
      const updated = await storage.updateMotoboy(req.user!.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('💥 Erro ao motoboy atualizar cadastro:', error);
      res.status(500).json({ error: 'Erro ao atualizar cadastro do motoboy' });
    }
  });

  router.patch('/motoboys/:id/online', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const { online } = req.body;
      if (typeof online !== 'boolean') {
        return res.status(400).json({ error: "Campo 'online' deve ser boolean" });
      }
      await storage.updateMotoboyOnlineStatus(id, online);
      res.json({ success: true, id, online });
    } catch (error) {
      console.error('Erro ao atualizar status online do motoboy', error);
      res.status(500).json({ error: 'Erro ao atualizar status online' });
    }
  });

  router.post('/motoboys', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const motoboy = await storage.createMotoboy(req.body);
      res.status(201).json(motoboy);
    } catch (error: any) {
      console.error('💥 Erro ao criar motoboy:', error);
      res.status(500).json({ error: 'Erro ao criar motoboy' });
    }
  });

  router.patch('/motoboys/:id', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateMotoboy(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar motoboy:', error);
      res.status(500).json({ error: 'Erro ao atualizar motoboy' });
    }
  });

  // Lista schedules de um motoboy (central ou o próprio motoboy)
  router.get('/motoboys/:id/schedules', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.user!.role !== 'central' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      const schedules = await storage.getMotoboySchedules(id);
      res.json(schedules);
    } catch (error: any) {
      console.error('💥 Erro ao buscar schedules do motoboy:', error);
      res.status(500).json({ error: 'Erro ao buscar schedules do motoboy' });
    }
  });

  // Upsert schedule de um motoboy (central ou o próprio motoboy)
  router.post('/motoboys/:id/schedules', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.user!.role !== 'central' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      const { diaSemana, turnoManha, turnoTarde, turnoNoite } = req.body;
      if (typeof diaSemana !== 'number') {
        return res.status(400).json({ error: 'diaSemana obrigatório (0-6)' });
      }

      const result = await storage.upsertMotoboySchedule(
        id,
        diaSemana,
        Boolean(turnoManha),
        Boolean(turnoTarde),
        Boolean(turnoNoite)
      );

      res.json({ success: true, schedule: result });
    } catch (error: any) {
      console.error('💥 Erro ao salvar schedule do motoboy:', error);
      res.status(500).json({ error: 'Erro ao salvar schedule do motoboy' });
    }
  });

  return router;
}
