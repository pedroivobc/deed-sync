import { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { Topbar } from "@/components/Topbar";
import { SidebarCollapseProvider } from "@/contexts/SidebarCollapseContext";

interface Props {
  title: string;
  children: ReactNode;
}

export function AppLayout({ title, children }: Props) {
  return (
    <SidebarCollapseProvider>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={title} />
          <main className="flex-1 overflow-y-auto p-6 animate-fade-in">{children}</main>
        </div>
      </div>
    </SidebarCollapseProvider>
  );
}
