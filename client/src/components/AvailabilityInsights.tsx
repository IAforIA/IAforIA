/**
 * ARQUIVO: client/src/components/AvailabilityInsights.tsx
 * PROPÓSITO: Widget AI que analisa disponibilidade dos motoboys e sugere otimizações
 * USO: Central dashboard - card de insights
 */

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Calendar, Clock } from "lucide-react";
import type { Motoboy } from "@shared/schema";

type Schedule = {
  id: string;
  motoboyId: string;
  diaSemana: number;
  turnoManha: boolean;
  turnoTarde: boolean;
  turnoNoite: boolean;
};

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SHIFTS = [
  { key: "turnoManha", label: "Manhã", hours: "6-12h" },
  { key: "turnoTarde", label: "Tarde", hours: "12-18h" },
  { key: "turnoNoite", label: "Noite", hours: "18-00h" },
];

interface AvailabilityInsightsProps {
  motoboys: Motoboy[];
}

export function AvailabilityInsights({ motoboys }: AvailabilityInsightsProps) {
  // Busca schedules de todos os motoboys ativos
  const activeMotoboys = motoboys.filter(m => m.online);
  
  const schedulesQueries = useQuery<Schedule[][]>({
    queryKey: ['/api/motoboys/all-schedules', activeMotoboys.map(m => m.id)],
    queryFn: async () => {
      const results = await Promise.all(
        activeMotoboys.map(m => 
          fetch(`/api/motoboys/${m.id}/schedules`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('guriri_token')}` }
          }).then(r => r.json())
        )
      );
      return results;
    },
    enabled: activeMotoboys.length > 0,
  });

  const allSchedules = schedulesQueries.data || [];
  
  // Análise de cobertura por dia/turno
  const coverage = Array.from({ length: 7 }, (_, day) => ({
    day,
    dayName: DAYS[day],
    shifts: SHIFTS.map(shift => ({
      shiftKey: shift.key,
      shiftLabel: shift.label,
      count: allSchedules.reduce((sum, motoboySchedules) => {
        const daySchedule = motoboySchedules.find((s: any) => Number(s.diaSemana) === day);
        return sum + (daySchedule?.[shift.key as keyof Schedule] ? 1 : 0);
      }, 0)
    }))
  }));

  // Identifica gaps críticos (< 2 motoboys disponíveis)
  const criticalGaps = coverage.flatMap(day => 
    day.shifts
      .filter(shift => shift.count < 2)
      .map(shift => ({
        day: day.dayName,
        shift: shift.shiftLabel,
        count: shift.count
      }))
  );

  // Identifica motoboys sem schedule configurado
  const noSchedule = activeMotoboys.filter((_, index) => 
    allSchedules[index]?.length === 0
  );

  // Calcula dia/turno com melhor cobertura
  const bestCoverage = coverage.flatMap(day => 
    day.shifts.map(shift => ({
      day: day.dayName,
      shift: shift.shiftLabel,
      count: shift.count
    }))
  ).sort((a, b) => b.count - a.count)[0];

  // Dia atual
  const currentDay = new Date().getDay();
  const currentHour = new Date().getHours();
  const currentShift = currentHour >= 6 && currentHour < 12 ? 'turnoManha' :
                       currentHour >= 12 && currentHour < 18 ? 'turnoTarde' : 'turnoNoite';
  const currentShiftLabel = SHIFTS.find(s => s.key === currentShift)?.label || '';
  
  const currentCoverage = coverage[currentDay].shifts.find(s => s.shiftKey === currentShift)?.count || 0;

  if (schedulesQueries.isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="w-4 h-4 animate-spin text-primary" />
          </div>
          <h3 className="font-semibold">Analisando disponibilidade...</h3>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm">🤖 Insights de Cobertura</h3>
        </div>
        <Badge variant="outline" className="text-xs">{activeMotoboys.length} online</Badge>
      </div>

      <div className="space-y-2">{}
        {/* Status atual */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <Calendar className="w-4 h-4 text-blue-600" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
              {DAYS[currentDay]} - {currentShiftLabel}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 truncate">
              {currentCoverage > 0 ? (
                <>{currentCoverage} motoboy{currentCoverage > 1 ? 's' : ''} disponível{currentCoverage > 1 ? 'eis' : ''}</>
              ) : (
                <>Nenhum disponível</>
              )}
            </p>
          </div>
          <Badge variant={currentCoverage > 0 ? "default" : "destructive"} className="text-xs">
            {currentCoverage > 0 ? 'OK' : 'Alerta'}
          </Badge>
        </div>{}

        {/* Gaps críticos */}
        {criticalGaps.length > 0 && (
          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <p className="font-semibold text-xs text-amber-900 dark:text-amber-100">
                {criticalGaps.length} Gap{criticalGaps.length > 1 ? 's' : ''} Crítico{criticalGaps.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-xs text-amber-800 dark:text-amber-200 space-y-0.5">
              {criticalGaps.slice(0, 3).map((gap, i) => (
                <div key={i}>• {gap.day.slice(0,3)} {gap.shift}: {gap.count === 0 ? 'Sem cobertura' : '1 motoboy'}</div>
              ))}
              {criticalGaps.length > 3 && <div className="text-amber-700">+{criticalGaps.length - 3} mais</div>}
            </div>
          </div>
        )}

        {/* Motoboys sem schedule */}
        {noSchedule.length > 0 && (
          <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <p className="font-semibold text-xs text-red-900 dark:text-red-100 mb-1">
              {noSchedule.length} Sem Disponibilidade
            </p>
            <div className="flex flex-wrap gap-1">
              {noSchedule.slice(0, 3).map(m => (
                <Badge key={m.id} variant="destructive" className="text-xs px-1.5 py-0">
                  {m.name.split(' ')[0]}
                </Badge>
              ))}
              {noSchedule.length > 3 && <Badge variant="outline" className="text-xs">+{noSchedule.length - 3}</Badge>}
            </div>
          </div>
        )}

        {/* Melhor cobertura */}
        {bestCoverage && bestCoverage.count > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <TrendingUp className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900 dark:text-green-100">
                Melhor Cobertura
              </p>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                {bestCoverage.day} - {bestCoverage.shift}: <strong>{bestCoverage.count} motoboys</strong> disponíveis
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                💡 Ideal para agendar promoções ou campanhas de marketing
              </p>
            </div>
          </div>
        )}

        {/* Recomendações AI */}
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
          <p className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
            🎯 Recomendações AI
          </p>
          <div className="space-y-1 text-sm text-purple-800 dark:text-purple-200">
            {criticalGaps.length > 3 && (
              <p>• Contrate mais motoboys ou negocie horários extras para cobrir gaps</p>
            )}
            {noSchedule.length > 0 && (
              <p>• Envie notificações automáticas para motoboys sem schedule configurado</p>
            )}
            {currentCoverage === 0 && (
              <p>• CRÍTICO: Configure plantão de emergência para o horário atual</p>
            )}
            {criticalGaps.length === 0 && noSchedule.length === 0 && (
              <p>✅ Excelente! Cobertura adequada em todos os períodos</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
