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
  ],
  client: [
    { title: "Dashboard", url: "/client", icon: Home },
  ],
  driver: [
    { title: "Dashboard", url: "/driver", icon: Home },
  ],
};

export function AppSidebar({ role }: AppSidebarProps) {
  const [location] = useLocation();
  const items = menuItems[role];

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
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
