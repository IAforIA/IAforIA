/**
 * ARQUIVO: server/financial-engine.ts
 * PROPÓSITO: FONTE DA VERDADE para todas as regras financeiras da Guriri Express
 * 
 * IMPORTANTE: Este é o ÚNICO lugar onde as regras de negócio financeiro são definidas.
 * Qualquer alteração em valores, repasses ou comissões DEVE ser feita aqui.
 * 
 * REGRAS DE NEGÓCIO (EMPRESA REAL):
 * - Cliente Mensalista: valores 7/10/15
 * - Cliente Não-Mensalista: valores 8/10/15
 * - Repasse Motoboy: 7→6, 10→7, 15→10 (SEMPRE IGUAL para ambos)
 * - Comissão Guriri: 
 *   * Mensalista: 1/3/5
 *   * Não-mensalista: 2/3/5
 * 
 * FLUXO DE DINHEIRO:
 * 1. Cliente final paga: produto + entrega (ao estabelecimento)
 * 2. Motoboy entrega e recebe dinheiro do cliente final
 * 3. Motoboy devolve dinheiro ao estabelecimento
 * 4. Estabelecimento repassa à Guriri Express semanalmente
 * 5. Guriri paga motoboy semanalmente
 */

// ========================================
// TIPOS E INTERFACES
// ========================================

/**
 * Regras financeiras completas para um valor de entrega
 */
export interface FinancialRule {
  valorEntrega: number;        // Valor cobrado do estabelecimento
  repasseMotoboy: number;       // Quanto o motoboy recebe
  comissaoGuriri: number;       // Lucro da empresa
  validoMensalista: boolean;    // Se é válido para clientes mensalistas
  validoNaoMensalista: boolean; // Se é válido para clientes não-mensalistas
}

/**
 * Breakdown completo de uma transação financeira
 */
export interface TransactionBreakdown {
  valorProduto: number;         // Valor dos produtos vendidos
  valorEntrega: number;         // Taxa de entrega cobrada
  repasseMotoboy: number;       // Quanto o motoboy recebe
  comissaoGuriri: number;       // Lucro da Guriri Express
  totalEstabelecimento: number; // Total que o estabelecimento recebe (produto - não conta entrega)
  totalCliente: number;         // Total que cliente final pagou (produto + entrega)
}

/**
 * Dados visíveis por papel (SEGURANÇA)
 */
export interface VisibilityFilter {
  role: 'central' | 'client' | 'motoboy';
  canSeeComissao: boolean;
  canSeeRepasse: boolean;
  canSeeLucroEmpresa: boolean;
  canSeeValorEntrega: boolean;
  canSeeValorProduto: boolean;
  canSeeFormaPagamento: boolean;
  canSeeOutrosClientes: boolean;
  canSeeOutrosMotoboys: boolean;
}

// ========================================
// TABELAS FINANCEIRAS (ÚNICA FONTE DA VERDADE)
// ========================================

/**
 * TABELA OFICIAL: Todas as regras financeiras válidas
 * 
 * Esta é a ÚNICA tabela que define valores permitidos.
 * Qualquer validação ou cálculo DEVE usar esta tabela.
 */
const REGRAS_FINANCEIRAS: FinancialRule[] = [
  // CLIENTES MENSALISTAS (R$ 49,90/mês)
  {
    valorEntrega: 7,
    repasseMotoboy: 6,
    comissaoGuriri: 1,
    validoMensalista: true,
    validoNaoMensalista: false,
  },
  {
    valorEntrega: 10,
    repasseMotoboy: 7,
    comissaoGuriri: 3,
    validoMensalista: true,
    validoNaoMensalista: false,
  },
  {
    valorEntrega: 15,
    repasseMotoboy: 10,
    comissaoGuriri: 5,
    validoMensalista: true,
    validoNaoMensalista: false,
  },
  
  // CLIENTES NÃO-MENSALISTAS (pay-per-use)
  {
    valorEntrega: 8,
    repasseMotoboy: 6,
    comissaoGuriri: 2,
    validoMensalista: false,
    validoNaoMensalista: true,
  },
  {
    valorEntrega: 10,
    repasseMotoboy: 7,
    comissaoGuriri: 3,
    validoMensalista: false,
    validoNaoMensalista: true,
  },
  {
    valorEntrega: 15,
    repasseMotoboy: 10,
    comissaoGuriri: 5,
    validoMensalista: false,
    validoNaoMensalista: true,
  },
];

/**
 * TABELA: Controle de visibilidade por papel
 * 
 * Define o que cada tipo de usuário pode ver nos relatórios.
 * CRÍTICO: Nunca vazar informações financeiras sensíveis.
 */
