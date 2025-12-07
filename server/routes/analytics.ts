import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.ts';
import * as analytics from '../analytics.ts';

export function buildAnalyticsRouter() {
  const router = Router();

  router.get('/analytics/dashboard', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const kpis = await analytics.getDashboardKPIs();
      res.json(kpis);
    } catch (error) {
      console.error('💥 Erro ao buscar KPIs:', error);
      res.status(500).json({ error: 'Erro ao buscar KPIs' });
    }
  });

  router.get('/analytics/revenue', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const { start, end } = req.query as any;
      const startDate = start ? new Date(String(start)) : new Date(0);
      const endDate = end ? new Date(String(end)) : new Date();
      const revenueData = await analytics.getRevenueByDateRange(startDate, endDate);
      res.json(revenueData);
    } catch (error) {
      console.error('💥 Erro ao buscar revenue:', error);
      res.status(500).json({ error: 'Erro ao buscar revenue' });
    }
  });

  router.get('/analytics/motoboy/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { start, end } = req.query as any;
      const startDate = start ? new Date(String(start)) : new Date(0);
      const endDate = end ? new Date(String(end)) : new Date();
      const earnings = await analytics.getMotoboyEarnings(id, startDate, endDate);
      res.json(earnings);
    } catch (error) {
      console.error('💥 Erro ao buscar earnings do motoboy:', error);
      res.status(500).json({ error: 'Erro ao buscar earnings do motoboy' });
    }
  });

  router.get('/analytics/client/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const { month } = req.query as any;
      const monthStr = month ? String(month) : (new Date()).toISOString().slice(0,7); // default to current month YYYY-MM
      const debtData = await analytics.getClientDebt(id, monthStr);
      res.json(debtData);
    } catch (error) {
      console.error('💥 Erro ao buscar débito do cliente:', error);
      res.status(500).json({ error: 'Erro ao buscar débito do cliente' });
    }
  });

  router.get('/analytics/mrr', authenticateToken, requireRole('central'), async (req, res) => {
    try {
      const mrr = await analytics.getMonthlyRecurringRevenue();
      res.json({ mrr });
    } catch (error) {
      console.error('💥 Erro ao buscar MRR:', error);
      res.status(500).json({ error: 'Erro ao buscar MRR' });
    }
  });

  return router;
}
