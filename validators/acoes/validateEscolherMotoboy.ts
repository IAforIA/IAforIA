import { ValidationResult } from "../../types/schema";

export function validateEscolherMotoboy(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.criterio || typeof dados.criterio !== "string") {
    errors.push("criterio é obrigatório e deve ser string");
  }
  if (typeof dados.considerarHorario !== "boolean") {
    errors.push("considerarHorario é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.pedidoID !== undefined && typeof dados.pedidoID !== "string") {
    errors.push("pedidoID deve ser string");
  }
  if (dados.localidade !== undefined && typeof dados.localidade !== "string") {
    errors.push("localidade deve ser string");
  }
  if (dados.timeout !== undefined && typeof dados.timeout !== "number") {
    errors.push("timeout deve ser number");
  }

  const allowedFields = ["criterio", "considerarHorario", "pedidoID", "localidade", "timeout"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
