import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { storage } from '../storage.ts';

export function buildUsersRouter() {
  const router = Router();

  router.get('/users', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: any) {
      console.error('💥 Erro ao buscar usuários:', error);
      res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
  });

  router.patch('/users/:id/status', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // SEGURANÇA: Não pode desativar a si mesmo
      if (req.user?.id === id) {
        return res.status(403).json({ error: 'Você não pode desativar sua própria conta' });
      }

      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: "Status deve ser 'active' ou 'inactive'" });
      }

      const updated = await storage.updateUser(id, { status });
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar status do usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar status do usuário' });
    }
  });

  router.patch('/users/:id/role', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['client', 'motoboy', 'central'].includes(role)) {
        return res.status(400).json({ error: "Role deve ser 'client', 'motoboy' ou 'central'" });
      }

      // SEGURANÇA: Não altera o próprio papel para evitar lock-out acidental
      if (req.user?.id === id) {
        return res.status(403).json({ error: 'Você não pode alterar seu próprio papel' });
      }

      const updated = await storage.updateUser(id, { role });
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar role do usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar role do usuário' });
    }
  });

  return router;
}
