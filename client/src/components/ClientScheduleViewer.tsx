/**
 * ARQUIVO: client/src/components/ClientScheduleViewer.tsx
 * PROPÓSITO: Visualização de horário de funcionamento do cliente (read-only)
 * 
 * FUNCIONALIDADES:
 * - Exibe horário de funcionamento semanal do cliente
 * - Mostra dias de funcionamento com horários de abertura/fechamento
 * - Indica dias de FOLGA claramente
 * - Destaca dia atual com borda especial
 * - Layout 7-day grid responsivo
 * 
 * ESTADOS VISUAIS:
 * - Funcionando: Badge verde com horários
 * - Folga: Badge vermelho "FECHADO"
 * - Dia atual: Borda azul destacada
 */

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientScheduleEntry {
  id: string;
  clientId: string;
  diaSemana: number; // 0 = Domingo, 6 = Sábado
  horaAbertura: string | null; // "08:00"
  horaFechamento: string | null; // "18:00"
  fechado: boolean; // true se dia está fechado
}

interface ClientScheduleViewerProps {
  clientId: number;
  clientName?: string;
}

const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado"
];

export function ClientScheduleViewer({ clientId, clientName }: ClientScheduleViewerProps) {
  const { data: schedules, isLoading } = useQuery<ClientScheduleEntry[]>({
    queryKey: ["client-schedules", clientId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/clients/${clientId}/schedules`, {});
      return res.json();
    },
  });

  // Get current day for highlighting
  const currentDay = new Date().getDay();

  // Group schedules by day
  const schedulesByDay = new Map<number, ClientScheduleEntry[]>();
  
  if (schedules) {
    schedules.forEach(entry => {
      const existing = schedulesByDay.get(entry.diaSemana) || [];
      existing.push(entry);
      schedulesByDay.set(entry.diaSemana, existing);
    });
  }

  // Calculate business hours for each day
  const getBusinessHours = (day: number): { open: string; close: string } | null => {
    const daySchedules = schedulesByDay.get(day);
    if (!daySchedules || daySchedules.length === 0) return null;

    // Check if day is closed
    const firstSchedule = daySchedules[0];
    if (firstSchedule.fechado || !firstSchedule.horaAbertura || !firstSchedule.horaFechamento) {
      return null;
    }

    return { open: firstSchedule.horaAbertura, close: firstSchedule.horaFechamento };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Horário de Funcionamento</CardTitle>
          </div>
          <CardDescription>Carregando horários...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <CardTitle>Horário de Funcionamento</CardTitle>
        </div>
        {clientName && (
          <CardDescription>
            Horários de {clientName}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {DIAS_SEMANA.map((dia, index) => {
            const hours = getBusinessHours(index);
            const isToday = index === currentDay;
            const daySchedules = schedulesByDay.get(index);

            return (
              <div
                key={index}
                className={`
                  rounded-lg border-2 p-3 transition-all
                  ${isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'}
                `}
              >
                <div className="font-semibold text-sm mb-2 text-center">
                  {dia}
                  {isToday && (
                    <Badge variant="default" className="ml-1 text-xs">
                      HOJE
                    </Badge>
                  )}
                </div>

                {hours ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3 text-green-600" />
                      <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300">
                        ABERTO
                      </Badge>
                    </div>
                    
                    <div className="text-center text-xs space-y-1">
                      <div className="font-medium">
                        {hours.open} - {hours.close}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2 py-2">
                    <Badge variant="destructive" className="text-xs">
                      FECHADO
                    </Badge>
                    <div className="text-[10px] text-gray-500">
                      Folga
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {(!schedules || schedules.length === 0) && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Horário de funcionamento não cadastrado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
