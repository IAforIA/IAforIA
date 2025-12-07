import { ValidationResult } from "../../types/schema";

export function validateAjustarMensalidade(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.clienteID || typeof dados.clienteID !== "string") {
    errors.push("clienteID é obrigatório e deve ser string");
  }
  if (!dados.tipoAjuste || typeof dados.tipoAjuste !== "string") {
    errors.push("tipoAjuste é obrigatório e deve ser string");
  }

  // Campos opcionais
  if (dados.percentual !== undefined && typeof dados.percentual !== "number") {
    errors.push("percentual deve ser number");
  }
  if (dados.temporario !== undefined && typeof dados.temporario !== "boolean") {
    errors.push("temporario deve ser boolean");
  }
  if (dados.justificativa !== undefined && typeof dados.justificativa !== "string") {
    errors.push("justificativa deve ser string");
  }

  const allowedFields = ["clienteID", "tipoAjuste", "percentual", "temporario", "justificativa"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
