import { Badge } from "@/components/ui/badge";

type OrderStatus = "pending" | "in_progress" | "delivered" | "cancelled";

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig = {
  pending: { label: "Pendente", className: "bg-yellow-500 text-white hover:bg-yellow-600" },
  in_progress: { label: "Em Rota", className: "bg-blue-500 text-white hover:bg-blue-600" },
  delivered: { label: "Entregue", className: "bg-green-500 text-white hover:bg-green-600" },
  cancelled: { label: "Cancelado", className: "bg-red-500 text-white hover:bg-red-600" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge className={config.className} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