const VISIBILITY_RULES: Record<'central' | 'client' | 'motoboy', VisibilityFilter> = {
  central: {
    role: 'central',
    canSeeComissao: true,          // ✅ Vê lucro da empresa
    canSeeRepasse: true,            // ✅ Vê repasse ao motoboy
    canSeeLucroEmpresa: true,       // ✅ Vê lucro total
    canSeeValorEntrega: true,       // ✅ Vê taxa de entrega
    canSeeValorProduto: true,       // ✅ Vê valor dos produtos
    canSeeFormaPagamento: true,     // ✅ Vê forma de pagamento
    canSeeOutrosClientes: true,     // ✅ Vê dados de todos clientes
    canSeeOutrosMotoboys: true,     // ✅ Vê dados de todos motoboys
  },
  
  client: {
    role: 'client',
    canSeeComissao: false,          // ❌ NÃO vê comissão Guriri
    canSeeRepasse: false,            // ❌ NÃO vê repasse ao motoboy
    canSeeLucroEmpresa: false,       // ❌ NÃO vê lucro da empresa
    canSeeValorEntrega: true,        // ✅ Vê quanto cobra de entrega
    canSeeValorProduto: true,        // ✅ Vê suas vendas
    canSeeFormaPagamento: true,      // ✅ Vê cartão/pix/dinheiro
    canSeeOutrosClientes: false,     // ❌ NÃO vê outros clientes
    canSeeOutrosMotoboys: false,     // ❌ NÃO vê dados de motoboys
  },
  
  motoboy: {
    role: 'motoboy',
    canSeeComissao: false,           // ❌ NÃO vê comissão Guriri
    canSeeRepasse: true,             // ✅ Vê seu próprio repasse
    canSeeLucroEmpresa: false,       // ❌ NÃO vê lucro da empresa
    canSeeValorEntrega: false,       // ❌ NÃO vê taxa de entrega
    canSeeValorProduto: false,       // ❌ NÃO vê valor de produtos
    canSeeFormaPagamento: false,     // ❌ NÃO vê forma de pagamento
    canSeeOutrosClientes: false,     // ❌ NÃO vê dados de clientes
    canSeeOutrosMotoboys: false,     // ❌ NÃO vê outros motoboys
  },
};

// ========================================
// FUNÇÕES PÚBLICAS (EXPORTADAS)
// ========================================

/**
 * Retorna valores de entrega permitidos para um cliente
 * 
 * @param hasMensalidade - Se o cliente tem plano mensalista
 * @returns Array de valores válidos [7, 10, 15] ou [8, 10, 15]
 */
export function getValoresPermitidos(hasMensalidade: boolean): number[] {
  return REGRAS_FINANCEIRAS
    .filter(r => hasMensalidade ? r.validoMensalista : r.validoNaoMensalista)
    .map(r => r.valorEntrega)
    .sort((a, b) => a - b);
}

/**
 * Valida se um valor de entrega é permitido para o cliente
 * 
 * @param valorEntrega - Valor da entrega a validar
 * @param hasMensalidade - Se o cliente tem plano mensalista
 * @returns true se válido, false caso contrário
 */
export function isValorEntregaValido(valorEntrega: number, hasMensalidade: boolean): boolean {
  return REGRAS_FINANCEIRAS.some(r => 
    r.valorEntrega === valorEntrega &&
    (hasMensalidade ? r.validoMensalista : r.validoNaoMensalista)
  );
}

/**
 * Calcula breakdown completo de uma transação
 * 
 * @param valorProduto - Valor total dos produtos vendidos
 * @param valorEntrega - Taxa de entrega cobrada
 * @param hasMensalidade - Se o cliente tem plano mensalista
 * @returns Breakdown completo com repasse, comissão, totais
 * @throws Error se valor de entrega inválido
 */
export function calcularTransacao(
  valorProduto: number,
  valorEntrega: number,
  hasMensalidade: boolean
): TransactionBreakdown {
  // Busca regra financeira correspondente
  const regra = REGRAS_FINANCEIRAS.find(r => 
    r.valorEntrega === valorEntrega &&
    (hasMensalidade ? r.validoMensalista : r.validoNaoMensalista)
  );
  
  if (!regra) {
    const valoresValidos = getValoresPermitidos(hasMensalidade);
    throw new Error(
      `Valor de entrega R$ ${valorEntrega} inválido para cliente ${hasMensalidade ? 'mensalista' : 'não-mensalista'}. ` +
      `Valores válidos: ${valoresValidos.join(', ')}`
    );
  }
  
  return {
    valorProduto,
    valorEntrega: regra.valorEntrega,
    repasseMotoboy: regra.repasseMotoboy,
    comissaoGuriri: regra.comissaoGuriri,
    totalEstabelecimento: valorProduto, // Estabelecimento recebe só o produto
    totalCliente: valorProduto + regra.valorEntrega, // Cliente final paga produto + entrega
  };
}

