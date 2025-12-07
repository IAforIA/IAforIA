import { ValidationResult } from "../../types/schema";

export function validateDetectarDivergencia(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.tipo || typeof dados.tipo !== "string") {
    errors.push("tipo é obrigatório e deve ser string");
  }
  if (typeof dados.investigar !== "boolean") {
    errors.push("investigar é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.valor !== undefined && typeof dados.valor !== "number") {
    errors.push("valor deve ser number");
  }
  if (dados.data !== undefined && typeof dados.data !== "string") {
    errors.push("data deve ser string");
  }
  if (dados.clienteID !== undefined && typeof dados.clienteID !== "string") {
    errors.push("clienteID deve ser string");
  }
  if (dados.verificarHistorico !== undefined && typeof dados.verificarHistorico !== "boolean") {
    errors.push("verificarHistorico deve ser boolean");
  }

  const allowedFields = ["tipo", "investigar", "valor", "data", "clienteID", "verificarHistorico"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
