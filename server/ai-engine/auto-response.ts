export function generateAutoResponse(message: string, userRole: string): string | null {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("status") || lowerMsg.includes("onde está")) {
    return "Seu pedido está em andamento. Acompanhe em tempo real pelo painel.";
  }

  if (lowerMsg.includes("cancelar")) {
    return "Para cancelar, entre em contato com a central. Pedidos já aceitos podem ter taxa de cancelamento.";
  }

  if (lowerMsg.includes("preço") || lowerMsg.includes("valor")) {
    return "O valor é calculado automaticamente baseado na distância e horário. Consulte a taxa no pedido.";
  }

  if (lowerMsg.includes("urgente")) {
    return "Pedidos urgentes têm prioridade. A taxa pode ser ajustada conforme disponibilidade.";
  }

  return null;
}
