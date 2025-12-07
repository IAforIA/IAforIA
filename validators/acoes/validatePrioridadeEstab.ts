import { ValidationResult } from "../../types/schema";

export function validatePrioridadeEstab(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.estabelecimentoID || typeof dados.estabelecimentoID !== "string") {
    errors.push("estabelecimentoID é obrigatório e deve ser string");
  }
  if (!dados.nivel || typeof dados.nivel !== "string") {
    errors.push("nivel é obrigatório e deve ser string");
  }

  const allowedFields = ["estabelecimentoID", "nivel"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
