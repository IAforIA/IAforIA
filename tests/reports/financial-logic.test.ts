/**
 * 💰 TESTES DE LÓGICA FINANCEIRA
 * 
 * Validações críticas:
 * 1. Mensalista: 7→{6,1}, 10→{7,3}, 15→{10,5}
 * 2. Não-mensalista: 8→{6,2}, 10→{7,3}, 15→{10,5}
 * 3. Integridade: repasse + comissão = valorEntrega (SEMPRE)
 */

import { describe, it, expect } from 'vitest';
import {
  calcularTransacao,
  getValoresPermitidos,
  calcularComissaoGuriri,
  calcularRepasseMotoboy,
} from '../../server/financial-engine';

describe('💰 Financial Logic Tests', () => {
  describe('✅ Valores permitidos por tipo de cliente', () => {
    it('deve retornar [7, 10, 15] para cliente mensalista', () => {
      const valores = getValoresPermitidos(true);
      expect(valores).toEqual([7, 10, 15]);
    });

    it('deve retornar [8, 10, 15] para cliente não-mensalista', () => {
      const valores = getValoresPermitidos(false);
      expect(valores).toEqual([8, 10, 15]);
    });
  });

  describe('💳 Cálculos MENSALISTA (7/10/15)', () => {
    it('valorEntrega = 7 → repasse = 6, comissão = 1', () => {
      const result = calcularTransacao(7, true);
      expect(result.repasseMotoboy).toBe(6);
      expect(result.comissaoGuriri).toBe(1);
      expect(result.repasseMotoboy + result.comissaoGuriri).toBe(7);
    });

    it('valorEntrega = 10 → repasse = 7, comissão = 3', () => {
      const result = calcularTransacao(10, true);
      expect(result.repasseMotoboy).toBe(7);
      expect(result.comissaoGuriri).toBe(3);
      expect(result.repasseMotoboy + result.comissaoGuriri).toBe(10);
    });

    it('valorEntrega = 15 → repasse = 10, comissão = 5', () => {
      const result = calcularTransacao(15, true);
      expect(result.repasseMotoboy).toBe(10);
      expect(result.comissaoGuriri).toBe(5);
      expect(result.repasseMotoboy + result.comissaoGuriri).toBe(15);
    });
  });

  describe('💵 Cálculos NÃO-MENSALISTA (8/10/15)', () => {
    it('valorEntrega = 8 → repasse = 6, comissão = 2', () => {
      const result = calcularTransacao(8, false);
      expect(result.repasseMotoboy).toBe(6);
      expect(result.comissaoGuriri).toBe(2);
      expect(result.repasseMotoboy + result.comissaoGuriri).toBe(8);
    });

    it('valorEntrega = 10 → repasse = 7, comissão = 3', () => {
      const result = calcularTransacao(10, false);
      expect(result.repasseMotoboy).toBe(7);
      expect(result.comissaoGuriri).toBe(3);
      expect(result.repasseMotoboy + result.comissaoGuriri).toBe(10);
    });

    it('valorEntrega = 15 → repasse = 10, comissão = 5', () => {
      const result = calcularTransacao(15, false);
      expect(result.repasseMotoboy).toBe(10);
      expect(result.comissaoGuriri).toBe(5);
      expect(result.repasseMotoboy + result.comissaoGuriri).toBe(15);
    });
  });

  describe('🔢 Funções individuais de cálculo', () => {
    it('calcularComissaoGuriri(7, true) = 1', () => {
      expect(calcularComissaoGuriri(7, true)).toBe(1);
    });

    it('calcularComissaoGuriri(8, false) = 2', () => {
      expect(calcularComissaoGuriri(8, false)).toBe(2);
    });

    it('calcularRepasseMotoboy(10, true) = 7', () => {
      expect(calcularRepasseMotoboy(10, true)).toBe(7);
    });

    it('calcularRepasseMotoboy(15, false) = 10', () => {
      expect(calcularRepasseMotoboy(15, false)).toBe(10);
    });
  });

  describe('⚠️ Validação de valores inválidos', () => {
    it('deve lançar erro para valor não permitido (mensalista)', () => {
      expect(() => calcularTransacao(9, true)).toThrow();
    });

    it('deve lançar erro para valor não permitido (não-mensalista)', () => {
      expect(() => calcularTransacao(7, false)).toThrow();
    });

    it('deve lançar erro para valor zero', () => {
      expect(() => calcularTransacao(0, true)).toThrow();
    });

    it('deve lançar erro para valor negativo', () => {
      expect(() => calcularTransacao(-10, false)).toThrow();
    });
  });

  describe('🔐 Integridade das regras', () => {
    it('deve garantir que repasse + comissão = valorEntrega (TODOS os casos)', () => {
      const testCases = [
        { valor: 7, mensalista: true },
        { valor: 8, mensalista: false },
        { valor: 10, mensalista: true },
        { valor: 10, mensalista: false },
        { valor: 15, mensalista: true },
        { valor: 15, mensalista: false },
      ];

      testCases.forEach(({ valor, mensalista }) => {
        const result = calcularTransacao(valor, mensalista);
        expect(result.repasseMotoboy + result.comissaoGuriri).toBe(valor);
      });
    });

    it('deve garantir que repasse SEMPRE é >= 6 (valor mínimo)', () => {
      const testCases = [7, 8, 10, 15];
      testCases.forEach(valor => {
        const mensalista = calcularTransacao(valor, true);
        const naoMensalista = calcularTransacao(valor, false);
        
        expect(mensalista.repasseMotoboy).toBeGreaterThanOrEqual(6);
        expect(naoMensalista.repasseMotoboy).toBeGreaterThanOrEqual(6);
      });
    });

    it('deve garantir que comissão SEMPRE é >= 1 (valor mínimo)', () => {
      const testCases = [7, 8, 10, 15];
      testCases.forEach(valor => {
        const mensalista = calcularTransacao(valor, true);
        const naoMensalista = calcularTransacao(valor, false);
        
        expect(mensalista.comissaoGuriri).toBeGreaterThanOrEqual(1);
        expect(naoMensalista.comissaoGuriri).toBeGreaterThanOrEqual(1);
      });
    });
  });
});
