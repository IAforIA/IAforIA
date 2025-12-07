import { ValidationResult } from "../../types/schema";

export function validatePrimeiroLogin(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.motoboyID || typeof dados.motoboyID !== "string") {
    errors.push("motoboyID é obrigatório e deve ser string");
  }

  const allowedFields = ["motoboyID"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
