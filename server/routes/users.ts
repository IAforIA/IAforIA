import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { storage } from '../storage.ts';
import bcrypt from 'bcryptjs';

export function buildUsersRouter() {
  const router = Router();

  router.get('/users', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error: unknown) {
      console.error('Erro ao buscar usuarios:', error);
      res.status(500).json({ error: 'Erro ao buscar usuarios' });
    }
  });

  // PATCH /api/users/:id - Atualiza perfil do proprio usuario (nome, telefone, senha)
  router.patch('/users/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, password } = req.body;

      // SEGURANCA: Usuario so pode editar seu proprio perfil, exceto central
      if (req.user?.id !== id && req.user?.role !== 'central') {
        return res.status(403).json({ error: 'Voce so pode editar seu proprio perfil' });
      }

      // Construir objeto de atualizacao com campos permitidos
      const updateData: { name?: string; phone?: string; password?: string } = {};
      
      if (name && typeof name === 'string' && name.trim().length >= 3) {
        updateData.name = name.trim();
      }
      
      if (phone && typeof phone === 'string') {
        updateData.phone = phone.trim();
      }
      
      // Se senha for fornecida, fazer hash
      if (password && typeof password === 'string' && password.length >= 8) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Nenhum campo valido para atualizar' });
      }

      const updated = await storage.updateUser(id, updateData);
      if (!updated) {
        return res.status(404).json({ error: 'Usuario nao encontrado' });
      }
      
      const { password: _, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: unknown) {
      console.error('Erro ao atualizar usuario:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuario' });
    }
  });

  router.patch('/users/:id/status', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // SEGURANCA: Nao pode desativar a si mesmo
      if (req.user?.id === id) {
        return res.status(403).json({ error: 'Voce nao pode desativar sua propria conta' });
      }

      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({ error: "Status deve ser 'active' ou 'inactive'" });
      }

      const updated = await storage.updateUser(id, { status });
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: unknown) {
      console.error('Erro ao atualizar status do usuario:', error);
      res.status(500).json({ error: 'Erro ao atualizar status do usuario' });
    }
  });

  router.patch('/users/:id/role', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['client', 'motoboy', 'central'].includes(role)) {
        return res.status(400).json({ error: "Role deve ser 'client', 'motoboy' ou 'central'" });
      }

      // SEGURANCA: Nao altera o proprio papel para evitar lock-out acidental
      if (req.user?.id === id) {
        return res.status(403).json({ error: 'Voce nao pode alterar seu proprio papel' });
      }

      const updated = await storage.updateUser(id, { role });
      const { password, ...userWithoutPassword } = updated;
      res.json(userWithoutPassword);
    } catch (error: unknown) {
      console.error('Erro ao atualizar role do usuario:', error);
      res.status(500).json({ error: 'Erro ao atualizar role do usuario' });
    }
  });

  return router;
}