/**
 * Calcula comissão da Guriri para um valor de entrega
 * 
 * @param valorEntrega - Taxa de entrega
 * @param hasMensalidade - Se o cliente tem plano mensalista
 * @returns Comissão da Guriri ou 0 se inválido
 */
export function calcularComissaoGuriri(valorEntrega: number, hasMensalidade: boolean): number {
  const regra = REGRAS_FINANCEIRAS.find(r => 
    r.valorEntrega === valorEntrega &&
    (hasMensalidade ? r.validoMensalista : r.validoNaoMensalista)
  );
  
  return regra ? regra.comissaoGuriri : 0;
}

/**
 * Calcula repasse ao motoboy para um valor de entrega
 * 
 * IMPORTANTE: Repasse é SEMPRE IGUAL independente de mensalidade
 * 7→6, 10→7, 15→10
 * 
 * @param valorEntrega - Taxa de entrega
 * @returns Repasse ao motoboy ou 0 se inválido
 */
export function calcularRepasseMotoboy(valorEntrega: number): number {
  // Busca em QUALQUER regra (repasse não depende de mensalidade)
  const regra = REGRAS_FINANCEIRAS.find(r => r.valorEntrega === valorEntrega);
  
  return regra ? regra.repasseMotoboy : 0;
}

/**
 * Retorna regras de visibilidade para um papel
 * 
 * @param role - Papel do usuário ('central', 'client', 'motoboy')
 * @returns Regras de visibilidade aplicáveis
 */
export function getVisibilityRules(role: 'central' | 'client' | 'motoboy'): VisibilityFilter {
  return VISIBILITY_RULES[role];
}

/**
 * Filtra dados financeiros baseado no papel do usuário
 * 
 * CRÍTICO: Use esta função para TODOS os retornos de APIs financeiras
 * para garantir que informações sensíveis não vazem.
 * 
 * @param data - Dados financeiros completos
 * @param role - Papel do usuário solicitante
 * @returns Dados filtrados conforme permissões
 */
export function filtrarDadosFinanceiros<T extends Record<string, any>>(
  data: T,
  role: 'central' | 'client' | 'motoboy'
): Partial<T> {
  const rules = getVisibilityRules(role);
  const filtered: any = { ...data };
  
  // Remove campos sensíveis baseado no papel
  if (!rules.canSeeComissao) {
    delete filtered.comissaoGuriri;
    delete filtered.comissao;
    delete filtered.lucroEmpresa;
  }
  
  if (!rules.canSeeRepasse) {
    delete filtered.repasseMotoboy;
    delete filtered.repasse;
    delete filtered.ganhoMotoboy;
  }
  
  if (!rules.canSeeValorEntrega && role === 'motoboy') {
    delete filtered.valorEntrega;
    delete filtered.taxaEntrega;
  }
  
  if (!rules.canSeeValorProduto && role === 'motoboy') {
    delete filtered.valorProduto;
    delete filtered.totalProdutos;
  }
  
  if (!rules.canSeeFormaPagamento && role === 'motoboy') {
    delete filtered.formaPagamento;
    delete filtered.metodoPagamento;
  }
  
  return filtered as Partial<T>;
}

/**
 * Valida e retorna mensalidade padrão
 * 
 * @returns Valor da mensalidade em reais
 */
export function getMensalidadePadrao(): number {
  return 49.90;
}

/**
 * Calcula MRR (Monthly Recurring Revenue) baseado em número de mensalistas
 * 
 * @param numeroMensalistas - Quantidade de clientes mensalistas ativos
 * @returns MRR total em reais
 */
export function calcularMRR(numeroMensalistas: number): number {
  return numeroMensalistas * getMensalidadePadrao();
}

// ========================================
// FUNÇÕES AUXILIARES (USO INTERNO)
// ========================================

/**
 * Retorna todas as regras financeiras (para debug/auditoria)
 * ATENÇÃO: Use apenas em contexto de Central/Admin
 */
export function getAllFinancialRules(): FinancialRule[] {
  return [...REGRAS_FINANCEIRAS];
}

/**
 * Validação de integridade das regras financeiras
 * Garante que repasses sempre somam com comissão igual ao valor de entrega
 * 
 * @throws Error se alguma regra estiver inconsistente
 */
export function validateFinancialRulesIntegrity(): void {
  for (const regra of REGRAS_FINANCEIRAS) {
    const soma = regra.repasseMotoboy + regra.comissaoGuriri;
    if (soma !== regra.valorEntrega) {
      throw new Error(
        `Regra financeira inconsistente: valorEntrega=${regra.valorEntrega}, ` +
        `mas repasseMotoboy (${regra.repasseMotoboy}) + comissaoGuriri (${regra.comissaoGuriri}) = ${soma}`
      );
    }
  }
}

// Valida integridade na inicialização do módulo
validateFinancialRulesIntegrity();
