/**
 * 🔐 TESTES DE FILTRAGEM POR ROLE
 * 
 * Validações críticas:
 * 1. Central vê TUDO (sem filtros)
 * 2. Cliente vê apenas próprios dados (sem comissão/repasse/lucro)
 * 3. Motoboy vê apenas próprios ganhos (sem valores cliente/comissão)
 */

import { describe, it, expect } from 'vitest';
import { filterByRoleOnResponse } from '../../server/reports';

describe('🔐 Role Filtering Tests', () => {
  const mockFullOrder = {
    id: 'order-789',
    clientId: 'client-abc',
    clientName: 'Restaurante Premium',
    clientPhone: '27988888888',
    motoboyId: 'moto-xyz',
    motoboyName: 'Carlos Entregador',
    valorProduto: 100.00,
    valorEntrega: 10.00,
    totalCliente: 110.00,
    repasseMotoboy: 7.00,
    comissaoGuriri: 3.00,
    lucroGuriri: 3.00,
    hasMensalidade: true,
    status: 'delivered',
    createdAt: new Date('2024-01-20T14:30:00Z'),
    fotoComprovante: 'https://storage.example.com/comprovante123.jpg',
  };

  describe('👑 Central (role: central) - SEM FILTROS', () => {
    it('deve retornar TODOS os campos sem remoções', () => {
      const filtered = filterByRoleOnResponse([mockFullOrder], 'central', 'central-user-id');

      expect(filtered[0]).toHaveProperty('clientId');
      expect(filtered[0]).toHaveProperty('clientName');
      expect(filtered[0]).toHaveProperty('motoboyId');
      expect(filtered[0]).toHaveProperty('motoboyName');
      expect(filtered[0]).toHaveProperty('valorProduto');
      expect(filtered[0]).toHaveProperty('valorEntrega');
      expect(filtered[0]).toHaveProperty('totalCliente');
      expect(filtered[0]).toHaveProperty('repasseMotoboy');
      expect(filtered[0]).toHaveProperty('comissaoGuriri');
      expect(filtered[0]).toHaveProperty('lucroGuriri');
      expect(filtered[0]).toHaveProperty('hasMensalidade');
    });

    it('deve retornar todos os pedidos sem filtro por userId', () => {
      const multipleOrders = [
        { ...mockFullOrder, id: 'order-1', clientId: 'client-aaa' },
        { ...mockFullOrder, id: 'order-2', clientId: 'client-bbb' },
        { ...mockFullOrder, id: 'order-3', clientId: 'client-ccc' },
      ];

      const filtered = filterByRoleOnResponse(multipleOrders, 'central', 'any-user-id');

      expect(filtered).toHaveLength(3);
    });

    it('deve manter foto de comprovante visível', () => {
      const filtered = filterByRoleOnResponse([mockFullOrder], 'central', 'central-user-id');

      expect(filtered[0]).toHaveProperty('fotoComprovante');
      expect(filtered[0].fotoComprovante).toBe('https://storage.example.com/comprovante123.jpg');
    });
  });

  describe('🏪 Cliente (role: client) - FILTRADO', () => {
    it('deve remover: comissão, repasse, lucro, hasMensalidade, motoboyId, motoboyName', () => {
      const filtered = filterByRoleOnResponse([mockFullOrder], 'client', 'client-abc');

      expect(filtered[0]).not.toHaveProperty('comissaoGuriri');
      expect(filtered[0]).not.toHaveProperty('repasseMotoboy');
      expect(filtered[0]).not.toHaveProperty('lucroGuriri');
      expect(filtered[0]).not.toHaveProperty('hasMensalidade');
      expect(filtered[0]).not.toHaveProperty('motoboyId');
      expect(filtered[0]).not.toHaveProperty('motoboyName');
    });

    it('deve manter: valorProduto, valorEntrega, totalCliente, clientId, clientName, status', () => {
      const filtered = filterByRoleOnResponse([mockFullOrder], 'client', 'client-abc');

      expect(filtered[0]).toHaveProperty('valorProduto', 100.00);
      expect(filtered[0]).toHaveProperty('valorEntrega', 10.00);
      expect(filtered[0]).toHaveProperty('totalCliente', 110.00);
      expect(filtered[0]).toHaveProperty('clientId', 'client-abc');
      expect(filtered[0]).toHaveProperty('clientName', 'Restaurante Premium');
      expect(filtered[0]).toHaveProperty('status', 'delivered');
    });

    it('deve manter foto de comprovante visível para cliente', () => {
      const filtered = filterByRoleOnResponse([mockFullOrder], 'client', 'client-abc');

      expect(filtered[0]).toHaveProperty('fotoComprovante');
    });
  });

  describe('🛵 Motoboy (role: motoboy) - FILTRADO', () => {
    it('deve remover: valorProduto, valorEntrega, totalCliente, comissão, lucro, clientId, clientName, clientPhone', () => {
      const filtered = filterByRoleOnResponse([mockFullOrder], 'motoboy', 'moto-xyz');

      expect(filtered[0]).not.toHaveProperty('valorProduto');
      expect(filtered[0]).not.toHaveProperty('valorEntrega');
      expect(filtered[0]).not.toHaveProperty('totalCliente');
      expect(filtered[0]).not.toHaveProperty('comissaoGuriri');
      expect(filtered[0]).not.toHaveProperty('lucroGuriri');
      expect(filtered[0]).not.toHaveProperty('clientId');
      expect(filtered[0]).not.toHaveProperty('clientName');
      expect(filtered[0]).not.toHaveProperty('clientPhone');
    });

    it('deve manter APENAS: repasseMotoboy, motoboyId, status, fotoComprovante', () => {
      const filtered = filterByRoleOnResponse([mockFullOrder], 'motoboy', 'moto-xyz');

      expect(filtered[0]).toHaveProperty('repasseMotoboy', 7.00);
      expect(filtered[0]).toHaveProperty('motoboyId', 'moto-xyz');
      expect(filtered[0]).toHaveProperty('status', 'delivered');
      expect(filtered[0]).toHaveProperty('fotoComprovante');
    });

    it('deve manter foto de comprovante visível para motoboy', () => {
      const filtered = filterByRoleOnResponse([mockFullOrder], 'motoboy', 'moto-xyz');

      expect(filtered[0]).toHaveProperty('fotoComprovante');
    });
  });

  describe('🔒 Isolamento entre roles', () => {
    it('cliente NÃO vê o que motoboy vê', () => {
      const clientFiltered = filterByRoleOnResponse([mockFullOrder], 'client', 'client-abc');
      const motoboyFiltered = filterByRoleOnResponse([mockFullOrder], 'motoboy', 'moto-xyz');

      // Cliente vê valorProduto, motoboy NÃO
      expect(clientFiltered[0]).toHaveProperty('valorProduto');
      expect(motoboyFiltered[0]).not.toHaveProperty('valorProduto');

      // Motoboy vê repasseMotoboy, cliente NÃO
      expect(motoboyFiltered[0]).toHaveProperty('repasseMotoboy');
      expect(clientFiltered[0]).not.toHaveProperty('repasseMotoboy');
    });

    it('central vê TUDO que cliente e motoboy NÃO veem', () => {
      const centralFiltered = filterByRoleOnResponse([mockFullOrder], 'central', 'central-id');
      const clientFiltered = filterByRoleOnResponse([mockFullOrder], 'client', 'client-abc');
      const motoboyFiltered = filterByRoleOnResponse([mockFullOrder], 'motoboy', 'moto-xyz');

      const centralKeys = Object.keys(centralFiltered[0]);
      const clientKeys = Object.keys(clientFiltered[0]);
      const motoboyKeys = Object.keys(motoboyFiltered[0]);

      expect(centralKeys.length).toBeGreaterThan(clientKeys.length);
      expect(centralKeys.length).toBeGreaterThan(motoboyKeys.length);
    });
  });

  describe('⚡ Performance e edge cases', () => {
    it('deve lidar com array vazio sem erros', () => {
      const filtered = filterByRoleOnResponse([], 'client', 'client-abc');
      expect(filtered).toEqual([]);
    });

    it('deve filtrar grandes volumes de dados corretamente', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockFullOrder,
        id: `order-${i}`,
        clientId: i % 2 === 0 ? 'client-abc' : 'client-xyz',
      }));

      const filtered = filterByRoleOnResponse(largeDataset, 'client', 'client-abc');

      expect(filtered).toHaveLength(500);
      expect(filtered.every(order => order.clientId === 'client-abc')).toBe(true);
    });

    it('deve preservar ordem original dos dados após filtragem', () => {
      const orderedData = [
        { ...mockFullOrder, id: 'order-1', clientId: 'client-abc', createdAt: new Date('2024-01-01') },
        { ...mockFullOrder, id: 'order-2', clientId: 'client-abc', createdAt: new Date('2024-01-02') },
        { ...mockFullOrder, id: 'order-3', clientId: 'client-abc', createdAt: new Date('2024-01-03') },
      ];

      const filtered = filterByRoleOnResponse(orderedData, 'client', 'client-abc');

      expect(filtered[0].id).toBe('order-1');
      expect(filtered[1].id).toBe('order-2');
      expect(filtered[2].id).toBe('order-3');
    });
  });
});
