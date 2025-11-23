/**
 * ARQUIVO: client/src/components/OrderCard.tsx
 * PROPÓSITO: Representa um pedido com origem/destino, status e CTA opcional
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, User, Eye, CreditCard, Banknote, Smartphone } from "lucide-react";
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
  // STEP 3: Payment info
  formaPagamento?: string;
  hasTroco?: boolean;
  trocoValor?: string | number | null;
  // STEP 3: Address details
  complemento?: string;
  referencia?: string;
  observacoes?: string;
  // Produto
  produtoNome?: string | null;
  produtoQuantidade?: number | null;
  produtoPrecoUnitario?: string | number | null;
  produtoValorTotal?: string | number | null;
}

export default function OrderCard({ 
  id, 
  origin, 
  destination, 
  status, 
  value, 
  driverName,
  onView,
  // STEP 3: Payment & Address
  formaPagamento,
  hasTroco,
  trocoValor,
  complemento,
  referencia,
  observacoes,
  // Produto
  produtoNome,
  produtoQuantidade,
  produtoPrecoUnitario,
  produtoValorTotal,
}: OrderCardProps) {
  // Helper to get payment icon
  const getPaymentIcon = () => {
    if (formaPagamento === 'cartao') return <CreditCard className="w-3 h-3" />;
    if (formaPagamento === 'pix') return <Smartphone className="w-3 h-3" />;
    return <Banknote className="w-3 h-3" />;
  };

  // Helper to get payment label
  const getPaymentLabel = () => {
    if (formaPagamento === 'cartao') return 'Cartão';
    if (formaPagamento === 'pix') return 'Pix';
    return 'Dinheiro';
  };

  return (
    <Card className="p-3 sm:p-4 hover-elevate" data-testid={`card-order-${id}`}>
      {/* Cabeçalho: ID do pedido + badge de status */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-xs sm:text-sm font-mono text-muted-foreground truncate" data-testid="text-order-id">#{id}</span>
        <StatusBadge status={status} />
      </div>
      
      {/* Bloco central reutiliza iconografia para indicar rota */}
      <div className="space-y-1.5 sm:space-y-2 mb-3 sm:mb-4">
        <div className="flex items-start gap-1.5 sm:gap-2">
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium line-clamp-2 sm:truncate" data-testid="text-origin">{origin}</p>
            {/* STEP 3: Show pickup complemento/referencia */}
            {(complemento || referencia) && (
              <p className="text-xs text-muted-foreground mt-1">
                {complemento && <span className="line-clamp-1">{complemento}</span>}
                {complemento && referencia && <span> • </span>}
                {referencia && <span className="line-clamp-1">{referencia}</span>}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 sm:gap-2 pl-5 sm:pl-6">
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
        </div>
        
        <div className="flex items-start gap-1.5 sm:gap-2">
          <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium line-clamp-2 sm:truncate" data-testid="text-destination">{destination}</p>
          </div>
        </div>

        {/* STEP 3: Show observations if present */}
        {observacoes && (
          <div className="text-xs text-muted-foreground italic pl-5 sm:pl-6 pt-1 line-clamp-2">
            "{observacoes}"
          </div>
        )}
      </div>

      {/* Produto Info */}
      {produtoNome && (
        <div className="mb-2 sm:mb-3 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-100 line-clamp-2">{produtoNome}</p>
              {produtoQuantidade && produtoPrecoUnitario && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {produtoQuantidade} × R$ {typeof produtoPrecoUnitario === 'string' ? parseFloat(produtoPrecoUnitario).toFixed(2) : produtoPrecoUnitario.toFixed(2)}
                </p>
              )}
            </div>
            {produtoValorTotal && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-amber-700 dark:text-amber-300 whitespace-nowrap">Cobrar</p>
                <p className="text-base sm:text-lg font-bold text-amber-900 dark:text-amber-100">
                  R$ {typeof produtoValorTotal === 'string' ? parseFloat(produtoValorTotal).toFixed(2) : produtoValorTotal.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: Payment Method Badge */}
      {formaPagamento && (
        <div className="mb-2 sm:mb-3 flex gap-1.5 sm:gap-2 flex-wrap">
          <Badge variant="secondary" className="flex items-center gap-1 text-xs">
            {getPaymentIcon()}
            <span className="hidden sm:inline">{getPaymentLabel()}</span>
            <span className="sm:hidden">{formaPagamento === 'cartao' ? 'Cartão' : formaPagamento === 'pix' ? 'Pix' : 'Dinheiro'}</span>
          </Badge>
          {hasTroco && trocoValor && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <Banknote className="w-3 h-3" />
              <span>Troco p/ R$ {typeof trocoValor === 'string' ? parseFloat(trocoValor).toFixed(2) : trocoValor.toFixed(2)}</span>
            </Badge>
          )}
        </div>
      )}
      
      <div className="flex items-center justify-between pt-2 sm:pt-3 border-t">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
          {/* Driver só aparece quando front recebe motoboyName */}
          {driverName && (
            <>
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs sm:text-sm text-muted-foreground truncate" data-testid="text-driver-name">{driverName}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span className="text-base sm:text-lg font-semibold whitespace-nowrap" data-testid="text-order-value">
            R$ {typeof value === 'string' ? parseFloat(value).toFixed(2) : value.toFixed(2)}
          </span>
          {/* CTA opcional permite abrir modal/detalhe conforme tela hospedeira */}
          {onView && (
            <Button size="icon" variant="ghost" onClick={onView} data-testid="button-view-order" className="h-8 w-8 sm:h-10 sm:w-10">
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
