import { ValidationResult } from "../../types/schema";

export function validateDistribuirCarga(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.tipo || typeof dados.tipo !== "string") {
    errors.push("tipo é obrigatório e deve ser string");
  }

  // Campos opcionais
  if (dados.motoboyID !== undefined && typeof dados.motoboyID !== "string") {
    errors.push("motoboyID deve ser string");
  }
  if (dados.pedidosAtuais !== undefined && typeof dados.pedidosAtuais !== "number") {
    errors.push("pedidosAtuais deve ser number");
  }
  if (dados.limite !== undefined && typeof dados.limite !== "number") {
    errors.push("limite deve ser number");
  }
  if (dados.prioridade !== undefined && typeof dados.prioridade !== "string") {
    errors.push("prioridade deve ser string");
  }

  const allowedFields = ["tipo", "motoboyID", "pedidosAtuais", "limite", "prioridade"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
