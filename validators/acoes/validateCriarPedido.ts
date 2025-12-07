import { ValidationResult } from "../../types/schema";

export function validateCriarPedido(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.clienteID || typeof dados.clienteID !== "string") {
    errors.push("clienteID é obrigatório e deve ser string");
  }
  if (!dados.endereco || typeof dados.endereco !== "string") {
    errors.push("endereco é obrigatório e deve ser string");
  }
  if (typeof dados.valor !== "number") {
    errors.push("valor é obrigatório e deve ser number");
  }
  if (!dados.status || typeof dados.status !== "string") {
    errors.push("status é obrigatório e deve ser string");
  }

  const allowedFields = ["clienteID", "endereco", "valor", "status"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
