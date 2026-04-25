import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Search } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsBell } from "@/components/NotificationsBell";
import { IntegrationsStatusBadge } from "@/components/IntegrationsStatusBadge";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  title: string;
}

export function Topbar({ title }: Props) {
  const { profile } = useAuth();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const initial = (profile?.name ?? "U").slice(0, 1).toUpperCase();
  const isMac = typeof navigator !== "undefined" && navigator.platform.includes("Mac");

  const openPalette = () => {
    window.dispatchEvent(new Event("command-palette:open"));
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div className="flex flex-col">
        <h1 className="font-display text-2xl font-semibold leading-none">{title}</h1>
        <span className="mt-1 text-xs capitalize text-muted-foreground">{today}</span>
      </div>
      <div className="mx-6 hidden flex-1 justify-center md:flex">
        <button
          type="button"
          onClick={openPalette}
          className="group flex w-full max-w-md items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Abrir busca global"
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Buscar clientes, serviços, documentos…</span>
          <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={openPalette}
          className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground md:hidden"
          aria-label="Abrir busca global"
        >
          <Search className="h-4 w-4" />
        </button>
        <IntegrationsStatusBadge />
        <NotificationsBell />
        <ThemeToggle />
        <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {initial}
        </div>
      </div>
    </header>
  );
}
