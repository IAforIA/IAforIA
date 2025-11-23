/**
 * ARQUIVO: client/src/components/StatCard.tsx
 * PROPÓSITO: Card compacto para exibir KPIs (texto, valor e ícone) em dashboards
 */

import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName?: string;
}

// Componente puro, recebe dados calculados externamente e só cuida do layout
export default function StatCard({ title, value, icon: Icon, iconClassName = "text-primary" }: StatCardProps) {
  return (
    <Card className="p-3 sm:p-4 md:p-6" data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-muted-foreground mb-0.5 sm:mb-1 truncate">{title}</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold" data-testid={`text-stat-value`}>{value}</p>
        </div>
        {/* Bolha do ícone mantém tamanho fixo e aceita customização de cor */}
        <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ${iconClassName}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
        </div>
      </div>
    </Card>
  );
}
