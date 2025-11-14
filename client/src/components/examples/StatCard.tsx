import StatCard from '../StatCard';
import { Package, TruckIcon, CheckCircle, Users } from 'lucide-react';

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-4">
      <StatCard title="Total Pedidos" value="156" icon={Package} />
      <StatCard title="Em Andamento" value="23" icon={TruckIcon} />
      <StatCard title="Concluídos" value="128" icon={CheckCircle} />
      <StatCard title="Entregadores Ativos" value="12" icon={Users} />
    </div>
  );
}
