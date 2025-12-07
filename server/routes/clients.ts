import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { storage } from '../storage.ts';

export function buildClientsRouter() {
  const router = Router();

  router.get('/clients', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error: any) {
      console.error('💥 Erro ao buscar clientes:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
  });

  router.post('/clients', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { password, ...payload } = req.body;
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const profile = await storage.createClientWithUser(payload, passwordHash);
      res.status(201).json(profile);
    } catch (error: any) {
      console.error('💥 Erro ao criar cliente:', error);
      if (error.message === 'EMAIL_IN_USE') {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }
      if (error.message === 'DOCUMENT_IN_USE') {
        return res.status(409).json({ error: 'Documento já cadastrado' });
      }
      res.status(500).json({ error: error.message || 'Erro ao criar cliente' });
    }
  });

  router.patch('/clients/:id', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateClient(id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('💥 Erro ao atualizar cliente:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  });

  // Permite cliente autenticado atualizar próprio cadastro (endereço/documentos)
  router.patch('/clients/me', authenticateToken, requireRole('client'), async (req, res) => {
    try {
      const clientId = req.user!.id;
      const updated = await storage.updateClient(clientId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('💥 Erro ao o cliente atualizar seu cadastro:', error);
      res.status(500).json({ error: 'Erro ao atualizar cadastro do cliente' });
    }
  });

  return router;
}
