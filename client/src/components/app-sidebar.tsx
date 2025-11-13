import { Home, Package, Users, TruckIcon, Settings, BarChart3 } from "lucide-react";
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

const menuItems = {
  central: [
    { title: "Dashboard", url: "/central", icon: Home },
    { title: "Pedidos", url: "/central/orders", icon: Package },
    { title: "Clientes", url: "/central/clients", icon: Users },
    { title: "Entregadores", url: "/central/drivers", icon: TruckIcon },
    { title: "Relatórios", url: "/central/reports", icon: BarChart3 },
    { title: "Configurações", url: "/central/settings", icon: Settings },
  ],
  client: [
    { title: "Dashboard", url: "/client", icon: Home },
    { title: "Meus Pedidos", url: "/client/orders", icon: Package },
    { title: "Novo Pedido", url: "/client/new-order", icon: Package },
    { title: "Histórico", url: "/client/history", icon: BarChart3 },
    { title: "Configurações", url: "/client/settings", icon: Settings },
  ],
  driver: [
    { title: "Dashboard", url: "/driver", icon: Home },
    { title: "Entregas Disponíveis", url: "/driver/available", icon: Package },
    { title: "Minhas Entregas", url: "/driver/my-deliveries", icon: TruckIcon },
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <TruckIcon className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Guriri Express</h2>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
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
