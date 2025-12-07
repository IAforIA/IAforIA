/**
 * 🟦 TESTES DE VISIBILIDADE - CLIENTE
 * 
 * Validações críticas:
 * 1. Cliente NÃO pode ver dados de outro cliente
 * 2. Cliente NÃO pode ver: comissão, repasse motoboy, lucro empresa
 * 3. Cliente vê APENAS: valorProduto, valorEntrega, totalCliente, próprios pedidos
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { filterByRoleOnResponse } from '../../server/reports';

describe('🟦 Client Visibility Tests', () => {
  const mockOrderData = {
    id: 'order-123',
    clientId: 'client-abc',
    clientName: 'Restaurante Teste',
    clientPhone: '27999999999',
    motoboyId: 'moto-xyz',
    motoboyName: 'João Silva',
    valorProduto: 50.00,
    valorEntrega: 10.00,
    totalCliente: 60.00,
    repasseMotoboy: 7.00,
    comissaoGuriri: 3.00,
    lucroGuriri: 3.00,
    hasMensalidade: true,
    status: 'delivered',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  };

  describe('✅ Cliente vê APENAS dados permitidos', () => {
    it('deve remover campos financeiros internos (comissão, repasse, lucro)', () => {
      const filtered = filterByRoleOnResponse([mockOrderData], 'client', 'client-abc');

      expect(filtered[0]).toHaveProperty('valorProduto');
      expect(filtered[0]).toHaveProperty('valorEntrega');
      expect(filtered[0]).toHaveProperty('totalCliente');
      
      // Campos PROIBIDOS para cliente
      expect(filtered[0]).not.toHaveProperty('repasseMotoboy');
      expect(filtered[0]).not.toHaveProperty('comissaoGuriri');
      expect(filtered[0]).not.toHaveProperty('lucroGuriri');
      expect(filtered[0]).not.toHaveProperty('hasMensalidade');
    });

    it('deve remover dados do motoboy (ID, nome)', () => {
      const filtered = filterByRoleOnResponse([mockOrderData], 'client', 'client-abc');

      expect(filtered[0]).not.toHaveProperty('motoboyId');
      expect(filtered[0]).not.toHaveProperty('motoboyName');
    });

    it('deve manter dados do próprio cliente', () => {
      const filtered = filterByRoleOnResponse([mockOrderData], 'client', 'client-abc');

      expect(filtered[0]).toHaveProperty('clientId');
      expect(filtered[0]).toHaveProperty('clientName');
      expect(filtered[0]).toHaveProperty('clientPhone');
    });
  });

  describe('❌ Cliente NÃO vê dados de outro cliente', () => {
    it('deve retornar array vazio se userId não corresponde ao clientId', () => {
      // Cliente "client-xyz" tentando ver pedidos de "client-abc"
      const filtered = filterByRoleOnResponse([mockOrderData], 'client', 'client-xyz');

      expect(filtered).toHaveLength(0);
    });

    it('deve filtrar múltiplos pedidos mantendo apenas do próprio cliente', () => {
      const multipleOrders = [
        { ...mockOrderData, id: 'order-1', clientId: 'client-abc' },
        { ...mockOrderData, id: 'order-2', clientId: 'client-xyz' }, // Outro cliente
        { ...mockOrderData, id: 'order-3', clientId: 'client-abc' },
      ];

      const filtered = filterByRoleOnResponse(multipleOrders, 'client', 'client-abc');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('order-1');
      expect(filtered[1].id).toBe('order-3');
    });
  });

  describe('🔒 Isolamento ABSOLUTO', () => {
    it('deve garantir que comissão NUNCA aparece na resposta', () => {
      const filtered = filterByRoleOnResponse([mockOrderData], 'client', 'client-abc');

      const hasComissao = Object.keys(filtered[0]).some(key => 
        key.toLowerCase().includes('comissao') || 
        key.toLowerCase().includes('comissão')
      );

      expect(hasComissao).toBe(false);
    });

    it('deve garantir que repasse NUNCA aparece na resposta', () => {
      const filtered = filterByRoleOnResponse([mockOrderData], 'client', 'client-abc');

      const hasRepasse = Object.keys(filtered[0]).some(key => 
        key.toLowerCase().includes('repasse')
      );

      expect(hasRepasse).toBe(false);
    });

    it('deve garantir que lucro NUNCA aparece na resposta', () => {
      const filtered = filterByRoleOnResponse([mockOrderData], 'client', 'client-abc');

      const hasLucro = Object.keys(filtered[0]).some(key => 
        key.toLowerCase().includes('lucro')
      );

      expect(hasLucro).toBe(false);
    });
  });
});
