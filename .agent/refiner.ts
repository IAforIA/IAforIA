export type RefinementInput = {
  error: string;
  context?: Record<string, unknown>;
};

export type RefinementOutput = {
  summary: string;
  suggestedNextStep: string;
};

export function refine(input: RefinementInput): RefinementOutput {
  // Implementação mínima: mantém o agente funcional sem “auto-magia”.
  return {
    summary: input.error.slice(0, 500),
    suggestedNextStep: 'Reproduzir o erro localmente e gerar um patch pequeno com testes.'
  };
}
