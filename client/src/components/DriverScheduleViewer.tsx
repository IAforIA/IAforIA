/**
 * ARQUIVO: client/src/components/DriverScheduleViewer.tsx
 * PROPÓSITO: Visualização completa da disponibilidade de um motoboy (read-only para Central)
 * USO: Central dashboard - tabela de motoboys
 */

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, AlertTriangle, CheckCircle2 } from "lucide-react";

const DAYS = [
  { num: 0, name: "Domingo", short: "Dom" },
  { num: 1, name: "Segunda", short: "Seg" },
  { num: 2, name: "Terça", short: "Ter" },
  { num: 3, name: "Quarta", short: "Qua" },
  { num: 4, name: "Quinta", short: "Qui" },
  { num: 5, name: "Sexta", short: "Sex" },
  { num: 6, name: "Sábado", short: "Sáb" },
];

const SHIFTS = [
  { key: "turnoManha", label: "Manhã", emoji: "🌅", time: "6-12h", color: "bg-yellow-500" },
  { key: "turnoTarde", label: "Tarde", emoji: "☀️", time: "12-18h", color: "bg-orange-500" },
  { key: "turnoNoite", label: "Noite", emoji: "🌙", time: "18-00h", color: "bg-blue-500" },
];

type Schedule = {
  id: string;
  motoboyId: string;
  diaSemana: number;
  turnoManha: boolean;
  turnoTarde: boolean;
  turnoNoite: boolean;
};

interface DriverScheduleViewerProps {
  motoboyId: string;
  motoboyName: string;
  compact?: boolean; // Se true, mostra versão compacta (badges inline)
}

