import { ValidationResult } from "../../types/schema";

export function validateProdutoEstragado(dados: any): ValidationResult {
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

  const allowedFields = ["pedidoID", "motivo"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
