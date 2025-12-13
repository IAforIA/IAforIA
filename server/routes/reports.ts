import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import * as ReportsLib from '../reports.ts';
import { assertUserCanAccess } from '../utils/role-validator.ts';
import logger from '../logger.js';

export function buildReportsRouter() {
  const router = Router();

  router.get('/company', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      logger.info('report_company_accessed', { userId: req.user!.id, role: req.user!.role, filters: req.query });
      const filters = ReportsLib.parseFilters(req.query);
      const report = await ReportsLib.getCompanyReport(filters, req.user!.role as 'central' | 'client' | 'motoboy');
      logger.info('report_company_generated', { userId: req.user!.id, ordersCount: report.summary.totalOrders });
      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('report_company_error', { userId: req.user?.id, message: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro ao gerar relatório da empresa' });
    }
  });

  router.get('/clients/:clientId', authenticateToken, async (req, res) => {
    try {
      const { clientId } = req.params;
      if (!clientId) return res.status(400).json({ success: false, error: 'clientId inválido' });
      const accessCheck = assertUserCanAccess(clientId, req.user!.id, req.user!.role as 'central' | 'client' | 'motoboy');
      if (!accessCheck.allowed) {
        logger.warn('access_denied_client_report', { userId: req.user!.id, role: req.user!.role, attemptedResource: clientId, reason: accessCheck.reason });
        return res.status(403).json({ success: false, error: accessCheck.reason || 'Acesso negado', code: 'FORBIDDEN' });
      }
      logger.info('report_client_accessed', { userId: req.user!.id, role: req.user!.role, clientId, filters: req.query });
      const filters = ReportsLib.parseFilters(req.query);
      const report = await ReportsLib.getClientReport(clientId, filters, req.user!.role as 'central' | 'client' | 'motoboy', req.user!.id);
      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('report_client_error', { userId: req.user?.id, clientId: req.params.clientId, message: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });
      if (error instanceof Error && error.message.includes('Acesso negado')) return res.status(403).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro ao gerar relatório do cliente' });
    }
  });

  const handleMotoboyReport = async (req: Request, res: Response) => {
    try {
      const { motoboyId } = req.params;
      if (!motoboyId) return res.status(400).json({ success: false, error: 'motoboyId inválido' });
      const accessCheck = assertUserCanAccess(motoboyId, req.user!.id, req.user!.role as 'central' | 'client' | 'motoboy');
      if (!accessCheck.allowed) {
        logger.warn('access_denied_motoboy_report', { userId: req.user!.id, role: req.user!.role, attemptedResource: motoboyId, reason: accessCheck.reason });
        return res.status(403).json({ success: false, error: accessCheck.reason || 'Acesso negado', code: 'FORBIDDEN' });
      }
      logger.info('report_motoboy_accessed', { userId: req.user!.id, role: req.user!.role, motoboyId, filters: req.query });
      const filters = ReportsLib.parseFilters(req.query);
      const report = await ReportsLib.getMotoboyReport(motoboyId, filters, req.user!.role as 'central' | 'client' | 'motoboy', req.user!.id);
      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('report_motoboy_error', { userId: req.user?.id, motoboyId: req.params.motoboyId, message: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });
      if (error instanceof Error && error.message.includes('Acesso negado')) return res.status(403).json({ success: false, error: error.message });
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro ao gerar relatório do motoboy' });
    }
  };

  router.get('/motoboys/:motoboyId', authenticateToken, handleMotoboyReport);

  // Alias para compatibilidade com front: /api/reports/motoboys/:id
  router.get('/reports/motoboys/:motoboyId', authenticateToken, handleMotoboyReport);

  router.get('/orders', authenticateToken, async (req, res) => {
    try {
      logger.info('report_orders_accessed', { userId: req.user!.id, role: req.user!.role, filters: req.query });
      const filters = ReportsLib.parseFilters(req.query);
      const report = await ReportsLib.getOrdersReport(filters, req.user!.role as 'central' | 'client' | 'motoboy', req.user!.id);
      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('report_orders_error', { userId: req.user?.id, message: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Erro ao gerar relatório de pedidos' });
    }
  });

  return router;
}
