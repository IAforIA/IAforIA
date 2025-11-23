/**
 * ARQUIVO: client/src/components/app-sidebar.tsx
 * PROPÓSITO: Sidebar reutilizável que muda o menu conforme o papel do usuário
 */

import { Home, Package, Users, TruckIcon, Settings, BarChart3, FileText, UserCog, Calendar, DollarSign } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

interface AppSidebarProps {
  role: "central" | "client" | "driver";
}

// Lookup table separa configuração de rotas do JSX
const menuItems = {
  central: [
    { title: "Dashboard", url: "/central", icon: Home },
    { title: "Pedidos", url: "/central/orders", icon: Package },
    { title: "Financeiro", url: "/central/financial", icon: DollarSign },
    { title: "Clientes", url: "/central/clients", icon: Users },
    { title: "Entregadores", url: "/central/drivers", icon: TruckIcon },
    { title: "Usuários", url: "/central/users", icon: UserCog },
    { title: "Live Docs", url: "/central/live-docs", icon: FileText },
    { title: "Configurações", url: "/central/settings", icon: Settings },
  ],
  client: [
    { title: "Dashboard", url: "/client", icon: Home },
    { title: "Meus Pedidos", url: "/client/orders", icon: Package },
    { title: "Horário de Funcionamento", url: "/client/schedule", icon: Calendar },
    { title: "Live Docs", url: "/client/live-docs", icon: FileText },
    { title: "Histórico", url: "/client/history", icon: BarChart3 },
    { title: "Configurações", url: "/client/settings", icon: Settings },
  ],
  driver: [
    { title: "Dashboard", url: "/driver", icon: Home },
    { title: "Entregas Disponíveis", url: "/driver/available", icon: Package },
    { title: "Minhas Entregas", url: "/driver/my-deliveries", icon: TruckIcon },
    { title: "Disponibilidade", url: "/driver/availability", icon: Calendar },
    { title: "Live Docs", url: "/driver/live-docs", icon: FileText },
    { title: "Histórico", url: "/driver/history", icon: BarChart3 },
    { title: "Configurações", url: "/driver/settings", icon: Settings },
  ],
};

export function AppSidebar({ role }: AppSidebarProps) {
  const [location] = useLocation();
  const items = menuItems[role];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        {/* Logo/atalho leva sempre para a landing independente do role */}
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2 hover-elevate active-elevate-2 rounded-md p-2 -m-2">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Guriri Express</h2>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  {/* SidebarMenuButton usa isActive para destacar rota atual */}
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
