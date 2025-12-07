import { ValidationResult } from "../../types/schema";

export function validateComunicarAtraso(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (typeof dados.atrasoMinutos !== "number") {
    errors.push("atrasoMinutos é obrigatório e deve ser number");
  }
  if (!dados.motivo || typeof dados.motivo !== "string") {
    errors.push("motivo é obrigatório e deve ser string");
  }

  // Campos opcionais
  if (dados.clienteID !== undefined && typeof dados.clienteID !== "string") {
    errors.push("clienteID deve ser string");
  }
  if (dados.estabelecimento !== undefined && typeof dados.estabelecimento !== "string") {
    errors.push("estabelecimento deve ser string");
  }
  if (dados.pedidoID !== undefined && typeof dados.pedidoID !== "string") {
    errors.push("pedidoID deve ser string");
  }
  if (dados.oferecerDesconto !== undefined && typeof dados.oferecerDesconto !== "boolean") {
    errors.push("oferecerDesconto deve ser boolean");
  }

  const allowedFields = ["atrasoMinutos", "motivo", "clienteID", "estabelecimento", "pedidoID", "oferecerDesconto"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
