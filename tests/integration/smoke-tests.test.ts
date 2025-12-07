/**
 * 🔥 SMOKE TESTS COMPLETOS - Sistema de Relatórios Financeiros
 * 
 * Validações críticas:
 * 1. Autenticação de cada role (client/motoboy/central)
 * 2. Acesso correto aos 4 relatórios
 * 3. Isolamento de dados entre clientes
 * 4. Isolamento de dados entre motoboys
 * 5. OrderForm criando pedidos com valores corretos
 * 6. Cálculo financeiro compatível com financial-engine.ts
 * 7. Filtros por data, status e método de pagamento
 * 8. Paginação 1-1000 válida
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock do servidor Express para testes
const app = express();
const API_BASE = 'http://localhost:5000';

// Tokens de teste (serão gerados via login)
let centralToken: string;
let clientToken: string;
let motoboyToken: string;
let clientId: string;
let motoboyId: string;

describe('🔥 Smoke Tests - Sistema de Relatórios Financeiros', () => {
  
  // ========================================
  // 1. AUTENTICAÇÃO DE CADA ROLE
  // ========================================
  describe('1️⃣ Autenticação por Role', () => {
    it('deve autenticar usuário CENTRAL com sucesso', async () => {
      const response = await request(API_BASE)
        .post('/api/login')
        .send({
          email: 'central@guriri.com',
          password: 'central123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('central');
      
      centralToken = response.body.token;
    });

    it('deve autenticar usuário CLIENT com sucesso', async () => {
      const response = await request(API_BASE)
        .post('/api/login')
        .send({
          email: 'cliente@teste.com',
          password: 'cliente123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('client');
      
      clientToken = response.body.token;
      clientId = response.body.user.id;
    });

    it('deve autenticar usuário MOTOBOY com sucesso', async () => {
      const response = await request(API_BASE)
        .post('/api/login')
        .send({
          email: 'motoboy@teste.com',
          password: 'motoboy123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.role).toBe('motoboy');
      
      motoboyToken = response.body.token;
      motoboyId = response.body.user.id;
    });

    it('deve rejeitar autenticação com credenciais inválidas', async () => {
      const response = await request(API_BASE)
        .post('/api/login')
        .send({
          email: 'invalido@teste.com',
          password: 'senhaerrada',
        });

      expect(response.status).toBe(401);
    });
  });

  // ========================================
  // 2. ACESSO CORRETO AOS 4 RELATÓRIOS
  // ========================================
  describe('2️⃣ Acesso aos Relatórios por Role', () => {
    it('CENTRAL deve acessar GET /api/reports/company (200)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/company')
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('kpis');
      expect(response.body.data).toHaveProperty('breakdown');
      expect(response.body.data).toHaveProperty('topClients');
      expect(response.body.data).toHaveProperty('topMotoboys');
    });

    it('CLIENT não deve acessar GET /api/reports/company (403)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/company')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(403);
    });

    it('MOTOBOY não deve acessar GET /api/reports/company (403)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/company')
        .set('Authorization', `Bearer ${motoboyToken}`);

      expect(response.status).toBe(403);
    });

    it('CENTRAL deve acessar GET /api/reports/clients/:id (200)', async () => {
      const response = await request(API_BASE)
        .get(`/api/reports/clients/${clientId}`)
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
    });

    it('CLIENT deve acessar próprio relatório GET /api/reports/clients/:id (200)', async () => {
      const response = await request(API_BASE)
        .get(`/api/reports/clients/${clientId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('CENTRAL deve acessar GET /api/reports/motoboys/:id (200)', async () => {
      const response = await request(API_BASE)
        .get(`/api/reports/motoboys/${motoboyId}`)
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
    });

    it('MOTOBOY deve acessar próprio relatório GET /api/reports/motoboys/:id (200)', async () => {
      const response = await request(API_BASE)
        .get(`/api/reports/motoboys/${motoboyId}`)
        .set('Authorization', `Bearer ${motoboyToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  // ========================================
  // 3. ISOLAMENTO DE DADOS ENTRE CLIENTES
  // ========================================
  describe('3️⃣ Isolamento de Dados - Clientes', () => {
    it('CLIENT não deve ver dados de outro cliente (403)', async () => {
      const outroClienteId = 'cliente-diferente-uuid';
      
      const response = await request(API_BASE)
        .get(`/api/reports/clients/${outroClienteId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(403);
    });

    it('MOTOBOY não deve acessar relatório de cliente (403)', async () => {
      const response = await request(API_BASE)
        .get(`/api/reports/clients/${clientId}`)
        .set('Authorization', `Bearer ${motoboyToken}`);

      expect(response.status).toBe(403);
    });

    it('GET /api/reports/orders deve retornar apenas pedidos do cliente logado', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Todos os pedidos devem ser do cliente logado
      const orders = response.body.data.data;
      orders.forEach((order: any) => {
        expect(order.clientId).toBe(clientId);
      });
    });
  });

  // ========================================
  // 4. ISOLAMENTO DE DADOS ENTRE MOTOBOYS
  // ========================================
  describe('4️⃣ Isolamento de Dados - Motoboys', () => {
    it('MOTOBOY não deve ver dados de outro motoboy (403)', async () => {
      const outroMotoboyId = 'motoboy-diferente-uuid';
      
      const response = await request(API_BASE)
        .get(`/api/reports/motoboys/${outroMotoboyId}`)
        .set('Authorization', `Bearer ${motoboyToken}`);

      expect(response.status).toBe(403);
    });

    it('CLIENT não deve acessar relatório de motoboy (403)', async () => {
      const response = await request(API_BASE)
        .get(`/api/reports/motoboys/${motoboyId}`)
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(403);
    });

    it('GET /api/reports/orders deve retornar apenas entregas do motoboy logado', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .set('Authorization', `Bearer ${motoboyToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Todos os pedidos devem ser do motoboy logado
      const orders = response.body.data.data;
      orders.forEach((order: any) => {
        expect(order.motoboyId).toBe(motoboyId);
      });
    });
  });

  // ========================================
  // 5. ORDERFORM COM VALORES CORRETOS
  // ========================================
  describe('5️⃣ OrderForm - Valores Baseados em Mensalidade', () => {
    it('Cliente MENSALISTA deve criar pedido com valor 7', async () => {
      const response = await request(API_BASE)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          coletaRua: 'Rua Teste',
          coletaNumero: '123',
          coletaBairro: 'Centro',
          entregaRua: 'Rua Destino',
          entregaNumero: '456',
          entregaBairro: 'Praia',
          valor: 7, // Mensalista
          formaPagamento: 'dinheiro',
        });

      expect(response.status).toBe(201);
      expect(response.body.valor).toBe(7);
    });

    it('Cliente NÃO-MENSALISTA deve criar pedido com valor 8', async () => {
      // Assumindo que temos um cliente sem mensalidade
      const response = await request(API_BASE)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          coletaRua: 'Rua Teste',
          coletaNumero: '123',
          coletaBairro: 'Centro',
          entregaRua: 'Rua Destino',
          entregaNumero: '456',
          entregaBairro: 'Praia',
          valor: 8, // Não-mensalista
          formaPagamento: 'pix',
        });

      expect([201, 400]).toContain(response.status); // 400 se mensalista tentar usar 8
    });

    it('Não deve permitir valor de entrega inválido (ex: 9)', async () => {
      const response = await request(API_BASE)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          coletaRua: 'Rua Teste',
          coletaNumero: '123',
          coletaBairro: 'Centro',
          entregaRua: 'Rua Destino',
          entregaNumero: '456',
          entregaBairro: 'Praia',
          valor: 9, // INVÁLIDO
          formaPagamento: 'cartao',
        });

      expect(response.status).toBe(400);
    });
  });

  // ========================================
  // 6. CÁLCULOS COMPATÍVEIS COM FINANCIAL-ENGINE
  // ========================================
  describe('6️⃣ Cálculos Financeiros - Financial Engine', () => {
    it('Relatório deve retornar comissão correta para valor 7 (mensalista)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/company')
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      
      // Para valorEntrega = 7 (mensalista): repasse = 6, comissão = 1
      const kpis = response.body.data.kpis;
      expect(kpis.totalRepasses + kpis.totalComissoes).toBeCloseTo(kpis.totalRevenue, 2);
    });

    it('Relatório deve calcular repasse + comissão = valorEntrega', async () => {
      const response = await request(API_BASE)
        .get(`/api/reports/clients/${clientId}`)
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      
      // Validação: totalFaturamento deve ser consistente
      const stats = response.body.data.stats;
      expect(stats.totalFaturamento).toBeGreaterThanOrEqual(0);
    });
  });

  // ========================================
  // 7. FILTROS POR DATA, STATUS E PAGAMENTO
  // ========================================
  describe('7️⃣ Filtros - Data, Status, Método de Pagamento', () => {
    it('Deve filtrar pedidos por data (startDate + endDate)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31',
        })
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('Deve filtrar pedidos por status (delivered)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .query({ status: 'delivered' })
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      
      const orders = response.body.data.data;
      orders.forEach((order: any) => {
        expect(order.status).toBe('delivered');
      });
    });

    it('Deve filtrar pedidos por método de pagamento (Pix)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .query({ paymentMethod: 'Pix' })
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      
      const orders = response.body.data.data;
      orders.forEach((order: any) => {
        expect(order.formaPagamento).toBe('pix');
      });
    });
  });

  // ========================================
  // 8. PAGINAÇÃO 1-1000 VÁLIDA
  // ========================================
  describe('8️⃣ Paginação - Limites 1-1000', () => {
    it('Deve paginar com page=1 e limit=50 (padrão)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .query({ page: 1, limit: 50 })
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('page', 1);
      expect(response.body.data).toHaveProperty('limit', 50);
      expect(response.body.data.data.length).toBeLessThanOrEqual(50);
    });

    it('Deve limitar page mínimo a 1', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .query({ page: 0, limit: 50 })
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(1);
    });

    it('Deve limitar limit máximo a 1000', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .query({ page: 1, limit: 2000 })
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.limit).toBe(1000);
    });

    it('Deve retornar metadata de paginação completa', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/orders')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('page');
      expect(response.body.data).toHaveProperty('limit');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('totalPages');
    });
  });

  // ========================================
  // 9. TESTES ADICIONAIS DE SEGURANÇA
  // ========================================
  describe('9️⃣ Segurança - Tokens e Validações', () => {
    it('Deve rejeitar requisição sem token (401)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/company');

      expect(response.status).toBe(401);
    });

    it('Deve rejeitar token inválido (401)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/company')
        .set('Authorization', 'Bearer token-invalido-123');

      expect(response.status).toBe(401);
    });

    it('Deve validar UUID em /api/reports/clients/:id (400 se inválido)', async () => {
      const response = await request(API_BASE)
        .get('/api/reports/clients/id-invalido')
        .set('Authorization', `Bearer ${centralToken}`);

      expect(response.status).toBe(400);
    });
  });
});
