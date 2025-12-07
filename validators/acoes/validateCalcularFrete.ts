import { ValidationResult } from "../../types/schema";

export function validateCalcularFrete(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.origem || typeof dados.origem !== "string") {
    errors.push("origem é obrigatório e deve ser string");
  }
  if (!dados.destino || typeof dados.destino !== "string") {
    errors.push("destino é obrigatório e deve ser string");
  }

  // Campos opcionais
  if (dados.distancia_km !== undefined && typeof dados.distancia_km !== "number") {
    errors.push("distancia_km deve ser number");
  }

  const allowedFields = ["origem", "destino", "distancia_km"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
