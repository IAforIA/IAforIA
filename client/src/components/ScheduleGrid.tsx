/**
 * ARQUIVO: client/src/components/ScheduleGrid.tsx
 * PROPÓSITO: Componente para gerenciar disponibilidade semanal do motoboy
 * INTERFACE: Grid 7×3 com toggles para Manhã/Tarde/Noite por dia
 */

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Check } from "lucide-react";

// Constants
const DAYS = [
  { num: 0, name: "Domingo", emoji: "🌅", short: "Dom" },
  { num: 1, name: "Segunda", emoji: "📅", short: "Seg" },
  { num: 2, name: "Terça", emoji: "📅", short: "Ter" },
  { num: 3, name: "Quarta", emoji: "📅", short: "Qua" },
  { num: 4, name: "Quinta", emoji: "📅", short: "Qui" },
  { num: 5, name: "Sexta", emoji: "📅", short: "Sex" },
  { num: 6, name: "Sábado", emoji: "🌙", short: "Sáb" },
];

const SHIFTS = [
  { key: "turnoManha", label: "Manhã", emoji: "🌅", time: "6h-12h", color: "bg-yellow-500" },
  { key: "turnoTarde", label: "Tarde", emoji: "☀️", time: "12h-18h", color: "bg-orange-500" },
  { key: "turnoNoite", label: "Noite", emoji: "🌙", time: "18h-00h", color: "bg-blue-500" },
];

type Schedule = {
  id: string;
  motoboyId: string;
  diaSemana: number;
  turnoManha: boolean;
  turnoTarde: boolean;
  turnoNoite: boolean;
};

export function ScheduleGrid() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState<{ day: number; shift: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<{ day: number; shift: string } | null>(null);
  
  // Get current day for highlighting
  const currentDay = new Date().getDay();

  // Fetch current schedule
  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: [`/api/motoboys/${user?.id}/schedules`],
    enabled: !!user?.id,
  });

  // Create schedule map for easy lookup
  const scheduleMap = new Map<number, Schedule>();
  schedules.forEach(s => scheduleMap.set(s.diaSemana, s));

  // Mutation to update schedule
  const updateScheduleMutation = useMutation({
    mutationFn: async ({ 
      diaSemana, 
      turnoManha, 
      turnoTarde, 
      turnoNoite 
    }: { 
      diaSemana: number; 
      turnoManha: boolean; 
      turnoTarde: boolean; 
      turnoNoite: boolean;
    }) => {
      const res = await apiRequest('POST', `/api/motoboys/${user?.id}/schedules`, { 
        diaSemana, 
        turnoManha, 
        turnoTarde, 
        turnoNoite 
      });
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [`/api/motoboys/${user?.id}/schedules`] });
      queryClient.invalidateQueries({ queryKey: ['/api/schedules/all-motoboys'] });
      setSaving(null);
      setLastSaved({ day: variables.diaSemana, shift: 'all' });
      setTimeout(() => setLastSaved(null), 2000);
    },
    onError: (error) => {
      console.error("Error updating schedule:", error);
      setSaving(null);
      toast({
        variant: "destructive",
        title: "Erro ao salvar disponibilidade",
        description: "Tente novamente em alguns instantes.",
      });
    },
  });

  // Handle toggle change
  const handleToggle = (diaSemana: number, shiftKey: string, checked: boolean) => {
    const current = scheduleMap.get(diaSemana);
    
    const newSchedule = {
      diaSemana,
      turnoManha: shiftKey === 'turnoManha' ? checked : (current?.turnoManha ?? false),
      turnoTarde: shiftKey === 'turnoTarde' ? checked : (current?.turnoTarde ?? false),
      turnoNoite: shiftKey === 'turnoNoite' ? checked : (current?.turnoNoite ?? false),
    };

    // If all shifts are false, don't allow (at least one must be active)
    if (!newSchedule.turnoManha && !newSchedule.turnoTarde && !newSchedule.turnoNoite) {
      toast({
        variant: "destructive",
        title: "Atenção",
        description: "Pelo menos um turno deve estar ativo para este dia.",
      });
      return;
    }

    setSaving({ day: diaSemana, shift: shiftKey });
    updateScheduleMutation.mutate(newSchedule);
  };

  if (isLoading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">📅 Minha Disponibilidade Semanal</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure os dias e turnos em que você pode trabalhar
          </p>
        </div>

        <div className="space-y-4">
          {DAYS.map((day) => {
            const schedule = scheduleMap.get(day.num);
            const isToday = day.num === currentDay;
            const isSaving = saving?.day === day.num;
            const wasSaved = lastSaved?.day === day.num;

            return (
              <div
                key={day.num}
                className={`border-l-4 rounded-lg p-4 transition-colors ${
                  isToday
                    ? "border-primary bg-accent/50"
                    : "border-muted bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-bold text-base">
                    {day.emoji} {day.name}
                    {isToday && (
                      <span className="ml-2 text-xs font-normal text-primary">
                        (Hoje)
                      </span>
                    )}
                  </div>
                  {isSaving && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  {wasSaved && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {SHIFTS.map((shift) => {
                    const isChecked = schedule?.[shift.key as keyof Schedule] as boolean ?? false;
                    const isShiftSaving = saving?.day === day.num && saving?.shift === shift.key;

                    return (
                      <div
                        key={shift.key}
                        className={`flex items-center justify-between p-3 rounded-md transition-all ${
                          isChecked
                            ? `${shift.color} text-white`
                            : "bg-muted/50 text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{shift.emoji}</span>
                          <div>
                            <Label className="text-sm font-semibold cursor-pointer">
                              {shift.label}
                            </Label>
                            <div className="text-xs opacity-80">{shift.time}</div>
                          </div>
                        </div>
                        <Switch
                          checked={isChecked}
                          onCheckedChange={(checked) => handleToggle(day.num, shift.key, checked)}
                          disabled={isShiftSaving}
                          className={isChecked ? "data-[state=checked]:bg-white/30" : ""}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4 bg-muted/50">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div className="flex-1 text-sm text-muted-foreground">
            <strong>Dica:</strong> Sua disponibilidade é usada pelo sistema para atribuir entregas
            automaticamente. Mantenha sempre atualizada para receber mais pedidos!
          </div>
        </div>
      </Card>
    </div>
  );
}
