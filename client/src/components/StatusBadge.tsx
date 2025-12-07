/**
 * ARQUIVO: client/src/components/StatusBadge.tsx
 * PROPÓSITO: Mapear status do pedido para cores/labels consistentes
 */

import { Badge } from "@/components/ui/badge";

type OrderStatus = "pending" | "in_progress" | "delivered" | "cancelled";

interface StatusBadgeProps {
  status: OrderStatus;
}

// Dicionário centralizado evita duplicar strings e classes por status
const statusConfig = {
  pending: { label: "Pendente", className: "bg-yellow-500 text-white hover:bg-yellow-600" },
  in_progress: { label: "Em Rota", className: "bg-blue-500 text-white hover:bg-blue-600" },
  delivered: { label: "Entregue", className: "bg-green-500 text-white hover:bg-green-600" },
  cancelled: { label: "Cancelado", className: "bg-red-500 text-white hover:bg-red-600" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  if (!config) {
    return (
      <Badge className="bg-gray-200 text-gray-800" data-testid={`badge-status-unknown`}>
        Desconhecido
      </Badge>
    );
  }

  // Mantemos data-testid para facilitar testes end-to-end
  return (
    <Badge className={config.className} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
