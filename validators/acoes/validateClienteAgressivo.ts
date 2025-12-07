import { ValidationResult } from "../../types/schema";

export function validateClienteAgressivo(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.pedidoID || typeof dados.pedidoID !== "string") {
    errors.push("pedidoID é obrigatório e deve ser string");
  }
  if (typeof dados.urgente !== "boolean") {
    errors.push("urgente é obrigatório e deve ser boolean");
  }

  const allowedFields = ["pedidoID", "urgente"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
