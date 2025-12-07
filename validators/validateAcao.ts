import { AcaoNome, AcaoPayload, ValidationResult } from "../types/schema";
import { validateClienteAbsente } from "./acoes/validateClienteAbsente";
import { validateClienteAdicionalPedido } from "./acoes/validateClienteAdicionalPedido";
import { validateClienteAgressivo } from "./acoes/validateClienteAgressivo";
import { validateChuvaAtraso } from "./acoes/validateChuvaAtraso";
import { validateEnderecoErrado } from "./acoes/validateEnderecoErrado";
import { validateMotoQuebrou } from "./acoes/validateMotoQuebrou";
import { validatePrimeiroLogin } from "./acoes/validatePrimeiroLogin";
import { validatePrioridadeEstab } from "./acoes/validatePrioridadeEstab";
import { validateProdutoEstragado } from "./acoes/validateProdutoEstragado";
import { validateCalcularFrete } from "./acoes/validateCalcularFrete";
import { validateCancelarPedido } from "./acoes/validateCancelarPedido";
import { validateCriarPedido } from "./acoes/validateCriarPedido";
import { validateReatribuirPedido } from "./acoes/validateReatribuirPedido";
import { validateBloquearMotoboy } from "./acoes/validateBloquearMotoboy";
import { validateDistribuirCarga } from "./acoes/validateDistribuirCarga";
import { validateEscolherMotoboy } from "./acoes/validateEscolherMotoboy";
import { validateVerificarDisponibilidade } from "./acoes/validateVerificarDisponibilidade";
import { validateAjustarMensalidade } from "./acoes/validateAjustarMensalidade";
import { validateComunicarAtraso } from "./acoes/validateComunicarAtraso";
import { validatePriorizarVip } from "./acoes/validatePriorizarVip";
import { validateVerificarAberto } from "./acoes/validateVerificarAberto";
import { validateCalcularLucro } from "./acoes/validateCalcularLucro";
import { validateCalcularRepasse } from "./acoes/validateCalcularRepasse";
import { validateDetectarDivergencia } from "./acoes/validateDetectarDivergencia";
import { validateGerarRelatorio } from "./acoes/validateGerarRelatorio";
import { validateAcionarSuporte } from "./acoes/validateAcionarSuporte";
import { validateBloquearAutomatico } from "./acoes/validateBloquearAutomatico";
import { validateCancelarAutomatico } from "./acoes/validateCancelarAutomatico";
import { validateOferecerCompensacao } from "./acoes/validateOferecerCompensacao";

const VALID_ACOES: AcaoNome[] = [
  "acionar_suporte",
  "ajustar_mensalidade",
  "bloquear_automatico",
  "bloquear_motoboy",
  "calcular_frete",
  "calcular_lucro",
  "calcular_repasse",
  "cancelar_automatico",
  "cancelar_pedido",
  "chuva_atraso",
  "cliente_absente",
  "cliente_adicional_pedido",
  "cliente_agressivo",
  "comunicar_atraso",
  "criar_pedido",
  "detectar_divergencia",
  "distribuir_carga",
  "endereco_errado",
  "escolher_motoboy",
  "gerar_relatorio",
  "moto_quebrou",
  "oferecer_compensacao",
  "primeiro_login",
  "prioridade_estab",
  "priorizar_vip",
  "produto_estragado",
  "reatribuir_pedido",
  "verificar_aberto",
  "verificar_disponibilidade",
];

export function validateAcao(payload: any): ValidationResult {
  const errors: string[] = [];

  // Validar estrutura do payload
  if (typeof payload !== "object" || payload === null) {
    return { valid: false, errors: ["Payload deve ser um objeto"] };
  }

  // Validar campo "acao"
  if (!payload.acao || typeof payload.acao !== "string") {
    return { valid: false, errors: ["Campo 'acao' é obrigatório e deve ser string"] };
  }

  // Validar se acao é válida
  if (!VALID_ACOES.includes(payload.acao as AcaoNome)) {
    return {
      valid: false,
      errors: [`Ação '${payload.acao}' inválida. Ações válidas: ${VALID_ACOES.join(", ")}`],
    };
  }

  // Validar campo "dados"
  if (!payload.dados || typeof payload.dados !== "object") {
    return { valid: false, errors: ["Campo 'dados' é obrigatório e deve ser objeto"] };
  }

  // Delegar para validador específico
  const acao = payload.acao as AcaoNome;

  switch (acao) {
    case "cliente_absente":
      return validateClienteAbsente(payload.dados);
    case "cliente_adicional_pedido":
      return validateClienteAdicionalPedido(payload.dados);
    case "cliente_agressivo":
      return validateClienteAgressivo(payload.dados);
    case "chuva_atraso":
      return validateChuvaAtraso(payload.dados);
    case "endereco_errado":
      return validateEnderecoErrado(payload.dados);
    case "moto_quebrou":
      return validateMotoQuebrou(payload.dados);
    case "primeiro_login":
      return validatePrimeiroLogin(payload.dados);
    case "prioridade_estab":
      return validatePrioridadeEstab(payload.dados);
    case "produto_estragado":
      return validateProdutoEstragado(payload.dados);
    case "calcular_frete":
      return validateCalcularFrete(payload.dados);
    case "cancelar_pedido":
      return validateCancelarPedido(payload.dados);
    case "criar_pedido":
      return validateCriarPedido(payload.dados);
    case "reatribuir_pedido":
      return validateReatribuirPedido(payload.dados);
    case "bloquear_motoboy":
      return validateBloquearMotoboy(payload.dados);
    case "distribuir_carga":
      return validateDistribuirCarga(payload.dados);
    case "escolher_motoboy":
      return validateEscolherMotoboy(payload.dados);
    case "verificar_disponibilidade":
      return validateVerificarDisponibilidade(payload.dados);
    case "ajustar_mensalidade":
      return validateAjustarMensalidade(payload.dados);
    case "comunicar_atraso":
      return validateComunicarAtraso(payload.dados);
    case "priorizar_vip":
      return validatePriorizarVip(payload.dados);
    case "verificar_aberto":
      return validateVerificarAberto(payload.dados);
    case "calcular_lucro":
      return validateCalcularLucro(payload.dados);
    case "calcular_repasse":
      return validateCalcularRepasse(payload.dados);
    case "detectar_divergencia":
      return validateDetectarDivergencia(payload.dados);
    case "gerar_relatorio":
      return validateGerarRelatorio(payload.dados);
    case "acionar_suporte":
      return validateAcionarSuporte(payload.dados);
    case "bloquear_automatico":
      return validateBloquearAutomatico(payload.dados);
    case "cancelar_automatico":
      return validateCancelarAutomatico(payload.dados);
    case "oferecer_compensacao":
      return validateOferecerCompensacao(payload.dados);
    default:
      return { valid: false, errors: [`Validador não implementado para ação: ${acao}`] };
  }
}
