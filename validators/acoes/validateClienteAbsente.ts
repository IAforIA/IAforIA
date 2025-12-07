import { ValidationResult } from "../../types/schema";

export function validateClienteAbsente(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  // Campos obrigatórios
  if (!dados.pedidoID || typeof dados.pedidoID !== "string") {
    errors.push("pedidoID é obrigatório e deve ser string");
  }
  if (typeof dados.minutos !== "number") {
    errors.push("minutos é obrigatório e deve ser number");
  }

  // Rejeitar campos desconhecidos
  const allowedFields = ["pedidoID", "minutos"];
  const providedFields = Object.keys(dados);
  const unknownFields = providedFields.filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
