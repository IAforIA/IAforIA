import { ValidationResult } from "../../types/schema";

export function validateCalcularLucro(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.periodo || typeof dados.periodo !== "string") {
    errors.push("periodo é obrigatório e deve ser string");
  }
  if (typeof dados.descontarCustos !== "boolean") {
    errors.push("descontarCustos é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.tipo !== undefined && typeof dados.tipo !== "string") {
    errors.push("tipo deve ser string");
  }

  const allowedFields = ["periodo", "descontarCustos", "tipo"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
