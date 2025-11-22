import { type LucideIcon } from "lucide-react";

interface GlassStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function GlassStatCard({ title, value, icon: Icon, trend, trendUp }: GlassStatCardProps) {
  return (
    <div className="glass-panel p-6 hover:scale-105 transition-transform duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <h3 className="text-3xl font-bold mt-2 text-white">{value}</h3>
          {trend && (
            <p className={`text-sm mt-2 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        <div className="glass-icon-wrapper">
          <Icon className="w-8 h-8 text-blue-400" />
        </div>
      </div>
    </div>
  );
}
