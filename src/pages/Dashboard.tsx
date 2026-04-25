import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  Loader2,
  TrendingUp,
  Wallet,
  ArrowRight,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { useAgendaEvents } from "@/hooks/useAgendaEvents";
import { STAGE_LABEL, STAGE_BAR_CLASS, STAGE_ORDER, type ServiceStage } from "@/lib/serviceUi";

interface ServiceRow {
  id: string;
  subject: string;
  stage: ServiceStage;
  due_date: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  client_id: string | null;
}

interface FinanceRow {
  amount: number;
  status: "pago" | "pendente";
  type: "receita" | "despesa";
  payment_method: string | null;
  date: string;
}

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { items: notifications } = useNotifications();

  const fromIso = todayIso();
  const toIso = format(addDays(new Date(), 1), "yyyy-MM-dd");
  const { events: todayEvents, loading: agendaLoading } = useAgendaEvents({ fromIso, toIso });

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [finance, setFinance] = useState<FinanceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [svcRes, finRes] = await Promise.all([
        supabase
          .from("services")
          .select("id, subject, stage, due_date, completed_at, assigned_to, client_id")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("finance_entries")
          .select("amount, status, type, payment_method, date")
          .gte("date", format(startOfMonth(new Date()), "yyyy-MM-dd"))
          .lte("date", format(endOfMonth(new Date()), "yyyy-MM-dd")),
      ]);
      if (cancelled) return;
      setServices((svcRes.data ?? []) as ServiceRow[]);
      setFinance(((finRes.data ?? []) as unknown) as FinanceRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---------- KPIs ----------
  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    const ativos = services.filter((s) => s.stage !== "concluido");
    const emAndamento = services.filter((s) =>
      ["analise", "execucao", "revisao"].includes(s.stage)
    );
    const pendentes = services.filter((s) => ["entrada", "documentacao"].includes(s.stage));
    const concluidosMes = services.filter((s) => {
      if (!s.completed_at) return false;
      const d = new Date(s.completed_at);
      return d >= monthStart && d <= monthEnd;
    });

    return {
      ativos: ativos.length,
      emAndamento: emAndamento.length,
      pendentes: pendentes.length,
      concluidosMes: concluidosMes.length,
    };
  }, [services]);

  // ---------- Pipeline distribution ----------
  const pipeline = useMemo(() => {
    const map = new Map<ServiceStage, number>();
    STAGE_ORDER.forEach((s) => map.set(s, 0));
    services.forEach((s) => map.set(s.stage, (map.get(s.stage) ?? 0) + 1));
    const max = Math.max(1, ...Array.from(map.values()));
    return STAGE_ORDER.map((stage) => ({
      stage,
      count: map.get(stage) ?? 0,
      pct: ((map.get(stage) ?? 0) / max) * 100,
    }));
  }, [services]);

  // ---------- Critical alerts ----------
  const alerts = useMemo(() => {
    return notifications
      .filter((n) => n.type === "critical" || n.type === "warning")
      .slice(0, 5);
  }, [notifications]);

  // ---------- My tasks ----------
  const myTasks = useMemo(() => {
    if (!user) return { pending: [], overdue: [] as ServiceRow[] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mine = services.filter((s) => s.assigned_to === user.id && s.stage !== "concluido");
    const overdue = mine.filter((s) => s.due_date && new Date(s.due_date) < today);
    const pending = mine
      .filter((s) => !overdue.includes(s))
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      })
      .slice(0, 6);
    return { pending, overdue: overdue.slice(0, 6) };
  }, [services, user]);

  // ---------- Finance (Cora-friendly) ----------
  const financeStats = useMemo(() => {
    const receitas = finance.filter((f) => f.type === "receita");
    const boletos = receitas.filter((f) => (f.payment_method ?? "").toLowerCase() === "boleto");
    const boletosPagos = boletos.filter((f) => f.status === "pago");
    const valorRecebido = receitas
      .filter((f) => f.status === "pago")
      .reduce((acc, f) => acc + Number(f.amount), 0);
    return {
      boletosEmitidos: boletos.length,
      boletosPagos: boletosPagos.length,
      valorRecebido,
    };
  }, [finance]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">
              {greeting}
              {profile?.name ? `, ${profile.name.split(" ")[0]}` : ""} 👋
            </h2>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/agenda")}>
              <CalendarDays className="mr-2 h-4 w-4" /> Agenda
            </Button>
            <Button size="sm" onClick={() => navigate("/servicos")}>
              <FileText className="mr-2 h-4 w-4" /> Ver serviços
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="Ativos"
            value={summary.ativos}
            icon={ListChecks}
            tone="info"
            onClick={() => navigate("/servicos")}
          />
          <KpiCard
            label="Em andamento"
            value={summary.emAndamento}
            icon={Loader2}
            tone="warning"
            onClick={() => navigate("/servicos")}
          />
          <KpiCard
            label="Pendentes"
            value={summary.pendentes}
            icon={Clock}
            tone="neutral"
            onClick={() => navigate("/servicos")}
          />
          <KpiCard
            label="Concluídos no mês"
            value={summary.concluidosMes}
            icon={CheckCircle2}
            tone="success"
            onClick={() => navigate("/servicos")}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Critical alerts */}
          <Card className="rounded-2xl p-4 lg:col-span-2">
            <SectionHeader
              icon={AlertTriangle}
              title="Alertas críticos"
              tone="danger"
              actionLabel="Ver todos"
              onAction={() => navigate("/notificacoes")}
            />
            {alerts.length === 0 ? (
              <EmptyState text="Nenhum alerta no momento. Tudo sob controle." />
            ) : (
              <ul className="mt-3 space-y-2">
                {alerts.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => n.link && navigate(n.link)}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition",
                      "hover:bg-muted/50 cursor-pointer",
                      n.type === "critical"
                        ? "border-destructive/30 bg-destructive/5"
                        : "border-warning/30 bg-warning/5"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                        n.type === "critical" ? "bg-destructive" : "bg-warning"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{n.title}</div>
                      {n.description && (
                        <div className="truncate text-xs text-muted-foreground">
                          {n.description}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Today's agenda */}
          <Card className="rounded-2xl p-4">
            <SectionHeader
              icon={CalendarDays}
              title="Agenda de hoje"
              tone="info"
              actionLabel="Abrir"
              onAction={() => navigate("/agenda")}
            />
            {agendaLoading ? (
              <LoadingRow />
            ) : todayEvents.length === 0 ? (
              <EmptyState text="Sem compromissos hoje." />
            ) : (
              <ul className="mt-3 space-y-2">
                {todayEvents.slice(0, 6).map((e) => (
                  <li
                    key={e.id}
                    onClick={() => e.service_id && navigate("/servicos")}
                    className="flex items-start gap-3 rounded-xl border p-2.5 hover:bg-muted/50 cursor-pointer"
                  >
                    <div className="flex w-12 shrink-0 flex-col items-center rounded-md bg-muted px-2 py-1 text-xs">
                      <span className="font-semibold tabular-nums">
                        {e.all_day ? "—" : format(new Date(e.start_at), "HH:mm")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{e.title}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {e.event_type.replace(/_/g, " ")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Pipeline */}
          <Card className="rounded-2xl p-4 lg:col-span-2">
            <SectionHeader
              icon={TrendingUp}
              title="Pipeline por etapa"
              tone="info"
              actionLabel="Kanban"
              onAction={() => navigate("/servicos")}
            />
            {loading ? (
              <LoadingRow />
            ) : (
              <div className="mt-3 space-y-2.5">
                {pipeline.map(({ stage, count, pct }) => (
                  <button
                    key={stage}
                    onClick={() => navigate("/servicos")}
                    className="w-full text-left"
                  >
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{STAGE_LABEL[stage]}</span>
                      <span className="tabular-nums text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full transition-all", STAGE_BAR_CLASS[stage])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Finance / Cora summary */}
          <Card className="rounded-2xl p-4">
            <SectionHeader
              icon={Wallet}
              title="Financeiro do mês"
              tone="success"
              actionLabel="Detalhes"
              onAction={() => navigate("/financeiro")}
            />
            <div className="mt-3 space-y-3">
              <FinanceRowItem
                label="Boletos emitidos"
                value={String(financeStats.boletosEmitidos)}
              />
              <FinanceRowItem
                label="Boletos pagos"
                value={String(financeStats.boletosPagos)}
              />
              <div className="border-t pt-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  Valor recebido
                </div>
                <div className="mt-1 font-display text-2xl font-semibold tabular-nums text-success">
                  {formatBRL(financeStats.valorRecebido)}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* My tasks */}
        <Card className="rounded-2xl p-4">
          <SectionHeader
            icon={ListChecks}
            title="Minhas tarefas"
            tone="info"
            actionLabel="Ver todas"
            onAction={() => navigate("/servicos")}
          />
          {loading ? (
            <LoadingRow />
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TaskColumn
                title="Atrasados"
                tone="danger"
                items={myTasks.overdue}
                emptyText="Sem atrasos. 🎉"
                onOpen={(id) => navigate(`/servicos?focus=${id}`)}
              />
              <TaskColumn
                title="Próximos"
                tone="info"
                items={myTasks.pending}
                emptyText="Nenhum serviço atribuído a você."
                onOpen={(id) => navigate(`/servicos?focus=${id}`)}
              />
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

// ---------- subcomponents ----------
function KpiCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
  onClick?: () => void;
}) {
  const toneBg: Record<string, string> = {
    neutral: "bg-card",
    success: "bg-success/10 border-success/20",
    danger: "bg-destructive/10 border-destructive/20",
    warning: "bg-warning/10 border-warning/30",
    info: "bg-info/10 border-info/20",
  };
  const toneIcon: Record<string, string> = {
    neutral: "text-foreground",
    success: "text-success",
    danger: "text-destructive",
    warning: "text-warning",
    info: "text-info",
  };
  return (
    <Card
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 transition",
        toneBg[tone],
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-semibold tabular-nums md:text-3xl">
            {value}
          </div>
        </div>
        <div className={cn("rounded-xl p-2", toneBg[tone], toneIcon[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  tone = "info",
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tone?: "info" | "danger" | "success" | "warning";
  actionLabel?: string;
  onAction?: () => void;
}) {
  const toneText: Record<string, string> = {
    info: "text-info",
    danger: "text-destructive",
    success: "text-success",
    warning: "text-warning",
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", toneText[tone])} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {actionLabel && (
        <Button variant="ghost" size="sm" onClick={onAction} className="h-7 text-xs">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
    </div>
  );
}

function FinanceRowItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function TaskColumn({
  title,
  tone,
  items,
  emptyText,
  onOpen,
}: {
  title: string;
  tone: "danger" | "info";
  items: ServiceRow[];
  emptyText: string;
  onOpen: (id: string) => void;
}) {
  const toneBadge =
    tone === "danger"
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : "bg-info/10 text-info border-info/20";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Badge variant="outline" className={cn("rounded-md", toneBadge)}>
          {title}
        </Badge>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li
              key={s.id}
              onClick={() => onOpen(s.id)}
              className="flex items-center justify-between gap-2 rounded-lg border p-2.5 hover:bg-muted/50 cursor-pointer"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {STAGE_LABEL[s.stage]}
                  {s.due_date && (
                    <>
                      {" · "}
                      <span
                        className={cn(
                          tone === "danger" ? "text-destructive font-medium" : ""
                        )}
                      >
                        {format(new Date(s.due_date), "dd/MM/yyyy")}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
