import { ValidationResult } from "../../types/schema";

export function validateClienteAdicionalPedido(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (!dados.pedidoID || typeof dados.pedidoID !== "string") {
    errors.push("pedidoID é obrigatório e deve ser string");
  }
  if (!dados.item || typeof dados.item !== "string") {
    errors.push("item é obrigatório e deve ser string");
  }
  if (typeof dados.valor !== "number") {
    errors.push("valor é obrigatório e deve ser number");
  }

  const allowedFields = ["pedidoID", "item", "valor"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
