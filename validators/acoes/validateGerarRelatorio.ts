import { ValidationResult } from "../../types/schema";

export function validateGerarRelatorio(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.tipo || typeof dados.tipo !== "string") {
    errors.push("tipo é obrigatório e deve ser string");
  }

  // Campos opcionais
  if (dados.data !== undefined && typeof dados.data !== "string") {
    errors.push("data deve ser string");
  }
  if (dados.incluirDetalhes !== undefined && typeof dados.incluirDetalhes !== "boolean") {
    errors.push("incluirDetalhes deve ser boolean");
  }
  if (dados.clienteID !== undefined && typeof dados.clienteID !== "string") {
    errors.push("clienteID deve ser string");
  }
  if (dados.periodo !== undefined && typeof dados.periodo !== "string") {
    errors.push("periodo deve ser string");
  }

  const allowedFields = ["tipo", "data", "incluirDetalhes", "clienteID", "periodo"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
