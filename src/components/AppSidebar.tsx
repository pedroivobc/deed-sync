import {
  LayoutDashboard, Users, Briefcase, Wallet, Settings, LogOut, Lock, Calculator,
  FileText, PenTool, Home, Building2, TrendingUp, Handshake, Bookmark, BarChart3,
  ChevronDown,
} from "lucide-react";
import { NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface NavItem {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  /** If set, item is hidden when the user lacks this permission... */
  permission?: Permission;
  /** ...unless `lockedWhenDenied` is true, in which case it's shown disabled with a lock icon. */
  lockedWhenDenied?: boolean;
}

const items: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "CRM", url: "/crm", icon: Users },
  { title: "Serviços", url: "/servicos", icon: Briefcase },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, permission: "access_financial", lockedWhenDenied: true },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const calcSubItems = [
  { title: "Dashboard", url: "/calculo-na-mao/dashboard", icon: LayoutDashboard },
  { title: "Valor Venal", url: "/calculo-na-mao/valor-venal", icon: FileText },
  { title: "Escrituras", url: "/calculo-na-mao/escrituras", icon: PenTool },
  { title: "Financiamento Caixa", url: "/calculo-na-mao/financiamento-caixa", icon: Home },
  { title: "Fin. Banco Privado", url: "/calculo-na-mao/financiamento-privado", icon: Building2 },
  { title: "Correção INCC", url: "/calculo-na-mao/correcao-contratual", icon: TrendingUp },
  { title: "Doação", url: "/calculo-na-mao/doacao", icon: Handshake },
  { title: "Regularização", url: "/calculo-na-mao/regularizacao", icon: Bookmark },
  { title: "Analytics", url: "/calculo-na-mao/analytics", icon: BarChart3 },
];

export function AppSidebar() {
  const { profile, roles, signOut } = useAuth();
  const { can } = usePermissions();
  const location = useLocation();
  const roleLabel = roles[0] ?? "—";
  const calcOpen = location.pathname.startsWith("/calculo-na-mao");

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        <TooltipProvider delayDuration={150}>
          {items.map((item, idx) => {
            const allowed = !item.permission || can(item.permission);

            if (!allowed && !item.lockedWhenDenied) return null;

            if (!allowed && item.lockedWhenDenied) {
              return (
                <div key={item.url}>
                {idx === 3 && <CalculoSubmenu open={calcOpen} />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      aria-disabled
                      className={cn(
                        "flex cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                        "text-muted-foreground/60",
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      <Lock className="h-3.5 w-3.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sem permissão</TooltipContent>
                </Tooltip>
                </div>
              );
            }

            return (
              <div key={item.url}>
                {idx === 3 && <CalculoSubmenu open={calcOpen} />}
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-primary text-primary-foreground hover:bg-primary"
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </NavLink>
              </div>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <RouterNavLink
          to="/sobre"
          className="mb-3 block text-center text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
        >
          Sobre
        </RouterNavLink>
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
