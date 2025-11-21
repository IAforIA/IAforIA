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
  id: number;
  clientId: string;
  diaSemana: number;
  periodo: string;
  horaInicio: string;
  horaFim: string;
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
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todaySchedules = schedules.filter(s => s.diaSemana === currentDay);

  if (todaySchedules.length === 0) {
    return (
      <Badge variant="destructive">
        FECHADO (Folga)
      </Badge>
    );
  }

  const isOpen = todaySchedules.some(schedule => {
    return currentTime >= schedule.horaInicio && currentTime <= schedule.horaFim;
  });

  if (isOpen) {
    const closingTime = todaySchedules.reduce((latest, s) => 
      s.horaFim > latest ? s.horaFim : latest, "00:00"
    );
    return (
      <Badge className="bg-green-600 hover:bg-green-700" title={`Aberto até ${closingTime}`}>
        ABERTO
      </Badge>
    );
  }

  // Find next opening time
  const nextOpening = todaySchedules
    .filter(s => currentTime < s.horaInicio)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))[0];

  return (
    <Badge variant="destructive" title={nextOpening ? `Abre às ${nextOpening.horaInicio}` : "Fechado hoje"}>
      FECHADO
    </Badge>
  );
}
