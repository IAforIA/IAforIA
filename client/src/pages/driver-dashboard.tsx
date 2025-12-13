// No changes intended; reverting unnecessary patch.
/**
 * ARQUIVO: client/src/pages/driver-dashboard.tsx
 * PROPÓSITO: Dashboard do motoboy - aceitar entregas, acompanhar progresso e ganhos
 * TECNOLOGIAS: React, React Query, WebSocket, shadcn/ui, Wouter
 */

import React, { useEffect, useRef } from "react";
import { Switch, Route, Router as NestedRouter } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScheduleGrid } from "@/components/ScheduleGrid";
import { ChatWidget } from "@/components/ChatWidget";
import { SettingsPage } from "@/components/SettingsPage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { resolveWebSocketUrl } from "@/lib/utils";
import type { Order, Motoboy } from "@shared/schema";
import { DashboardContent } from "./driver/dashboard-content";
import { AvailableDeliveries } from "./driver/available-deliveries";
import { MyDeliveries } from "./driver/my-deliveries";
import { History } from "./driver/history";
import { LiveDocs } from "./driver/live-docs";
import type { MotoboyReport } from "./driver/types";
import { parseDecimalSafe } from "./driver/utils";

export default function DriverDashboard() {
  const { toast } = useToast();
  const { user, logout, token } = useAuth();

  const { data: orders = [], refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: motoboyReport } = useQuery<{ success: boolean; data: MotoboyReport }, Error, MotoboyReport>({
    queryKey: ["/api/reports/motoboys", user?.id],
    enabled: !!user?.id && !!token,
    refetchInterval: 30000,
    select: (response) => response?.data,
  });

  const { data: motoboyProfile } = useQuery<Motoboy | null>({
    queryKey: ["/api/motoboys/me"],
    enabled: !!token && user?.role === "motoboy",
  });

  const availableOrders = orders.filter((o) => o.status === "pending");
  const myOrders = orders.filter((o) => o.motoboyId === user?.id && o.status === "in_progress");
  const deliveredToday = orders.filter(
    (o) =>
      o.motoboyId === user?.id &&
      o.status === "delivered" &&
      o.deliveredAt &&
      new Date(o.deliveredAt).toDateString() === new Date().toDateString()
  );
  const myHistory = orders.filter((o) => o.motoboyId === user?.id && o.status === "delivered");

  const totalEarnings = deliveredToday.reduce((sum, o) => sum + parseDecimalSafe(o.taxaMotoboy), 0);

  // Usar ref para evitar loop de dependência do useEffect
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    if (!user?.id || !token) return;
    
    let websocket: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
    
    const connect = () => {
      try {
        websocket = new WebSocket(resolveWebSocketUrl(token));
        
        websocket.onopen = () => {
          console.log('✅ WebSocket conectado (driver)');
        };
        
        websocket.onmessage = () => {
          refetchRef.current();
        };
        
        websocket.onerror = (e) => {
          console.error('❌ WebSocket erro:', e);
        };
        
        websocket.onclose = (e) => {
          console.log('🔌 WebSocket fechado:', e.code, e.reason);
          // Só reconecta se não foi fechamento intencional
          if (e.code !== 1000 && e.code !== 1001) {
            reconnectTimeout = setTimeout(connect, 5000);
          }
        };
      } catch (err) {
        console.error('❌ Erro ao criar WebSocket:', err);
      }
    };
    
    connect();
    
    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (websocket) {
        websocket.close(1000, 'Component unmounting');
      }
    };
  }, [user?.id, token]); // Removido refetch das dependências

  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/accept`, {
        motoboyId: user?.id,
        motoboyName: user?.name,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Entrega aceita!", description: "O pedido foi adicionado às suas entregas." });
    },
  });

  const deliverOrderMutation = useMutation({
    mutationFn: async ({ orderId, proofUrl }: { orderId: string; proofUrl?: string }) => {
      const res = await apiRequest("POST", `/api/orders/${orderId}/deliver`, { proofUrl });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Entrega concluída!", description: "O pedido foi marcado como entregue." });
    },
    onError: (error) => {
      console.error("Erro na entrega:", error);
      toast({
        variant: "destructive",
        title: "Erro ao finalizar entrega",
        description: "Não foi possível marcar como entregue. Tente novamente.",
      });
    },
  });

  const style: React.CSSProperties = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full">
        <AppSidebar role="driver" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" />
              <h1 className="text-xl font-semibold" data-testid="text-page-title">Dashboard do Entregador</h1>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-500 text-white" data-testid="badge-status">Disponível</Badge>
              <ThemeToggle />
              <Button variant="outline" onClick={logout} data-testid="button-logout">
                Sair
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              <NestedRouter base="/driver">
                <Switch>
                  <Route path="/">
                    <DashboardContent
                      availableOrders={availableOrders}
                      myOrders={myOrders}
                      deliveredToday={deliveredToday}
                      totalEarnings={totalEarnings}
                      motoboyReport={motoboyReport}
                      token={token}
                      onAccept={(id) => acceptOrderMutation.mutate(id)}
                      onDeliver={(data) => deliverOrderMutation.mutate(data)}
                      isAccepting={acceptOrderMutation.isPending}
                      isDelivering={deliverOrderMutation.isPending}
                    />
                  </Route>

                  <Route path="/available">
                    <AvailableDeliveries
                      orders={availableOrders}
                      onAccept={(id) => acceptOrderMutation.mutate(id)}
                      isAccepting={acceptOrderMutation.isPending}
                    />
                  </Route>

                  <Route path="/my-deliveries">
                    <MyDeliveries
                      orders={myOrders}
                      token={token}
                      onDeliver={(data) => deliverOrderMutation.mutate(data)}
                      isDelivering={deliverOrderMutation.isPending}
                    />
                  </Route>

                  <Route path="/history">
                    <History deliveredOrders={myHistory} />
                  </Route>

                  <Route path="/live-docs">
                    <LiveDocs deliveredOrders={myHistory} />
                  </Route>

                  <Route path="/availability">
                    <>
                      <h2 className="text-2xl font-bold mb-6">Minha Disponibilidade</h2>
                      <ScheduleGrid />
                    </>
                  </Route>

                  <Route path="/settings">
                    <SettingsPage user={user} motoboyProfile={motoboyProfile ?? undefined} />
                  </Route>
                </Switch>
              </NestedRouter>
            </div>
          </main>
        </div>
      </div>

      {user && (
        <ChatWidget
          currentUserId={user.id}
          currentUserName={user.name}
          currentUserRole={user.role}
        />
      )}
    </SidebarProvider>
  );
}
