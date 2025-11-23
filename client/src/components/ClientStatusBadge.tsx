/**
 * ARQUIVO: client/src/components/ClientStatusBadge.tsx
 * PROPÓSITO: Badge mostrando se cliente está ABERTO ou FECHADO agora
 * 
 * FUNCIONALIDADES:
 * - Verifica horário atual contra schedule do cliente
 * - Badge verde "ABERTO" ou vermelho "FECHADO"
 * - Tooltip mostra horário de funcionamento
 * - Aceita schedules via props para evitar queries individuais
 */

import { Badge } from "@/components/ui/badge";

interface ClientScheduleEntry {
  id: string;
  clientId: string;
  diaSemana: number;
  horaAbertura: string | null;
  horaFechamento: string | null;
  fechado: boolean;
}

interface ClientStatusBadgeProps {
  clientId: string;
  schedules?: ClientScheduleEntry[]; // Pode receber schedules prontos
}

export function ClientStatusBadge({ clientId, schedules }: ClientStatusBadgeProps) {
  if (!schedules || schedules.length === 0) {
    return (
      <Badge variant="outline" className="bg-gray-100 dark:bg-gray-800 text-gray-600">
        SEM HORÁRIO
      </Badge>
    );
  }

  // Check if client is open now
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const todaySchedules = schedules.filter(s => s.diaSemana === currentDay);

  if (todaySchedules.length === 0 || todaySchedules[0].fechado || !todaySchedules[0].horaAbertura || !todaySchedules[0].horaFechamento) {
    return (
      <Badge variant="destructive">
        FECHADO (Folga)
      </Badge>
    );
  }

  const schedule = todaySchedules[0];
  
  // Convert time strings to minutes for proper comparison
  const parseTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Verifica se tem horários válidos
  if (!schedule.horaAbertura || !schedule.horaFechamento) {
    return (
      <Badge variant="destructive">
        FECHADO
      </Badge>
    );
  }

  const openTime = parseTimeToMinutes(schedule.horaAbertura);
  const closeTime = parseTimeToMinutes(schedule.horaFechamento);
  const isOpen = currentTimeInMinutes >= openTime && currentTimeInMinutes <= closeTime;

  if (isOpen) {
    return (
      <Badge className="bg-green-600 hover:bg-green-700" title={`Aberto até ${schedule.horaFechamento}`}>
        ABERTO
      </Badge>
    );
  }

  // Check if will open later today
  const willOpenLater = currentTimeInMinutes < openTime;

  return (
    <Badge variant="destructive" title={willOpenLater ? `Abre às ${schedule.horaAbertura}` : "Fechado hoje"}>
      FECHADO
    </Badge>
  );
}
