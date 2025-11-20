/**
 * ARQUIVO: client/src/components/OrderCard.tsx
 * PROPÓSITO: Representa um pedido com origem/destino, status e CTA opcional
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, User, Eye } from "lucide-react";
import StatusBadge from "./StatusBadge";

type OrderStatus = "pending" | "in_progress" | "delivered" | "cancelled";

interface OrderCardProps {
  id: string;
  origin: string;
  destination: string;
  status: OrderStatus;
  value: string | number;
  driverName?: string;
  onView?: () => void;
}

export default function OrderCard({ 
  id, 
  origin, 
  destination, 
  status, 
  value, 
  driverName,
  onView 
}: OrderCardProps) {
  return (
    <Card className="p-4 hover-elevate" data-testid={`card-order-${id}`}>
      {/* Cabeçalho: ID do pedido + badge de status */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-mono text-muted-foreground" data-testid="text-order-id">#{id}</span>
        <StatusBadge status={status} />
      </div>
      
      {/* Bloco central reutiliza iconografia para indicar rota */}
      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-origin">{origin}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pl-6">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
        
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-destination">{destination}</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t">
        <div className="flex items-center gap-2">
          {/* Driver só aparece quando front recebe motoboyName */}
          {driverName && (
            <>
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground" data-testid="text-driver-name">{driverName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold" data-testid="text-order-value">
            R$ {typeof value === 'string' ? parseFloat(value).toFixed(2) : value.toFixed(2)}
          </span>
          {/* CTA opcional permite abrir modal/detalhe conforme tela hospedeira */}
          {onView && (
            <Button size="icon" variant="ghost" onClick={onView} data-testid="button-view-order">
              <Eye className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
