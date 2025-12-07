import { ValidationResult } from "../../types/schema";

export function validateBloquearAutomatico(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.motivo || typeof dados.motivo !== "string") {
    errors.push("motivo é obrigatório e deve ser string");
  }
  if (typeof dados.temporario !== "boolean") {
    errors.push("temporario é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.clienteID !== undefined && typeof dados.clienteID !== "string") {
    errors.push("clienteID deve ser string");
  }
  if (dados.motoboyID !== undefined && typeof dados.motoboyID !== "string") {
    errors.push("motoboyID deve ser string");
  }
  if (dados.dias !== undefined && typeof dados.dias !== "number") {
    errors.push("dias deve ser number");
  }
  if (dados.investigar !== undefined && typeof dados.investigar !== "boolean") {
    errors.push("investigar deve ser boolean");
  }
  if (dados.suspenso !== undefined && typeof dados.suspenso !== "boolean") {
    errors.push("suspenso deve ser boolean");
  }

  const allowedFields = ["motivo", "temporario", "clienteID", "motoboyID", "dias", "investigar", "suspenso"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
