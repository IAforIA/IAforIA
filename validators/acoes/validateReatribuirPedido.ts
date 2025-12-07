import { ValidationResult } from "../../types/schema";

export function validateReatribuirPedido(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.pedidoID || typeof dados.pedidoID !== "string") {
    errors.push("pedidoID é obrigatório e deve ser string");
  }
  if (!dados.motoboyNovo || typeof dados.motoboyNovo !== "string") {
    errors.push("motoboyNovo é obrigatório e deve ser string");
  }
  if (typeof dados.urgente !== "boolean") {
    errors.push("urgente é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.motoboyAnterior !== undefined && typeof dados.motoboyAnterior !== "string") {
    errors.push("motoboyAnterior deve ser string");
  }
  if (dados.criterio !== undefined && typeof dados.criterio !== "string") {
    errors.push("criterio deve ser string");
  }

  const allowedFields = ["pedidoID", "motoboyNovo", "urgente", "motoboyAnterior", "criterio"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
