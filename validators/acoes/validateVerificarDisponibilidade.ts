import { ValidationResult } from "../../types/schema";

export function validateVerificarDisponibilidade(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (typeof dados.verificarHorario !== "boolean") {
    errors.push("verificarHorario é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.motoboyID !== undefined && typeof dados.motoboyID !== "string") {
    errors.push("motoboyID deve ser string");
  }
  if (dados.localidade !== undefined && typeof dados.localidade !== "string") {
    errors.push("localidade deve ser string");
  }
  if (dados.status !== undefined && typeof dados.status !== "string") {
    errors.push("status deve ser string");
  }

  const allowedFields = ["verificarHorario", "motoboyID", "localidade", "status"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
