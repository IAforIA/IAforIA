/**
 * ARQUIVO: client/src/components/OperationalInsights.tsx
 * PROPÃ“SITO: Dashboard operacional para gestÃ£o de motoboys
 * 
 * ANÃLISES:
 * - Demanda por perÃ­odo (horÃ¡rios de pico)
 * - Clientes ativos por turno
 * - RecomendaÃ§Ã£o de motoboys necessÃ¡rios
 * - Cobertura atual vs demanda esperada
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, TrendingUp, AlertTriangle, Info } from "lucide-react";

interface ClientScheduleEntry {
  id: string;
  clientId: string;
  diaSemana: number;
  horaAbertura: string | null;
  horaFechamento: string | null;
  fechado: boolean;
}

interface MotoboySchedule {
  id: string;
  motoboyId: string;
  diaSemana: number;
  turnoManha: boolean;  // 6h-12h
  turnoTarde: boolean;  // 12h-18h
  turnoNoite: boolean;  // 18h-00h
}

interface OperationalInsightsProps {
  clientSchedules: ClientScheduleEntry[];
  motoboySchedules: MotoboySchedule[];
  motoboysOnline: number;
}

type Shift = 'manha' | 'tarde' | 'noite';

interface ShiftAnalysis {
  shift: Shift;
  label: string;
  hours: string;
  clientsActive: number;
  motoboysAvailable: number;
  recommended: number;
  status: 'ok' | 'warning' | 'critical';
}

export function OperationalInsights({ 
  clientSchedules, 
  motoboySchedules,
  motoboysOnline,
}: OperationalInsightsProps) {
  
  const currentDay = new Date().getDay();

  // Quantidade de motoboys que possuem escala para o dia atual (qualquer turno)
  const motoboysScheduledToday = motoboySchedules.filter((s) => s.diaSemana === currentDay).length;
  
  // Analisa cada turno do dia
  const analyzeShift = (shift: Shift): ShiftAnalysis => {
    const shiftConfig = {
      manha: { label: 'ManhÃ£', hours: '06:00-12:00', start: '06:00', end: '12:00' },
      tarde: { label: 'Tarde', hours: '12:00-18:00', start: '12:00', end: '18:00' },
      noite: { label: 'Noite', hours: '18:00-00:00', start: '18:00', end: '00:00' },
    };

    const config = shiftConfig[shift];
    
    // Conta clientes ativos neste turno
    const clientsActive = clientSchedules.filter(schedule => {
      if (schedule.diaSemana !== currentDay || schedule.fechado) return false;
      if (!schedule.horaAbertura || !schedule.horaFechamento) return false;
      
      // Cliente opera neste turno se hÃ¡ sobreposiÃ§Ã£o de horÃ¡rios
      return (
        schedule.horaAbertura < config.end && 
        schedule.horaFechamento > config.start
      );
    }).length;

    // Conta motoboys disponÃ­veis neste turno
    const motoboysAvailable = motoboySchedules.filter(schedule => {
      if (schedule.diaSemana !== currentDay) return false;
      
      if (shift === 'manha') return schedule.turnoManha;
      if (shift === 'tarde') return schedule.turnoTarde;
      if (shift === 'noite') return schedule.turnoNoite;
      return false;
    }).length;

    // REGRA DE NEGÃ“CIO: 1 motoboy para cada 3-4 clientes ativos
    // Considera tambÃ©m um mÃ­nimo de 2 motoboys se houver clientes
    const recommended = clientsActive > 0 
      ? Math.max(2, Math.ceil(clientsActive / 3.5))
      : 0;

    const coverage = motoboysAvailable / (recommended || 1);
    const status: 'ok' | 'warning' | 'critical' = 
      coverage >= 1 ? 'ok' :
      coverage >= 0.7 ? 'warning' : 'critical';

    return {
      shift,
      label: config.label,
      hours: config.hours,
      clientsActive,
      motoboysAvailable,
      recommended,
      status,
    };
  };

  const shifts: ShiftAnalysis[] = [
    analyzeShift('manha'),
    analyzeShift('tarde'),
    analyzeShift('noite'),
  ];

  const totalClientsToday = clientSchedules.filter((s) => 
    Number((s as any).diaSemana) === currentDay && !s.fechado && s.horaAbertura && s.horaFechamento
  ).length;

  const getStatusBadge = (status: 'ok' | 'warning' | 'critical') => {
    if (status === 'ok') {
      return <Badge className="bg-green-600">Cobertura OK</Badge>;
    }
    if (status === 'warning') {
      return <Badge className="bg-yellow-600">AtenÃ§Ã£o</Badge>;
    }
    return <Badge variant="destructive">CrÃ­tico</Badge>;
  };

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'SÃ¡b'];

  return (
    <div className="space-y-4">
      {/* PrevisÃ£o Semanal primeiro para destacar clientes por dia */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>PrevisÃ£o Semanal</CardTitle>
          </div>
          <CardDescription>Clientes operando por dia. Ãštil para planejar escalas antes do dia.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map(day => {
              const clientsThisDay = clientSchedules.filter((s) => 
                Number((s as any).diaSemana) === day && !s.fechado && s.horaAbertura && s.horaFechamento
              ).length;
              const isToday = day === currentDay;
              return (
                <div 
                  key={day}
                  className={`text-center p-3 rounded-lg ${
                    isToday 
                      ? 'bg-blue-100 dark:bg-blue-900 border-2 border-blue-500' 
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <div className="text-xs font-semibold mb-1">
                    {daysOfWeek[day]}
                  </div>
                  <div className="text-2xl font-bold">
                    {clientsThisDay}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    clientes
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>AnÃ¡lise Operacional - {daysOfWeek[currentDay]}</CardTitle>
          </div>
          <CardDescription>
            VisÃ£o rÃ¡pida: clientes abertos hoje Ã— motoboys escalados Ã— recomendaÃ§Ã£o mÃ­nima.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {totalClientsToday}
              </div>
              <div className="text-xs text-muted-foreground">
                Clientes Ativos Hoje
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {motoboysScheduledToday}
              </div>
              <div className="text-xs text-muted-foreground">
                Motoboys com escala hoje
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {Math.ceil(totalClientsToday / 3.5)}
              </div>
              <div className="text-xs text-muted-foreground">
                Recomendado (1:3.5)
              </div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {motoboysOnline}
              </div>
              <div className="text-xs text-muted-foreground">
                Motoboys online agora
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AnÃ¡lise por Turno */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Cobertura por Turno</CardTitle>
          </div>
          <CardDescription className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            Verde = cobertura ok | Amarelo = atenÃ§Ã£o | Vermelho = faltando motoboy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {shifts.map(shift => (
              <div 
                key={shift.shift}
                className="border rounded-lg p-4 hover:bg-muted/50 transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="font-semibold text-lg">{shift.label}</div>
                    <div className="text-sm text-muted-foreground">{shift.hours}</div>
                  </div>
                  {getStatusBadge(shift.status)}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Clientes Ativos</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {shift.clientsActive}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Motoboys DisponÃ­veis</div>
                    <div className="text-2xl font-bold text-green-600">
                      {shift.motoboysAvailable}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Recomendado</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {shift.recommended}
                    </div>
                  </div>
                </div>

                {shift.status !== 'ok' && shift.clientsActive > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 rounded flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-xs text-yellow-800 dark:text-yellow-200">
                      {shift.motoboysAvailable < shift.recommended 
                        ? `Faltam ${shift.recommended - shift.motoboysAvailable} motoboy(s) para cobertura ideal`
                        : 'Cobertura adequada'
                      }
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* (Cobertura por Turno vem em seguida) */}
    </div>
  );
}
