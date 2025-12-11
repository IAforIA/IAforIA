/**
 * ARQUIVO: client/src/pages/central-dashboard.tsx
 * PROPÓSITO: Painel administrativo da Central para monitorar pedidos, motoboys e estatísticas em tempo real
 * CONTEXTO: Usa WebSockets e React Query para dados atualizados sem recarregar a página
 */

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Switch, Route, Router as NestedRouter } from "wouter";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { Order, Motoboy, Client } from "@shared/schema";
import { useEffect, useMemo, Suspense, lazy } from "react";
import { resolveWebSocketUrl } from "@/lib/utils";
import { useOrderFilters } from "@/hooks/use-order-filters";
import { useFinancialReports } from "@/hooks/use-financial-reports";
import { SettingsPage } from "@/components/SettingsPage";
import type { CompanyReport } from "./central/types";

const CentralHomeRoute = lazy(() => import("./central/home").then((m) => ({ default: m.CentralHomeRoute })));
const LiveDocsSection = lazy(() => import("./central/live-docs").then((m) => ({ default: m.LiveDocsSection })));
const OrdersRoute = lazy(() => import("./central/orders").then((m) => ({ default: m.OrdersRoute })));
const ClientsRoute = lazy(() => import("./central/clients").then((m) => ({ default: m.ClientsRoute })));
const DriversRoute = lazy(() => import("./central/drivers").then((m) => ({ default: m.DriversRoute })));
const FinancialRoute = lazy(() => import("./central/financial").then((m) => ({ default: m.FinancialRoute })));
const UsersRoute = lazy(() => import("./central/users").then((m) => ({ default: m.UsersRoute })));

