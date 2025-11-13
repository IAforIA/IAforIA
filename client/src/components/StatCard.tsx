import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconClassName?: string;
}

export default function StatCard({ title, value, icon: Icon, iconClassName = "text-primary" }: StatCardProps) {
  return (
    <Card className="p-6" data-testid={`card-stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold" data-testid={`text-stat-value`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center ${iconClassName}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}
