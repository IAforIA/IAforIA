import { ValidationResult } from "../../types/schema";

export function validateVerificarAberto(dados: any): ValidationResult {
  const errors: string[] = [];

  if (typeof dados !== "object" || dados === null) {
    return { valid: false, errors: ["dados deve ser um objeto"] };
  }

  if (typeof dados.consultarHorario !== "boolean") {
    errors.push("consultarHorario é obrigatório e deve ser boolean");
  }

  // Campos opcionais
  if (dados.clienteID !== undefined && typeof dados.clienteID !== "string") {
    errors.push("clienteID deve ser string");
  }
  if (dados.estabelecimento !== undefined && typeof dados.estabelecimento !== "string") {
    errors.push("estabelecimento deve ser string");
  }
  if (dados.horario !== undefined && typeof dados.horario !== "string") {
    errors.push("horario deve ser string");
  }

  const allowedFields = ["consultarHorario", "clienteID", "estabelecimento", "horario"];
  const unknownFields = Object.keys(dados).filter(f => !allowedFields.includes(f));
  if (unknownFields.length > 0) {
    errors.push(`Campos desconhecidos: ${unknownFields.join(", ")}`);
  }

  return { valid: errors.length === 0, errors };
}