export default function CentralDashboard() {
  // CONTEXTO GLOBAL: useAuth provê token JWT e função de logout
  const { logout, token, user } = useAuth();
  // QUERY PRINCIPAL: Busca lista completa de pedidos (cacheado por React Query)
  const { data: orders = [], refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // QUERY SECUNDÁRIA: Busca status online dos motoboys para indicadores
  const { data: motoboys = [], refetch: refetchMotoboys } = useQuery<Motoboy[]>({
    queryKey: ['/api/motoboys'],
    refetchInterval: 5000, // Atualiza a cada 5 segundos para mostrar status real
  });

  // QUERY: Últimas localizações dos motoboys para o mapa em tempo real
  const { data: motoboyLocationsData } = useQuery<{ locations: Array<{ motoboyId: string; latitude: number; longitude: number; timestamp: string }>}>({
    queryKey: ['/api/motoboys/locations/latest'],
    refetchInterval: 10000,
    enabled: !!token,
  });
  const motoboyLocations = Array.isArray(motoboyLocationsData?.locations) ? motoboyLocationsData.locations : [];

  const handleRefreshSchedules = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/schedules/all-clients'] });
    queryClient.invalidateQueries({ queryKey: ['/api/schedules/all-motoboys'] });
  };

  // QUERY: Busca usuários online via WebSocket
  const { data: onlineData, refetch: refetchOnline } = useQuery<{ onlineUsers: string[] }>({
    queryKey: ['/api/users/online'],
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });
  const onlineUserIds = Array.isArray(onlineData?.onlineUsers) ? onlineData.onlineUsers : [];

  // QUERY TERCIÁRIA: Busca lista de clientes para gestão
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: !!token, // Só faz a query se tiver token
  });

  // QUERY: Busca TODOS os horários dos clientes de uma vez (sem fallback para evitar dados irreais)
  const { data: allClientSchedules = [] } = useQuery<any[]>({
    queryKey: ['/api/schedules/all-clients'],
    enabled: !!token,
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });
  
  // Log de debug (somente quando chegar dado)
  useEffect(() => {
    if (allClientSchedules.length > 0) {
      console.log('📅 Dashboard - schedules carregados:', allClientSchedules.length);
    }
  }, [allClientSchedules]);

  // QUERY: Busca TODOS os horários dos motoboys de uma vez
  const { data: allMotoboySchedules = [] } = useQuery<any[]>({
    queryKey: ['/api/schedules/all-motoboys'],
    enabled: !!token,
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  // STEP 4: Query de usuários
  const { data: usersData = [] } = useQuery<any[]>({
    queryKey: ['/api/users'],
    enabled: !!token,
  });

  // STEP 13: Query para relatório completo da empresa (GET /api/reports/company)
  const { data: companyReport } = useQuery<CompanyReport>({
    queryKey: ['/api/reports/company'],
    enabled: !!token,
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // STEP 13b: Query para analytics dashboard (compatibilidade com código legado)
  const { data: analyticsData } = useQuery<{
    todayRevenue: number;
    todayProfit: number;
    monthToDateRevenue: number;
    monthToDateProfit: number;
    mrr: number;
    activeDriversCount: number;
    pendingOrdersCount: number;
    pendingOrdersValue: number;
  }>({
    queryKey: ['/api/analytics/dashboard'],
    enabled: !!token,
    refetchInterval: 30000,
  });

  const {
    normalizedOrders,
    filteredOrders,
    orderStatusFilter,
    orderClientFilter,
    orderMotoboyFilter,
    orderDateFilter,
    orderSearchFilter,
    orderPaymentFilter,
    handleOrderStatusFilterChange,
    handleOrderClientFilterChange,
    handleOrderMotoboyFilterChange,
    handleOrderPaymentFilterChange,
    setOrderDateFilter,
    setOrderSearchFilter,
  } = useOrderFilters(orders);

  const {
    finStartDate,
    finEndDate,
    finMotoboyFilter,
    finClientFilter,
    setFinStartDate,
    setFinEndDate,
    handleFinMotoboyFilterChange,
    handleFinClientFilterChange,
    filteredDeliveredOrders,
    financialSummary,
    motoboySnapshots,
    clientSnapshots,
    deliveredTodayOrders,
    deliveredTodaySummary,
    pendingOrders,
    pendingSummary,
  } = useFinancialReports(normalizedOrders);

  // DERIVADO: Índice de pedidos ativos por motoboy (evita recomputar no render)
  const activeOrdersByDriver = normalizedOrders.reduce<Record<string, number>>((acc, order) => {
    if (order.status === 'in_progress' && order.motoboyId) {
      acc[order.motoboyId] = (acc[order.motoboyId] || 0) + 1;
    }
    return acc;
  }, {});

  // KPI rápidos para o dashboard inicial (usando somente pedidos de HOJE)
  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const ordersToday = normalizedOrders.filter((o) => o.createdAtDate && isToday(o.createdAtDate));
  const totalOrders = ordersToday.length;
  const inProgress = ordersToday.filter((o) => o.status === 'in_progress').length;
  const delivered = ordersToday.filter((o) => o.status === 'delivered').length;
  const onlineMotoboys = motoboys.filter((m) => m.online).length;

  // EFEITO: Abre conexão WebSocket autenticada para receber eventos em tempo real
  useEffect(() => {
    if (!token) return; // Sem token não conectamos

    const websocket = new WebSocket(resolveWebSocketUrl(token));

    // Quando chegar mensagem relevante, revalida cache de pedidos e motoboys
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_order' || data.type === 'order_accepted' || data.type === 'order_delivered') {
        refetchOrders();
      }
      // Atualiza lista de motoboys e usuários online quando houver mudança de status
      if (data.type === 'driver_online' || data.type === 'driver_offline' || data.type === 'order_accepted') {
        refetchMotoboys();
        refetchOnline(); // Atualiza lista de usuários online
      }
      // Atualiza cache de localizações em tempo real
      if (data.type === 'location_update' && data.payload?.motoboyId) {
        queryClient.setQueryData(['/api/motoboys/locations/latest'], (prev: any) => {
          const prevLocations = prev?.locations || [];
          const filtered = prevLocations.filter((loc: any) => loc.motoboyId !== data.payload.motoboyId);
          return { locations: [...filtered, data.payload] };
        });
      }
    };

    websocket.onclose = () => console.log('WebSocket closed');
    websocket.onerror = (error) => console.error('WebSocket error:', error);
    websocket.onopen = () => console.log('WebSocket connected');
    return () => websocket.close();
  }, [token, refetchOrders, refetchMotoboys, refetchOnline]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <AppSidebar role="central" onRefreshSchedules={handleRefreshSchedules} />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex h-14 items-center gap-3 border-b px-4">
            <SidebarTrigger className="mr-2" />
            <div className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
              <span>Central</span>
              <span className="text-muted-foreground">|</span>
              <span>Pedidos em tempo real</span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="outline" size="sm" onClick={logout}>Sair</Button>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 bg-muted/30 p-4">
            <Suspense fallback={<div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Carregando painel...</div>}>
              <NestedRouter base="/central">
                <Switch>
                  <Route path="/">
                    <CentralHomeRoute
                      clients={clients}
                      motoboys={motoboys}
                      motoboyLocations={motoboyLocations}
                      normalizedOrders={normalizedOrders}
                      allClientSchedules={allClientSchedules}
                      allMotoboySchedules={allMotoboySchedules}
                      totalOrders={totalOrders}
                      inProgress={inProgress}
                      delivered={delivered}
                      activeDrivers={onlineMotoboys}
                      handleRefreshSchedules={handleRefreshSchedules}
                      companyReport={companyReport}
                      user={user}
                    />
                  </Route>
                  <Route path="/live-docs">
                    <LiveDocsSection orders={normalizedOrders} />
                  </Route>
                  <Route path="/orders">
                    <OrdersRoute
                      orders={filteredOrders}
                      clients={clients}
                      motoboys={motoboys}
                      orderStatusFilter={orderStatusFilter}
                      orderClientFilter={orderClientFilter}
                      orderMotoboyFilter={orderMotoboyFilter}
                      orderPaymentFilter={orderPaymentFilter}
                      orderDateFilter={orderDateFilter}
                      orderSearchFilter={orderSearchFilter}
                      onStatusChange={handleOrderStatusFilterChange}
                      onClientChange={handleOrderClientFilterChange}
                      onMotoboyChange={handleOrderMotoboyFilterChange}
                      onPaymentChange={handleOrderPaymentFilterChange}
                      onDateChange={setOrderDateFilter}
                      onSearchChange={setOrderSearchFilter}
                    />
                  </Route>
                  <Route path="/clients">
                    <ClientsRoute
                      clients={clients}
                      allClientSchedules={allClientSchedules}
                      normalizedOrders={normalizedOrders}
                    />
                  </Route>
                  <Route path="/drivers">
                    <DriversRoute
                      motoboys={motoboys}
                      motoboyLocations={motoboyLocations}
                      onlineUserIds={onlineUserIds}
                      activeOrdersByDriver={activeOrdersByDriver}
                      allMotoboySchedules={allMotoboySchedules}
                    />
                  </Route>
                  <Route path="/financial">
                    <FinancialRoute
                      filteredDeliveredOrders={filteredDeliveredOrders}
                      financialSummary={financialSummary}
                      motoboySnapshots={motoboySnapshots || []}
                      clientSnapshots={clientSnapshots || []}
                      finStartDate={finStartDate}
                      finEndDate={finEndDate}
                      finMotoboyFilter={finMotoboyFilter}
                      finClientFilter={finClientFilter}
                      setFinStartDate={setFinStartDate}
                      setFinEndDate={setFinEndDate}
                      onMotoboyChange={handleFinMotoboyFilterChange}
                      onClientChange={handleFinClientFilterChange}
                      clients={clients || []}
                      motoboys={motoboys || []}
                    />
                  </Route>
                  <Route path="/users">
                    <UsersRoute usersData={usersData} currentUser={user} />
                  </Route>
                  <Route path="/settings">
                    <SettingsPage user={user} />
                  </Route>
                  <Route>
                    <CentralHomeRoute
                      clients={clients}
                      motoboys={motoboys}
                      motoboyLocations={motoboyLocations}
                      normalizedOrders={normalizedOrders}
                      allClientSchedules={allClientSchedules}
                      allMotoboySchedules={allMotoboySchedules}
                      totalOrders={totalOrders}
                      inProgress={inProgress}
                      delivered={delivered}
                      activeDrivers={onlineMotoboys}
                      handleRefreshSchedules={handleRefreshSchedules}
                      companyReport={companyReport}
                      user={user}
                    />
                  </Route>
                </Switch>
              </NestedRouter>
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}