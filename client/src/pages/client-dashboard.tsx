/**
 * ARQUIVO: client/src/pages/client-dashboard.tsx
 * PROPÓSITO: Dashboard do cliente - criar pedidos, acompanhar status, histórico
 * TECNOLOGIAS: React, React Query, WebSocket, shadcn/ui, Wouter
 */

import React, { useState, useEffect, useRef } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Switch as RouterSwitch, Route, Router as NestedRouter } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ChatWidget } from "@/components/ChatWidget";
import type { Order } from "@shared/schema";
import { resolveWebSocketUrl } from "@/lib/utils";
import { ClientScheduleEditor } from "@/components/ClientScheduleEditor";
import { SettingsPage } from "@/components/SettingsPage";
import type { ClientProfileDto } from "@shared/contracts";
import type { ClientReport, ClientScheduleEntry } from "./client/types";
import { DashboardContent } from "./client/dashboard-content";
import { LiveDocsSection } from "./client/live-docs";
import { HistorySection } from "./client/history";
import { CreateOrderDialog } from "./client/create-order-dialog";

export default function ClientDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user, logout, token } = useAuth();

  const { data: orders = [], refetch } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: clientReport } = useQuery<ClientReport>({
    queryKey: ["/api/reports/clients", user?.id],
    enabled: !!user?.id && !!token,
    refetchInterval: 30000,
  });

  const { data: profile, isPending: isProfileLoading, error: profileError } = useQuery<ClientProfileDto>({
    queryKey: ["/api/me/profile"],
    enabled: Boolean(user?.id),
    retry: false,
  });

  const { data: clientSchedule = [] } = useQuery<ClientScheduleEntry[]>({
    queryKey: ["/api/clients", user?.id, "schedules"],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${user?.id}/schedules`);
      return res.json();
    },
    enabled: Boolean(user?.id),
    retry: false,
  });

  useEffect(() => {
    if (profileError) {
      console.error("❌ Erro ao carregar perfil:", profileError);
    }
    if (profile) {
      console.log("✅ Perfil carregado:", profile);
    }
  }, [profile, profileError]);

  const clientOrders = orders.filter((o) => o.clientId === user?.id);

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
          console.log('✅ WebSocket conectado (client)');
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

  const totalOrders = clientOrders.length;
  const pending = clientOrders.filter((o) => o.status === "pending").length;
  const inProgress = clientOrders.filter((o) => o.status === "in_progress").length;
  const deliveredOrders = clientOrders.filter((o) => o.status === "delivered");
  const deliveredCount = deliveredOrders.length;
  const cancelled = clientOrders.filter((o) => o.status === "cancelled").length;

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar role="client" />
        <div className="flex flex-col flex-1">
          <header className="flex items-center justify-between p-3 sm:p-4 border-b bg-background sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="lg:hidden" />
              <h1 className="text-base sm:text-lg md:text-xl font-semibold" data-testid="text-page-title">Meus Pedidos</h1>
            </div>
            <div className="flex items-center gap-2">
              <CreateOrderDialog
                isOpen={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                user={user}
                profile={profile}
                isProfileLoading={isProfileLoading}
                profileError={profileError}
                clientSchedule={clientSchedule}
              />
              <ThemeToggle />
              <Button variant="outline" onClick={logout} data-testid="button-logout" className="text-xs sm:text-sm px-2 sm:px-4">
                <span className="hidden sm:inline">Sair</span>
                <span className="sm:hidden">✕</span>
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5 md:space-y-6">
              <NestedRouter base="/client">
                <RouterSwitch>
                  <Route path="/">
                    <DashboardContent
                      clientOrders={clientOrders}
                      totalOrders={totalOrders}
                      pending={pending}
                      inProgress={inProgress}
                      delivered={deliveredCount}
                      cancelled={cancelled}
                      clientReport={clientReport}
                    />
                  </Route>

                  <Route path="/orders">
                    <DashboardContent
                      clientOrders={clientOrders}
                      totalOrders={totalOrders}
                      pending={pending}
                      inProgress={inProgress}
                      delivered={deliveredCount}
                      cancelled={cancelled}
                      clientReport={clientReport}
                    />
                  </Route>

                  <Route path="/history">
                    <HistorySection deliveredOrders={deliveredOrders} />
                  </Route>

                  <Route path="/live-docs">
                    <LiveDocsSection orders={clientOrders} />
                  </Route>

                  <Route path="/schedule">
                    <div className="space-y-4 sm:space-y-6">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold mb-2">Horário de Funcionamento</h2>
                        <p className="text-sm sm:text-base text-muted-foreground">Configure quando seu estabelecimento está aberto para receber pedidos</p>
                      </div>
                      {user && <ClientScheduleEditor clientId={user.id} />}
                    </div>
                  </Route>

                  <Route path="/settings">
                    <SettingsPage user={user} clientProfile={profile} />
                  </Route>
                </RouterSwitch>
              </NestedRouter>
            </div>
          </main>
        </div>
      </div>

      {user && (
        <ChatWidget currentUserId={user.id} currentUserName={user.name} currentUserRole={user.role} />
      )}
    </SidebarProvider>
  );
}