export function DriverScheduleViewer({ motoboyId, motoboyName, compact = false }: DriverScheduleViewerProps) {
  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: [`/api/motoboys/${motoboyId}/schedules`],
    enabled: !!motoboyId,
    // Always refresh when opening the modal to avoid stale empty caches after seeding/edits
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  // Calcula estatísticas
  const totalShifts = schedules.reduce((sum, s) => 
    sum + (s.turnoManha ? 1 : 0) + (s.turnoTarde ? 1 : 0) + (s.turnoNoite ? 1 : 0), 0
  );
  const daysWorking = schedules.length;
  const currentDay = new Date().getDay();
  const currentHour = new Date().getHours();
  const currentShift = currentHour >= 6 && currentHour < 12 ? 'turnoManha' :
                       currentHour >= 12 && currentHour < 18 ? 'turnoTarde' : 'turnoNoite';
  
  const todaySchedule = schedules.find((s) => Number((s as any).diaSemana) === currentDay);
  const isAvailableNow = todaySchedule?.[currentShift as keyof Schedule] === true;

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Carregando...
      </div>
    );
  }

  if (schedules.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-600">
        <AlertTriangle className="w-4 h-4" />
        Sem disponibilidade configurada
      </div>
    );
  }

  // MODO COMPACTO: Badges inline para tabela
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1">
        {isAvailableNow ? (
          <Badge className="bg-green-500 text-white">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Disponível AGORA
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Indisponível agora
          </Badge>
        )}
        <Badge variant="secondary" className="text-xs">
          {daysWorking} dias • {totalShifts} turnos
        </Badge>
      </div>
    );
  }

  // MODO COMPLETO: Grid visual para modal/detalhes
  return (
    <div className="space-y-4">
      {/* Header com estatísticas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Disponibilidade de {motoboyName}</h3>
        </div>
        <div className="flex gap-2">
          {isAvailableNow ? (
            <Badge className="bg-green-500 text-white">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Disponível AGORA
            </Badge>
          ) : (
            <Badge variant="outline">Indisponível agora</Badge>
          )}
        </div>
      </div>

      {/* Estatísticas resumidas */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Dias Trabalhados</p>
          <p className="text-2xl font-bold">{daysWorking}/7</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Total Turnos</p>
          <p className="text-2xl font-bold">{totalShifts}</p>
        </Card>
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Média/Dia</p>
          <p className="text-2xl font-bold">{daysWorking > 0 ? (totalShifts / daysWorking).toFixed(1) : 0}</p>
        </Card>
      </div>

      {/* Grid de disponibilidade */}
      <div className="space-y-2">
        {DAYS.map(day => {
          const schedule = schedules.find((s) => Number((s as any).diaSemana) === day.num);
          const isToday = day.num === currentDay;

          if (!schedule) {
            return (
              <div 
                key={day.num}
                className={`flex items-center gap-2 p-2 rounded border ${
                  isToday ? 'border-primary bg-accent/30' : 'border-muted bg-muted/20'
                }`}
              >
                <div className="w-16 text-sm font-medium text-muted-foreground">
                  {day.short}
                  {isToday && <span className="ml-1 text-xs text-primary">(Hoje)</span>}
                </div>
                <div className="flex-1 text-sm text-muted-foreground italic">
                  Folga
                </div>
              </div>
            );
          }

          return (
            <div 
              key={day.num}
              className={`flex items-center gap-2 p-2 rounded border ${
                isToday ? 'border-primary bg-accent/30' : 'border-border'
              }`}
            >
              <div className="w-16 text-sm font-medium">
                {day.short}
                {isToday && <span className="ml-1 text-xs text-primary">(Hoje)</span>}
              </div>
              <div className="flex-1 flex gap-1">
                {SHIFTS.map(shift => {
                  const isActive = schedule[shift.key as keyof Schedule] === true;
                  const isCurrentShift = isToday && shift.key === currentShift;

                  if (!isActive) return null;

                  return (
                    <Badge 
                      key={shift.key}
                      className={`${shift.color} text-white text-xs ${
                        isCurrentShift ? 'ring-2 ring-green-400 ring-offset-2' : ''
                      }`}
                    >
                      {shift.emoji} {shift.label}
                    </Badge>
                  );
                })}
                {!schedule.turnoManha && !schedule.turnoTarde && !schedule.turnoNoite && (
                  <span className="text-xs text-muted-foreground italic">Sem turnos</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Insights */}
      <Card className="p-3 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-2">
          <div className="text-xl">🤖</div>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Análise AI
            </p>
            <div className="space-y-1 text-blue-800 dark:text-blue-200">
              {daysWorking < 5 && (
                <p>⚠️ Disponibilidade limitada ({daysWorking} dias) - considere solicitar mais horários</p>
              )}
              {totalShifts >= 15 && (
                <p>✅ Excelente cobertura ({totalShifts} turnos) - driver versátil</p>
              )}
              {!isAvailableNow && todaySchedule && (
                <p>📅 Hoje trabalha: {
                  SHIFTS.filter(s => todaySchedule[s.key as keyof Schedule]).map(s => s.label).join(', ')
                }</p>
              )}
              {!todaySchedule && (
                <p>🏖️ Folga hoje - não receberá pedidos automaticamente</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Componente auxiliar para mostrar apenas se está disponível AGORA (mini badge)
export function DriverAvailabilityBadge({ motoboyId }: { motoboyId: string }) {
  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: [`/api/motoboys/${motoboyId}/schedules`],
    enabled: !!motoboyId,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const currentDay = new Date().getDay();
  const currentHour = new Date().getHours();
  const currentShift = currentHour >= 6 && currentHour < 12 ? 'turnoManha' :
                       currentHour >= 12 && currentHour < 18 ? 'turnoTarde' : 'turnoNoite';
  
  const todaySchedule = schedules.find((s) => Number((s as any).diaSemana) === currentDay);
  const isAvailable = todaySchedule?.[currentShift as keyof Schedule] === true;

  if (schedules.length === 0) {
    return <Badge variant="outline" className="text-xs">Sem schedule</Badge>;
  }

  if (isAvailable) {
    return (
      <Badge className="bg-green-500 text-white text-xs">
        ✓ Disponível
      </Badge>
    );
  }

  // Show upcoming or off info instead of generic unavailable to reduce confusion
  if (todaySchedule) {
    const shiftOrder: Array<{ key: keyof Schedule; start: number; label: string }> = [
      { key: 'turnoManha', start: 6, label: '06h' },
      { key: 'turnoTarde', start: 12, label: '12h' },
      { key: 'turnoNoite', start: 18, label: '18h' },
    ];

    const activeShiftsToday = shiftOrder.filter(s => todaySchedule[s.key]);
    const upcoming = activeShiftsToday.find(s => currentHour < s.start);

    if (upcoming) {
      return (
        <Badge variant="secondary" className="text-xs text-muted-foreground">
          Próximo turno {upcoming.label}
        </Badge>
      );
    }

    if (activeShiftsToday.length > 0) {
      return (
        <Badge variant="secondary" className="text-xs text-muted-foreground">
          Turno de hoje encerrado
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-xs text-muted-foreground">
        Folga hoje
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="text-xs text-muted-foreground">
      Folga hoje
    </Badge>
  );
}
