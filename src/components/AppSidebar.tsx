import { LayoutDashboard, Users, Briefcase, Wallet, Settings, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface NavItem { title: string; url: string; icon: typeof LayoutDashboard; managerOnly?: boolean; }

const items: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Serviços", url: "/servicos", icon: Briefcase },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, managerOnly: true },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

export function AppSidebar() {
  const { profile, roles, signOut, isManager } = useAuth();
  const roleLabel = roles[0] ?? "—";

  const visibleItems = items.filter((item) => !item.managerOnly || isManager);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center px-5 border-b border-sidebar-border">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {visibleItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
            activeClassName="bg-primary text-primary-foreground hover:bg-primary"
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-semibold">
            {(profile?.name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{profile?.name ?? "Usuário"}</div>
            <div className="truncate text-xs capitalize text-muted-foreground">{roleLabel}</div>
          </div>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
