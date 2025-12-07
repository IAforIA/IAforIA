import { ValidationResult } from "../../types/schema";

export function validateAcionarSuporte(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.tipo || typeof dados.tipo !== "string") {
    errors.push("tipo é obrigatório e deve ser string");
  }
  if (typeof dados.urgente !== "boolean") {
    errors.push("urgente é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.descricao !== undefined && typeof dados.descricao !== "string") {
    errors.push("descricao deve ser string");
  }
  if (dados.acionarSeguro !== undefined && typeof dados.acionarSeguro !== "boolean") {
    errors.push("acionarSeguro deve ser boolean");
  }
  if (dados.notificarAutoridades !== undefined && typeof dados.notificarAutoridades !== "boolean") {
    errors.push("notificarAutoridades deve ser boolean");
  }

  const allowedFields = ["tipo", "urgente", "descricao", "acionarSeguro", "notificarAutoridades"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
