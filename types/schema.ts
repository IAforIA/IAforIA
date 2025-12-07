// ============================================================================
// SCHEMA OFICIAL DA IA CEO GURIRI EXPRESS
// Gerado automaticamente a partir de schema_final_guriri.json v1.0.0
// ============================================================================

// ============================================================================
// MÓDULO: Problemas Operacionais
// ============================================================================

export interface ClienteAbsenteData {
  pedidoID: string;
  minutos: number;
}

export interface ClienteAdicionalPedidoData {
  pedidoID: string;
  item: string;
  valor: number;
}

export interface ClienteAgressivoData {
  pedidoID: string;
  urgente: boolean;
}

export interface ChuvaAtrasoData {
  pedidoID: string;
  minutos: number;
}

export interface EnderecoErradoData {
  pedidoID: string;
  observacao: string;
}

export interface MotoQuebrouData {
  pedidoID: string;
  urgente: boolean;
}

export interface PrimeiroLoginData {
  motoboyID: string;
}

export interface PrioridadeEstabData {
  estabelecimentoID: string;
  nivel: string;
}

export interface ProdutoEstragadoData {
  pedidoID: string;
  motivo: string;
}

// ============================================================================
// MÓDULO: Gestão de Pedidos
// ============================================================================

export interface CalcularFreteData {
  origem: string;
  destino: string;
  distancia_km?: number;
}

export interface CancelarPedidoData {
  pedidoID: string;
  motivo: string;
  reembolso: boolean;
}

export interface CriarPedidoData {
  clienteID: string;
  endereco: string;
  valor: number;
  status: string;
}

export interface ReatribuirPedidoData {
  pedidoID: string;
  motoboyNovo: string;
  urgente: boolean;
  motoboyAnterior?: string;
  criterio?: string;
}

// ============================================================================
// MÓDULO: Gestão de Motoboys
// ============================================================================

export interface BloquearMotoboyData {
  motoboyID: string;
  motivo: string;
  temporario: boolean;
  dias?: number;
}

export interface DistribuirCargaData {
  tipo: string;
  motoboyID?: string;
  pedidosAtuais?: number;
  limite?: number;
  prioridade?: string;
}

export interface EscolherMotoboyData {
  criterio: string;
  considerarHorario: boolean;
  pedidoID?: string;
  localidade?: string;
  timeout?: number;
}

export interface VerificarDisponibilidadeData {
  verificarHorario: boolean;
  motoboyID?: string;
  localidade?: string;
  status?: string;
}

// ============================================================================
// MÓDULO: Gestão de Estabelecimentos
// ============================================================================

export interface AjustarMensalidadeData {
  clienteID: string;
  tipoAjuste: string;
  percentual?: number;
  temporario?: boolean;
  justificativa?: string;
}

export interface ComunicarAtrasoData {
  atrasoMinutos: number;
  motivo: string;
  clienteID?: string;
  estabelecimento?: string;
  pedidoID?: string;
  oferecerDesconto?: boolean;
}

export interface PriorizarVipData {
  nivel: string;
  clienteID?: string;
  estabelecimento?: string;
  tempoMaximo?: number;
  garantiaEntrega?: boolean;
}

export interface VerificarAbertoData {
  consultarHorario: boolean;
  clienteID?: string;
  estabelecimento?: string;
  horario?: string;
}

// ============================================================================
// MÓDULO: Gestão Financeira
// ============================================================================

export interface CalcularLucroData {
  periodo: string;
  descontarCustos: boolean;
  tipo?: string;
}

export interface CalcularRepasseData {
  motoboyID: string;
  periodo: string;
  incluirBonificacao: boolean;
}

export interface DetectarDivergenciaData {
  tipo: string;
  investigar: boolean;
  valor?: number;
  data?: string;
  clienteID?: string;
  verificarHistorico?: boolean;
}

export interface GerarRelatorioData {
  tipo: string;
  data?: string;
  incluirDetalhes?: boolean;
  clienteID?: string;
  periodo?: string;
}

// ============================================================================
// MÓDULO: Tomada de Decisão
// ============================================================================

export interface AcionarSuporteData {
  tipo: string;
  urgente: boolean;
  descricao?: string;
  acionarSeguro?: boolean;
  notificarAutoridades?: boolean;
}

export interface BloquearAutomaticoData {
  motivo: string;
  temporario: boolean;
  clienteID?: string;
  motoboyID?: string;
  dias?: number;
  investigar?: boolean;
  suspenso?: boolean;
}

export interface CancelarAutomaticoData {
  pedidoID: string;
  motivo: string;
  reembolsar: boolean;
  notificarCliente: boolean;
  cobrarTaxa?: boolean;
  pagarMotoboy?: boolean;
}

export interface OferecerCompensacaoData {
  tipo: string;
  percentual?: number;
  validadeProximoPedido?: boolean;
  incluirFrete?: boolean;
  cupomExtra?: number;
}

// ============================================================================
// UNION TYPES
// ============================================================================

export type AcaoData =
  | ClienteAbsenteData
  | ClienteAdicionalPedidoData
  | ClienteAgressivoData
  | ChuvaAtrasoData
  | EnderecoErradoData
  | MotoQuebrouData
  | PrimeiroLoginData
  | PrioridadeEstabData
  | ProdutoEstragadoData
  | CalcularFreteData
  | CancelarPedidoData
  | CriarPedidoData
  | ReatribuirPedidoData
  | BloquearMotoboyData
  | DistribuirCargaData
  | EscolherMotoboyData
  | VerificarDisponibilidadeData
  | AjustarMensalidadeData
  | ComunicarAtrasoData
  | PriorizarVipData
  | VerificarAbertoData
  | CalcularLucroData
  | CalcularRepasseData
  | DetectarDivergenciaData
  | GerarRelatorioData
  | AcionarSuporteData
  | BloquearAutomaticoData
  | CancelarAutomaticoData
  | OferecerCompensacaoData;

export type AcaoNome =
  | "acionar_suporte"
  | "ajustar_mensalidade"
  | "bloquear_automatico"
  | "bloquear_motoboy"
  | "calcular_frete"
  | "calcular_lucro"
  | "calcular_repasse"
  | "cancelar_automatico"
  | "cancelar_pedido"
  | "chuva_atraso"
  | "cliente_absente"
  | "cliente_adicional_pedido"
  | "cliente_agressivo"
  | "comunicar_atraso"
  | "criar_pedido"
  | "detectar_divergencia"
  | "distribuir_carga"
  | "endereco_errado"
  | "escolher_motoboy"
  | "gerar_relatorio"
  | "moto_quebrou"
  | "oferecer_compensacao"
  | "primeiro_login"
  | "prioridade_estab"
  | "priorizar_vip"
  | "produto_estragado"
  | "reatribuir_pedido"
  | "verificar_aberto"
  | "verificar_disponibilidade";

// ============================================================================
// PAYLOAD PRINCIPAL
// ============================================================================

export interface AcaoPayload<T extends AcaoData = AcaoData> {
  acao: AcaoNome;
  dados: T;
}

// ============================================================================
// RESULTADO DE VALIDAÇÃO
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  expected?: string;
  received?: string;
}
