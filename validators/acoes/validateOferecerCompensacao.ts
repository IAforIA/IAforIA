import { ValidationResult } from "../../types/schema";

export function validateOferecerCompensacao(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.tipo || typeof dados.tipo !== "string") {
    errors.push("tipo é obrigatório e deve ser string");
  }

  // Campos opcionais
  if (dados.percentual !== undefined && typeof dados.percentual !== "number") {
    errors.push("percentual deve ser number");
  }
  if (dados.validadeProximoPedido !== undefined && typeof dados.validadeProximoPedido !== "boolean") {
    errors.push("validadeProximoPedido deve ser boolean");
  }
  if (dados.incluirFrete !== undefined && typeof dados.incluirFrete !== "boolean") {
    errors.push("incluirFrete deve ser boolean");
  }
  if (dados.cupomExtra !== undefined && typeof dados.cupomExtra !== "number") {
    errors.push("cupomExtra deve ser number");
  }

  const allowedFields = ["tipo", "percentual", "validadeProximoPedido", "incluirFrete", "cupomExtra"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
