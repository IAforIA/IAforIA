import { type ReactNode } from "react";

interface GlassSidebarProps {
  children: ReactNode;
}

export function GlassSidebar({ children }: GlassSidebarProps) {
  return (
    <aside className="w-64 glass-panel h-screen sticky top-0 overflow-y-auto">
      <div className="p-6">
        {children}
      </div>
    </aside>
  );
}
