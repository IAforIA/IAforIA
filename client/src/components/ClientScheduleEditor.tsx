/**
 * ARQUIVO: client/src/components/ClientScheduleEditor.tsx
 * PROPÓSITO: Editor de horários de funcionamento para clientes (editable)
 * 
 * FUNCIONALIDADES:
 * - Permite cliente definir horários de abertura/fechamento
 * - Grid de 7 dias com campos de hora início/fim
 * - Checkbox para marcar dias de FOLGA
 * - Salva automaticamente no backend
 * - Validação de horários (início < fim)
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Save } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientScheduleEntry {
  id?: string;
  clientId: string;
  diaSemana: number;
  horaAbertura: string | null;
  horaFechamento: string | null;
  fechado: boolean;
}

interface DaySchedule {
  diaSemana: number;
  isClosed: boolean;
  horaInicio: string;
  horaFim: string;
}

interface ClientScheduleEditorProps {
  clientId: string | number; // Aceita ambos
}

const DIAS_SEMANA = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

export function ClientScheduleEditor({ clientId }: ClientScheduleEditorProps) {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<DaySchedule[]>(
    DIAS_SEMANA.map(d => ({
      diaSemana: d.value,
      isClosed: false,
      horaInicio: "08:00",
      horaFim: "18:00",
    }))
  );

  // Fetch existing schedules
  const { data: existingSchedules, isLoading } = useQuery<ClientScheduleEntry[]>({
    queryKey: ["client-schedules", clientId],
    queryFn: async () => {
        const res = await apiRequest('GET', `/api/clients/${clientId}/schedules`);
      return res.json();
    },
  });

  // Load existing schedules into state
  useEffect(() => {
    if (existingSchedules && existingSchedules.length > 0) {
      const newSchedules = DIAS_SEMANA.map(day => {
        const daySchedules = existingSchedules.filter(s => s.diaSemana === day.value);
        
        if (daySchedules.length === 0) {
          return {
            diaSemana: day.value,
            isClosed: true,
            horaInicio: "08:00",
            horaFim: "18:00",
          };
        }

        // Check if day is closed or has hours
        const isClosed = daySchedules[0].fechado;
        
        return {
          diaSemana: day.value,
          isClosed: isClosed,
          horaInicio: daySchedules[0].horaAbertura || "08:00",
          horaFim: daySchedules[0].horaFechamento || "18:00",
        };
      });

      setSchedules(newSchedules);
    }
  }, [existingSchedules]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (daySchedule: DaySchedule) => {
      console.log('🔵 ClientScheduleEditor - Salvando:', daySchedule);
      
      // Determina o período baseado em isClosed
      const periodo = daySchedule.isClosed ? "Fechado" : "Integral";
      const horaInicio = daySchedule.horaInicio;
      const horaFim = daySchedule.horaFim;

      console.log('🔵 Dados a enviar:', { 
        clientId, 
        diaSemana: daySchedule.diaSemana, 
        periodo,
        horaInicio, 
        horaFim 
      });

      // Validação básica
      if (!daySchedule.isClosed && (!horaInicio || !horaFim)) {
        throw new Error("Defina horário de início e fim");
      }

      try {
        // POST simples - backend já deleta schedules existentes do dia
        const url = `/api/clients/${clientId}/schedules`;
        console.log('🔵 URL da requisição:', url);
        console.log('🔵 clientId usado:', clientId, 'tipo:', typeof clientId);
        
        const res = await apiRequest('POST', url, {
          diaSemana: daySchedule.diaSemana,
          periodo,
          horaInicio,
          horaFim,
        });
        
        console.log('🔵 Resposta do servidor:', res.status, res.statusText);
        
        // Verifica content-type antes de fazer parse
        const contentType = res.headers.get('content-type');
        console.log('🔵 Content-Type:', contentType);
        
        if (!contentType || !contentType.includes('application/json')) {
          const text = await res.text();
          console.error('❌ Resposta não é JSON:', text);
          throw new Error('Servidor retornou resposta inválida');
        }
        
        const data = await res.json();
        console.log('🔵 Dados recebidos:', data);
        return data;
      } catch (error) {
        console.error('❌ Erro na requisição:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-schedules", clientId] });
      // Invalida também a query da central para atualizar badges lá
      queryClient.invalidateQueries({ queryKey: ['/api/schedules/all-clients'] });
      toast({
        title: "Horário salvo!",
        description: "Suas alterações foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleToggleClosed = (diaSemana: number, closed: boolean) => {
    setSchedules(prev =>
      prev.map(s => s.diaSemana === diaSemana ? { ...s, isClosed: closed } : s)
    );
  };

  const handleTimeChange = (diaSemana: number, field: 'horaInicio' | 'horaFim', value: string) => {
    setSchedules(prev =>
      prev.map(s => s.diaSemana === diaSemana ? { ...s, [field]: value } : s)
    );
  };

  const handleSave = (diaSemana: number) => {
    const schedule = schedules.find(s => s.diaSemana === diaSemana);
    if (!schedule) return;

    // Validate times
    if (!schedule.isClosed && schedule.horaInicio >= schedule.horaFim) {
      toast({
        title: "Horário inválido",
        description: "Horário de abertura deve ser antes do fechamento.",
        variant: "destructive",
      });
      return;
    }

    saveMutation.mutate(schedule);
  };

  const currentDay = new Date().getDay();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configurar Horário de Funcionamento
          </CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <CardTitle>Configurar Horário de Funcionamento</CardTitle>
        </div>
        <CardDescription>
          Defina os horários em que seu estabelecimento está aberto para receber pedidos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {schedules.map((schedule, index) => {
            const isToday = schedule.diaSemana === currentDay;
            const dayLabel = DIAS_SEMANA[index].label;

            return (
              <div
                key={schedule.diaSemana}
                className={`
                  flex items-center gap-4 p-4 rounded-lg border-2
                  ${isToday ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'}
                `}
              >
                {/* Day name */}
                <div className="w-24 font-semibold">
                  {dayLabel}
                  {isToday && (
                    <Badge variant="default" className="ml-2 text-xs">
                      HOJE
                    </Badge>
                  )}
                </div>

                {/* Closed checkbox */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`closed-${schedule.diaSemana}`}
                    checked={schedule.isClosed}
                    onCheckedChange={(checked) => 
                      handleToggleClosed(schedule.diaSemana, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`closed-${schedule.diaSemana}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    Fechado
                  </label>
                </div>

                {/* Time inputs (only if not closed) */}
                {!schedule.isClosed && (
                  <>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Input
                        type="time"
                        value={schedule.horaInicio}
                        onChange={(e) => 
                          handleTimeChange(schedule.diaSemana, 'horaInicio', e.target.value)
                        }
                        className="w-32"
                      />
                      <span className="text-muted-foreground">às</span>
                      <Input
                        type="time"
                        value={schedule.horaFim}
                        onChange={(e) => 
                          handleTimeChange(schedule.diaSemana, 'horaFim', e.target.value)
                        }
                        className="w-32"
                      />
                    </div>
                  </>
                )}

                {/* Save button */}
                <Button
                  size="sm"
                  onClick={() => handleSave(schedule.diaSemana)}
                  disabled={saveMutation.isPending}
                  className="ml-auto"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Dica:</strong> Marque como "Fechado" os dias em que você não opera. 
            Defina os horários de abertura e fechamento para cada dia que funciona.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
