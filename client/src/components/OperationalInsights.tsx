/**
 * ARQUIVO: client/src/components/OperationalInsights.tsx
 * PROPÓSITO: Dashboard operacional para gestão de motoboys
 * 
 * ANÁLISES:
 * - Demanda por período (horários de pico)
 * - Clientes ativos por turno
 * - Recomendação de motoboys necessários
 * - Cobertura atual vs demanda esperada
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, TrendingUp, AlertTriangle } from "lucide-react";

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
  activeMotoboys: number;
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
  activeMotoboys 
}: OperationalInsightsProps) {
  
  const currentDay = new Date().getDay();
  
  // Analisa cada turno do dia
  const analyzeShift = (shift: Shift): ShiftAnalysis => {
    const shiftConfig = {
      manha: { label: 'Manhã', hours: '06:00-12:00', start: '06:00', end: '12:00' },
      tarde: { label: 'Tarde', hours: '12:00-18:00', start: '12:00', end: '18:00' },
      noite: { label: 'Noite', hours: '18:00-00:00', start: '18:00', end: '00:00' },
    };

    const config = shiftConfig[shift];
    
    // Conta clientes ativos neste turno
    const clientsActive = clientSchedules.filter(schedule => {
      if (schedule.diaSemana !== currentDay || schedule.fechado) return false;
      if (!schedule.horaAbertura || !schedule.horaFechamento) return false;
      
      // Cliente opera neste turno se há sobreposição de horários
      return (
        schedule.horaAbertura < config.end && 
        schedule.horaFechamento > config.start
      );
    }).length;

    // Conta motoboys disponíveis neste turno
    const motoboysAvailable = motoboySchedules.filter(schedule => {
      if (schedule.diaSemana !== currentDay) return false;
      
      if (shift === 'manha') return schedule.turnoManha;
      if (shift === 'tarde') return schedule.turnoTarde;
      if (shift === 'noite') return schedule.turnoNoite;
      return false;
    }).length;

    // REGRA DE NEGÓCIO: 1 motoboy para cada 3-4 clientes ativos
    // Considera também um mínimo de 2 motoboys se houver clientes
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

  const totalClientsToday = clientSchedules.filter(s => 
    s.diaSemana === currentDay && !s.fechado && s.horaAbertura && s.horaFechamento
  ).length;

  const getStatusBadge = (status: 'ok' | 'warning' | 'critical') => {
    if (status === 'ok') {
      return <Badge className="bg-green-600">Cobertura OK</Badge>;
    }
    if (status === 'warning') {
      return <Badge className="bg-yellow-600">Atenção</Badge>;
    }
    return <Badge variant="destructive">Crítico</Badge>;
  };

  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="space-y-4">
      {/* Resumo Geral */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Análise Operacional - {daysOfWeek[currentDay]}</CardTitle>
          </div>
          <CardDescription>
            Demanda esperada vs cobertura de motoboys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {totalClientsToday}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Clientes Ativos Hoje
              </div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {activeMotoboys}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Motoboys no Sistema
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {Math.ceil(totalClientsToday / 3.5)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Recomendado (1:3.5)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Análise por Turno */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Cobertura por Turno</CardTitle>
          </div>
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
                    <div className="text-sm text-gray-500">{shift.hours}</div>
                  </div>
                  {getStatusBadge(shift.status)}
                </div>

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div>
                    <div className="text-xs text-gray-500">Clientes Ativos</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {shift.clientsActive}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Motoboys Disponíveis</div>
                    <div className="text-2xl font-bold text-green-600">
                      {shift.motoboysAvailable}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Recomendado</div>
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

      {/* Previsão Semanal */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Previsão Semanal</CardTitle>
          </div>
          <CardDescription>Demanda de clientes por dia da semana</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {[0, 1, 2, 3, 4, 5, 6].map(day => {
              const clientsThisDay = clientSchedules.filter(s => 
                s.diaSemana === day && !s.fechado && s.horaAbertura && s.horaFechamento
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
                  <div className="text-[10px] text-gray-500 mt-1">
                    clientes
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
