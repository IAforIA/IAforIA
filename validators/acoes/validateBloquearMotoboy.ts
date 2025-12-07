import { ValidationResult } from "../../types/schema";

export function validateBloquearMotoboy(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.motoboyID || typeof dados.motoboyID !== "string") {
    errors.push("motoboyID é obrigatório e deve ser string");
  }
  if (!dados.motivo || typeof dados.motivo !== "string") {
    errors.push("motivo é obrigatório e deve ser string");
  }
  if (typeof dados.temporario !== "boolean") {
    errors.push("temporario é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.dias !== undefined && typeof dados.dias !== "number") {
    errors.push("dias deve ser number");
  }

  const allowedFields = ["motoboyID", "motivo", "temporario", "dias"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
