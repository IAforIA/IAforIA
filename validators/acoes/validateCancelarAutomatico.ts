import { ValidationResult } from "../../types/schema";

export function validateCancelarAutomatico(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.pedidoID || typeof dados.pedidoID !== "string") {
    errors.push("pedidoID é obrigatório e deve ser string");
  }
  if (!dados.motivo || typeof dados.motivo !== "string") {
    errors.push("motivo é obrigatório e deve ser string");
  }
  if (typeof dados.reembolsar !== "boolean") {
    errors.push("reembolsar é obrigatório e deve ser boolean");
  }
  if (typeof dados.notificarCliente !== "boolean") {
    errors.push("notificarCliente é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.cobrarTaxa !== undefined && typeof dados.cobrarTaxa !== "boolean") {
    errors.push("cobrarTaxa deve ser boolean");
  }
  if (dados.pagarMotoboy !== undefined && typeof dados.pagarMotoboy !== "boolean") {
    errors.push("pagarMotoboy deve ser boolean");
  }

  const allowedFields = ["pedidoID", "motivo", "reembolsar", "notificarCliente", "cobrarTaxa", "pagarMotoboy"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
