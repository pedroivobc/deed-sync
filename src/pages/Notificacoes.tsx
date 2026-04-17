import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify, humanizeBackendError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { AppNotification, NotificationType } from "@/hooks/useNotifications";

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};
const TYPE_COLOR: Record<NotificationType, string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

type StatusFilter = "all" | "unread" | "read";
type PeriodFilter = "all" | "today" | "week" | "month";
const PAGE_SIZE = 25;

function periodGroup(d: Date): "Hoje" | "Ontem" | "Esta semana" | "Mais antigas" {
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "Esta semana";
  return "Mais antigas";
}

export default function Notificacoes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<NotificationType | "all">("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      notify.error(humanizeBackendError(error.message), { retry: load });
      setLoading(false);
      return;
    }
    setItems((data ?? []) as AppNotification[]);
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return items.filter((n) => {
      if (type !== "all" && n.type !== type) return false;
      if (status === "unread" && n.read_at) return false;
      if (status === "read" && !n.read_at) return false;
      if (period !== "all") {
        const age = now - new Date(n.created_at).getTime();
        const day = 86_400_000;
        if (period === "today" && age > day) return false;
        if (period === "week" && age > 7 * day) return false;
        if (period === "month" && age > 30 * day) return false;
      }
      return true;
    });
  }, [items, type, status, period]);

  useEffect(() => { setPage(1); }, [type, status, period]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const grouped = useMemo(() => {
    const g: Record<string, AppNotification[]> = {};
    paged.forEach((n) => {
      const k = periodGroup(new Date(n.created_at));
      (g[k] ||= []).push(n);
    });
    return g;
  }, [paged]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageSelected = paged.length > 0 && paged.every((n) => selected.has(n.id));

  const toggleAllOnPage = () => {
    setSelected((s) => {
      const next = new Set(s);
      if (allOnPageSelected) paged.forEach((n) => next.delete(n.id));
      else paged.forEach((n) => next.add(n.id));
      return next;
    });
  };

  const markSelectedRead = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return notify.error(humanizeBackendError(error.message));
    notify.success(`${ids.length} marcada(s) como lida(s).`);
    load();
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    const { error } = await supabase.from("notifications").delete().in("id", ids);
    setConfirmDelete(false);
    if (error) return notify.error(humanizeBackendError(error.message));
    notify.success(`${ids.length} excluída(s).`);
    load();
  };

  const onOpen = async (n: AppNotification) => {
    if (!n.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
    }
    if (n.link) navigate(n.link);
  };

  return (
    <AppLayout title="Notificações">
      <div className="mx-auto max-w-5xl">
        <Breadcrumbs items={[{ label: "Notificações" }]} />

        {/* Filters */}
        <Card className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl p-4 shadow-soft">
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
                <SelectItem value="info">Informativo</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="unread">Não lidas</SelectItem>
                <SelectItem value="read">Lidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[140px] flex-1">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Período</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sempre</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Últimos 30 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Bulk actions bar */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={allOnPageSelected} onCheckedChange={toggleAllOnPage} />
            <span>{selected.size > 0 ? `${selected.size} selecionada(s)` : "Selecionar página"}</span>
          </label>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!selected.size} onClick={markSelectedRead}>
              Marcar como lidas
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!selected.size}
              onClick={() => setConfirmDelete(true)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" /> Excluir
            </Button>
          </div>
        </div>

        {/* List */}
        <Card className="overflow-hidden rounded-2xl shadow-soft">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Você está em dia!"
              description="Nenhuma notificação corresponde aos filtros."
            />
          ) : (
            Object.entries(grouped).map(([group, list]) => (
              <div key={group}>
                <div className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {group}
                </div>
                <ul className="divide-y divide-border">
                  {list.map((n) => {
                    const Icon = TYPE_ICON[n.type];
                    const unread = !n.read_at;
                    const checked = selected.has(n.id);
                    return (
                      <li
                        key={n.id}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50",
                          unread && "bg-accent/5",
                        )}
                      >
                        <Checkbox
                          className="mt-1.5"
                          checked={checked}
                          onCheckedChange={() => toggle(n.id)}
                        />
                        <button
                          type="button"
                          onClick={() => onOpen(n)}
                          className="flex flex-1 items-start gap-3 text-left"
                        >
                          {unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TYPE_COLOR[n.type])} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-tight">{n.title}</p>
                            {n.description && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{n.description}</p>
                            )}
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </Card>

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Página {page} de {totalPages} · {filtered.length} no total
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir notificações?"
        description={`${selected.size} notificação(ões) serão removidas permanentemente.`}
        confirmText="Excluir"
        loadingText="Excluindo..."
        onConfirm={async () => { await deleteSelected(); }}
      />
    </AppLayout>
  );
}
