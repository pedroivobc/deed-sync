import { useNavigate } from "react-router-dom";
import { CheckCircle2, AlertTriangle, Loader2, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";
import { useIntegrationsHealth, type IntegrationStatus } from "@/hooks/useIntegrationsHealth";

const ROW_LABEL: Record<"drive" | "clicksign" | "cora", string> = {
  drive: "Google Drive",
  clicksign: "ClickSign",
  cora: "Cora PJ",
};

function StatusDot({ status }: { status: IntegrationStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (status === "checking") return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
  if (status === "needs_reconnect") return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
  return <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />;
}

/**
 * Compact integration health badge for the topbar.
 * Hover reveals the per-service status; click navigates to /configuracoes.
 */
export function IntegrationsStatusBadge() {
  const navigate = useNavigate();
  const { health, running, recheck } = useIntegrationsHealth();

  const statuses = [health.drive, health.clicksign, health.cora];
  const anyFail = statuses.includes("needs_reconnect");
  const anyChecking = running || statuses.includes("checking");

  const summary: IntegrationStatus = anyChecking
    ? "checking"
    : anyFail
      ? "needs_reconnect"
      : statuses.every((s) => s === "ok")
        ? "ok"
        : "unknown";

  const label =
    summary === "ok"
      ? "Conectado"
      : summary === "needs_reconnect"
        ? "Reconectar"
        : summary === "checking"
          ? "Verificando…"
          : "Integrações";

  return (
    <HoverCard openDelay={120}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => navigate("/configuracoes")}
          aria-label="Status das integrações"
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
            summary === "ok" && "border-success/30 bg-success/10 text-success hover:bg-success/15",
            summary === "needs_reconnect" &&
              "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/15",
            summary === "checking" && "border-border bg-muted/40 text-muted-foreground",
            summary === "unknown" && "border-border bg-muted/40 text-muted-foreground",
          )}
        >
          <StatusDot status={summary} />
          <span className="hidden sm:inline">{label}</span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-72 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            Integrações
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[11px]"
            onClick={(e) => {
              e.stopPropagation();
              void recheck();
            }}
            disabled={running}
          >
            {running ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verificar agora"}
          </Button>
        </div>
        <ul className="space-y-1.5">
          {(["drive", "clicksign", "cora"] as const).map((k) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span>{ROW_LABEL[k]}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs",
                  health[k] === "ok" && "text-success",
                  health[k] === "needs_reconnect" && "text-destructive",
                  health[k] === "checking" && "text-muted-foreground",
                  health[k] === "unknown" && "text-muted-foreground",
                )}
              >
                <StatusDot status={health[k]} />
                {health[k] === "ok"
                  ? "Conectado"
                  : health[k] === "needs_reconnect"
                    ? "Reconectar"
                    : health[k] === "checking"
                      ? "Verificando"
                      : "—"}
              </span>
            </li>
          ))}
        </ul>
        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full gap-2"
          onClick={() => navigate("/configuracoes")}
        >
          <Plug className="h-3.5 w-3.5" />
          Abrir Integrações
        </Button>
      </HoverCardContent>
    </HoverCard>
  );
}
