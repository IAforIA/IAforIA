import { ValidationResult } from "../../types/schema";

export function validatePriorizarVip(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.nivel || typeof dados.nivel !== "string") {
    errors.push("nivel é obrigatório e deve ser string");
  }

  // Campos opcionais
  if (dados.clienteID !== undefined && typeof dados.clienteID !== "string") {
    errors.push("clienteID deve ser string");
  }
  if (dados.estabelecimento !== undefined && typeof dados.estabelecimento !== "string") {
    errors.push("estabelecimento deve ser string");
  }
  if (dados.tempoMaximo !== undefined && typeof dados.tempoMaximo !== "number") {
    errors.push("tempoMaximo deve ser number");
  }
  if (dados.garantiaEntrega !== undefined && typeof dados.garantiaEntrega !== "boolean") {
    errors.push("garantiaEntrega deve ser boolean");
  }

  const allowedFields = ["nivel", "clienteID", "estabelecimento", "tempoMaximo", "garantiaEntrega"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
