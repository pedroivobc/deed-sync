import {
  LayoutDashboard, Users, Briefcase, Wallet, Settings, LogOut, Lock, Calculator,
  ExternalLink, CalendarDays, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { usePermissions, type Permission } from "@/hooks/usePermissions";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";

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
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
  { title: "Financeiro", url: "/financeiro", icon: Wallet, permission: "access_financial", lockedWhenDenied: true },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

const CALCULO_EXTERNAL_URL = "https://c-lculo-de-m-o-2-0v.vercel.app/";

function CalculoExternalLink({ collapsed }: { collapsed: boolean }) {
  const link = (
    <a
      href={CALCULO_EXTERNAL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
        "text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
        collapsed && "justify-center px-0",
      )}
    >
      <Calculator className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">Cálculo na Mão (externo)</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
        </>
      )}
    </a>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">Cálculo na Mão (externo)</TooltipContent>
    </Tooltip>
  );
}

export function AppSidebar() {
  const { profile, roles, signOut } = useAuth();
  const { can } = usePermissions();
  const { collapsed, toggle } = useSidebarCollapse();
  const roleLabel = roles[0] ?? "—";

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
        collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        {!collapsed && <Logo />}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className={cn("flex-1 space-y-1 py-5", collapsed ? "px-2" : "px-3")}>
        <TooltipProvider delayDuration={150}>
          {items.map((item, idx) => {
            const allowed = !item.permission || can(item.permission);

            if (!allowed && !item.lockedWhenDenied) return null;

            if (!allowed && item.lockedWhenDenied) {
              return (
                <div key={item.url}>
                {idx === 4 && <CalculoExternalLink collapsed={collapsed} />}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      aria-disabled
                      className={cn(
                        "flex cursor-not-allowed items-center gap-3 rounded-xl py-2.5 text-sm font-medium",
                        collapsed ? "justify-center px-0" : "px-3",
                        "text-muted-foreground/60",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{item.title}</span>
                          <Lock className="h-3.5 w-3.5" />
                        </>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {collapsed ? `${item.title} — sem permissão` : "Sem permissão"}
                  </TooltipContent>
                </Tooltip>
                </div>
              );
            }

            const navLink = (
              <NavLink
                to={item.url}
                end={item.url === "/"}
                className={cn(
                  "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                  collapsed ? "justify-center px-0" : "px-3",
                )}
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.title}</span>}
              </NavLink>
            );

            return (
              <div key={item.url}>
                {idx === 4 && <CalculoExternalLink collapsed={collapsed} />}
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right">{item.title}</TooltipContent>
                  </Tooltip>
                ) : (
                  navLink
                )}
              </div>
            );
          })}
        </TooltipProvider>
      </nav>

      <div className={cn("border-t border-sidebar-border", collapsed ? "p-2" : "p-4")}>
        {!collapsed && (
          <RouterNavLink
            to="/sobre"
            className="mb-3 block text-center text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            Sobre
          </RouterNavLink>
        )}
        <div
          className={cn(
            "mb-3 flex items-center gap-3",
            collapsed && "justify-center",
          )}
        >
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground text-sm font-semibold">
                  {(profile?.name ?? "U").slice(0, 1).toUpperCase()}
                </div>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right">
                  {profile?.name ?? "Usuário"} · {roleLabel}
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{profile?.name ?? "Usuário"}</div>
              <div className="truncate text-xs capitalize text-muted-foreground">{roleLabel}</div>
            </div>
          )}
        </div>
        {collapsed ? (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  onClick={signOut}
                  aria-label="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        )}
      </div>
    </aside>
  );
}
