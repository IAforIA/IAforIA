import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import { storage } from '../storage.ts';
import { geocodeAddress, buildFullAddress, geocodeBatch } from '../services/geocoding.js';

export function buildClientsRouter() {
  const router = Router();

  router.get('/clients', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error('💥 Erro ao criar cliente:', error);
      const message = error instanceof Error ? error.message : 'Erro ao criar cliente';
      if (message === 'EMAIL_IN_USE') {
        return res.status(409).json({ error: 'Email já cadastrado' });
      }
      if (message === 'DOCUMENT_IN_USE') {
        return res.status(409).json({ error: 'Documento já cadastrado' });
      }
      res.status(500).json({ error: message });
    }
  });

  router.patch('/clients/:id', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await storage.updateClient(id, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error('💥 Erro ao atualizar cliente:', error);
      res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
  });

  // Horários de funcionamento do cliente (somente central ou o próprio cliente)
  router.get('/clients/:id/schedules', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      if (req.user!.role !== 'central' && req.user!.id !== id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      const schedules = await storage.getClientSchedule(id);
      res.json(schedules);
    } catch (error: unknown) {
      console.error('💥 Erro ao buscar horários do cliente:', error);
      res.status(500).json({ error: 'Erro ao buscar horários do cliente' });
    }
  });

  // Permite cliente autenticado atualizar próprio cadastro (endereço/documentos)
  router.patch('/clients/me', authenticateToken, requireRole('client'), async (req, res) => {
    try {
      const clientId = req.user!.id;
      const updated = await storage.updateClient(clientId, req.body);
      res.json(updated);
    } catch (error: unknown) {
      console.error('💥 Erro ao o cliente atualizar seu cadastro:', error);
      res.status(500).json({ error: 'Erro ao atualizar cadastro do cliente' });
    }
  });

  // Geocodifica um cliente específico (atualiza geoLat/geoLng no banco)
  router.post('/clients/:id/geocode', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClientById(id);
      
      if (!client) {
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      if (!client.rua && !client.bairro) {
        return res.status(400).json({ error: 'Cliente não possui endereço cadastrado' });
      }

      const address = buildFullAddress({
        rua: client.rua,
        numero: client.numero,
        bairro: client.bairro,
        cep: client.cep,
      });

      console.log(`[Geocoding] Geocodificando cliente "${client.name}": ${address}`);
      
      const result = await geocodeAddress(address);
      
      if (!result.success || result.lat === null || result.lng === null) {
        return res.status(422).json({ 
          error: 'Não foi possível geocodificar o endereço', 
          details: result.error,
          address,
        });
      }

      // Atualiza cliente com coordenadas
      const updated = await storage.updateClient(id, {
        geoLat: result.lat.toString(),
        geoLng: result.lng.toString(),
      });

      res.json({
        success: true,
        client: updated,
        geocoding: {
          address,
          lat: result.lat,
          lng: result.lng,
          displayName: result.displayName,
        },
      });
    } catch (error: unknown) {
      console.error('💥 Erro ao geocodificar cliente:', error);
      res.status(500).json({ error: 'Erro ao geocodificar cliente' });
    }
  });

  // Geocodifica TODOS os clientes sem coordenadas (operação em lote)
  router.post('/clients/geocode-all', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const allClients = await storage.getAllClients();
      
      // Filtra clientes sem coordenadas e com endereço
      const clientsToGeocode = allClients.filter(
        (c) => (!c.geoLat || !c.geoLng) && (c.rua || c.bairro)
      );

      if (clientsToGeocode.length === 0) {
        return res.json({
          success: true,
          message: 'Todos os clientes já possuem coordenadas ou não têm endereço',
          processed: 0,
          total: allClients.length,
        });
      }

      console.log(`[Geocoding] Iniciando geocodificação em lote de ${clientsToGeocode.length} clientes...`);
      
      const results = await geocodeBatch(clientsToGeocode);
      
      // Atualiza cada cliente com suas coordenadas
      let successCount = 0;
      let failCount = 0;
      const failures: Array<{ name: string; error: string }> = [];

      for (const [clientId, result] of results.entries()) {
        if (result.success && result.lat !== null && result.lng !== null) {
          await storage.updateClient(clientId, {
            geoLat: result.lat.toString(),
            geoLng: result.lng.toString(),
          });
          successCount++;
        } else {
          const client = clientsToGeocode.find((c) => c.id === clientId);
          failures.push({
            name: client?.name || clientId,
            error: result.error || 'Endereço não encontrado',
          });
          failCount++;
        }
      }

      console.log(`[Geocoding] Concluído: ${successCount} sucesso, ${failCount} falhas`);

      res.json({
        success: true,
        processed: clientsToGeocode.length,
        successCount,
        failCount,
        failures,
        total: allClients.length,
      });
    } catch (error: unknown) {
      console.error('💥 Erro na geocodificação em lote:', error);
      res.status(500).json({ error: 'Erro na geocodificação em lote' });
    }
  });

  return router;
}
