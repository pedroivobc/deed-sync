import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle, ArrowDownRight, ArrowUpRight, CalendarIcon, CheckCircle2,
  Clock, Copy, CreditCard, Download, Plus, Search, Trash2, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { formatBRL } from "@/lib/money";
import {
  RECEITA_CATEGORIES, DESPESA_CATEGORIES, PERIOD_LABEL,
  computeKpis, dreByCategory, exportToCsv, formatPct, inRange,
  last6Months, pctChange, resolvePeriod,
  type FinanceEntry, type FinanceStatus, type FinanceType, type PeriodKey,
} from "@/lib/finance";
import { KpiCard } from "@/components/financeiro/KpiCard";
import { FinanceFormDialog } from "@/components/financeiro/FinanceFormDialog";
import { RevenueExpenseChart } from "@/components/financeiro/RevenueExpenseChart";
import { RevenueByServiceChart } from "@/components/financeiro/RevenueByServiceChart";
import { DreTable } from "@/components/financeiro/DreTable";
import { AlertsBanner } from "@/components/financeiro/AlertsBanner";
import { BpoRecommendations } from "@/components/financeiro/BpoRecommendations";

type ServiceLite = { id: string; subject: string; type: "escritura" | "avulso" | "regularizacao" };
type ClientLite = { id: string; name: string };

const PAGE_SIZE = 25;

export default function Financeiro() {
  const { isAdmin, isManager, loading: authLoading, roles } = useAuth();
  const { canDeleteFinanceEntry } = usePermissions();

  // ----- Permission gate (Colaborador → bloqueio total)
  const blocked = !authLoading && roles.length > 0 && !isManager;

  // ----- Data
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [services, setServices] = useState<Record<string, ServiceLite>>({});
  const [clients, setClients] = useState<Record<string, ClientLite>>({});
  const [loading, setLoading] = useState(true);

  // ----- Filters
  const [period, setPeriod] = useState<PeriodKey>("mes");
  const [customFrom, setCustomFrom] = useState<Date | null>(null);
  const [customTo, setCustomTo] = useState<Date | null>(null);
  const [categoryToggle, setCategoryToggle] = useState<"todas" | "receita" | "despesa">("todas");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<"all" | "escritura" | "avulso" | "regularizacao">("all");
  const [statusFilter, setStatusFilter] = useState<"todos" | FinanceStatus>("todos");
  const [search, setSearch] = useState("");

  // ----- Modal & UI
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [prefill, setPrefill] = useState<Parameters<typeof FinanceFormDialog>[0]["prefill"]>(undefined);
  const [toDelete, setToDelete] = useState<FinanceEntry | null>(null);
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // ----- Load
  const loadAll = async () => {
    setLoading(true);
    const [{ data: ent, error }, svcRes, cliRes] = await Promise.all([
      supabase.from("finance_entries").select("*").order("date", { ascending: false }).limit(2000),
      supabase.from("services").select("id, subject, type").limit(2000),
      supabase.from("clients").select("id, name").limit(2000),
    ]);
    if (error) toast.error(error.message);
    setEntries((ent ?? []) as FinanceEntry[]);
    const sMap: Record<string, ServiceLite> = {};
    (svcRes.data ?? []).forEach((s) => { sMap[s.id] = s as ServiceLite; });
    setServices(sMap);
    const cMap: Record<string, ClientLite> = {};
    (cliRes.data ?? []).forEach((c) => { cMap[c.id] = c as ClientLite; });
    setClients(cMap);
    setLoading(false);
  };

  useEffect(() => {
    if (blocked) return;
    loadAll();
    // realtime
    const ch = supabase.channel("finance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_entries" }, () => loadAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked]);

  // ----- Period range
  const range = useMemo(
    () => resolvePeriod(period, { from: customFrom, to: customTo }),
    [period, customFrom, customTo]
  );

  // ----- Apply filters (date + category + service-type + status + search)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (!inRange(e.date, range.from, range.to)) return false;
      if (categoryToggle !== "todas" && e.type !== categoryToggle) return false;
      if (statusFilter !== "todos" && e.status !== statusFilter) return false;
      if (serviceTypeFilter !== "all") {
        if (!e.service_id) return false;
        const svc = services[e.service_id];
        if (!svc || svc.type !== serviceTypeFilter) return false;
      }
      if (q) {
        const cli = e.client_id ? clients[e.client_id]?.name ?? "" : "";
        const svc = e.service_id ? services[e.service_id]?.subject ?? "" : "";
        const hay = `${e.description} ${cli} ${svc} ${e.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [entries, range, categoryToggle, statusFilter, serviceTypeFilter, search, services, clients]);

  const previousFiltered = useMemo(() => {
    return entries.filter(
      (e) =>
        inRange(e.date, range.prevFrom, range.prevTo) &&
        (categoryToggle === "todas" || e.type === categoryToggle)
    );
  }, [entries, range, categoryToggle]);

  // ----- KPIs
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const prevKpis = useMemo(() => computeKpis(previousFiltered), [previousFiltered]);
  const receitaPct = pctChange(kpis.receita, prevKpis.receita);
  const despesaPct = pctChange(kpis.despesa, prevKpis.despesa);

  // ----- Charts
  const last6 = useMemo(() => last6Months(entries), [entries]);
  const revenueByServiceType = useMemo(() => {
    const acc: Record<string, number> = { Escritura: 0, Avulso: 0, Regularização: 0, Outros: 0 };
    filtered
      .filter((e) => e.type === "receita" && e.status === "pago")
      .forEach((e) => {
        if (!e.service_id) { acc["Outros"] += Number(e.amount); return; }
        const svc = services[e.service_id];
        if (!svc) { acc["Outros"] += Number(e.amount); return; }
        const label = svc.type === "escritura" ? "Escritura" : svc.type === "avulso" ? "Avulso" : "Regularização";
        acc[label] += Number(e.amount);
      });
    return [
      { name: "Escritura", value: acc.Escritura, color: "hsl(var(--accent))" },
      { name: "Avulso", value: acc.Avulso, color: "hsl(var(--foreground))" },
      { name: "Regularização", value: acc.Regularização, color: "hsl(var(--muted-foreground))" },
      { name: "Outros", value: acc.Outros, color: "hsl(var(--border))" },
    ];
  }, [filtered, services]);

  // ----- DRE
  const dreReceitas = useMemo(
    () => dreByCategory(entries, "receita", RECEITA_CATEGORIES, range.from, range.to, range.prevFrom, range.prevTo),
    [entries, range]
  );
  const dreDespesas = useMemo(
    () => dreByCategory(entries, "despesa", DESPESA_CATEGORIES, range.from, range.to, range.prevFrom, range.prevTo),
    [entries, range]
  );

  // ----- Alerts
  const alerts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const limit30 = new Date(today); limit30.setDate(limit30.getDate() - 30);
    const overdueValue = entries
      .filter((e) => e.type === "receita" && e.status === "pendente" && e.due_date && new Date(e.due_date + "T00:00:00") < limit30)
      .reduce((s, e) => s + Number(e.amount), 0);
    const next7 = new Date(today); next7.setDate(next7.getDate() + 7);
    const dueSoonCount = entries.filter((e) =>
      e.type === "despesa" && e.status === "pendente" && e.due_date &&
      new Date(e.due_date + "T00:00:00") >= today && new Date(e.due_date + "T00:00:00") <= next7
    ).length;
    return { overdueValue, dueSoonCount };
  }, [entries]);

  // ----- Sorted table
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      return a.date < b.date ? -1 * dir : a.date > b.date ? 1 * dir : 0;
    });
    return arr;
  }, [filtered, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [period, customFrom, customTo, categoryToggle, statusFilter, serviceTypeFilter, search]);

  // ----- Actions
  const handleNew = () => { setEditing(null); setPrefill(undefined); setFormOpen(true); };
  const handleEdit = (e: FinanceEntry) => { setEditing(e); setPrefill(undefined); setFormOpen(true); };
  const handleDuplicate = (e: FinanceEntry) => {
    setEditing(null);
    setPrefill({
      type: e.type, description: e.description, amount: Number(e.amount),
      category: e.category ?? undefined, service_id: e.service_id ?? undefined, client_id: e.client_id ?? undefined,
    });
    setFormOpen(true);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("finance_entries").delete().eq("id", toDelete.id);
    if (error) toast.error(error.message);
    else { toast.success("Lançamento excluído."); loadAll(); }
    setToDelete(null);
  };
  const togglePaid = async (e: FinanceEntry) => {
    const next: FinanceStatus = e.status === "pago" ? "pendente" : "pago";
    const { error } = await supabase.from("finance_entries").update({ status: next }).eq("id", e.id);
    if (error) toast.error(error.message);
    else loadAll();
  };
  const doExport = () => {
    if (sorted.length === 0) { toast.info("Nada para exportar no período."); return; }
    const stamp = format(new Date(), "yyyyMMdd-HHmm");
    exportToCsv(sorted, `financeiro-${stamp}.csv`);
    toast.success("CSV exportado.");
  };

  // ----- Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (blocked) return;
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (e.ctrlKey && e.key.toLowerCase() === "n" && !inField) {
        e.preventDefault();
        handleNew();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "e" && !inField) {
        e.preventDefault();
        doExport();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocked, sorted]);

  // ----- Permission block
  if (blocked) {
    return (
      <AppLayout title="Financeiro">
        <Card className="flex flex-col items-center justify-center gap-2 rounded-2xl border-dashed p-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
          <h2 className="font-display text-2xl">Acesso restrito</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Você não tem permissão para acessar esta área. O módulo Financeiro é restrito a administradores e gerentes.
          </p>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Financeiro">
      <div className="space-y-5">
        <header>
          <h1 className="font-display text-3xl">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Gestão financeira e indicadores do negócio</p>
        </header>

        <AlertsBanner overdueValue={alerts.overdueValue} dueSoonCount={alerts.dueSoonCount} />

        {/* Filtros globais */}
        <Card className="rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            {(["mes", "trimestre", "ano", "12m", "total", "custom"] as PeriodKey[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  period === p ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted/40"
                )}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}

            {period === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFrom ? format(customFrom, "dd/MM/yy") : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom ?? undefined} onSelect={(d) => setCustomFrom(d ?? null)} className="pointer-events-auto p-3" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customTo ? format(customTo, "dd/MM/yy") : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo ?? undefined} onSelect={(d) => setCustomTo(d ?? null)} className="pointer-events-auto p-3" />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <div className="ml-2 inline-flex rounded-lg border border-border bg-muted/40 p-1">
              {(["todas", "receita", "despesa"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryToggle(c)}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium capitalize transition",
                    categoryToggle === c ? "bg-card shadow-sm" : "text-muted-foreground"
                  )}
                >
                  {c === "todas" ? "Todas" : c === "receita" ? "Receitas" : "Despesas"}
                </button>
              ))}
            </div>

            <Select value={serviceTypeFilter} onValueChange={(v) => setServiceTypeFilter(v as typeof serviceTypeFilter)}>
              <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os serviços</SelectItem>
                <SelectItem value="escritura">Escritura</SelectItem>
                <SelectItem value="avulso">Avulso</SelectItem>
                <SelectItem value="regularizacao">Regularização</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pago">Pagos / Recebidos</SelectItem>
                <SelectItem value="pendente">Pendentes</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="ml-auto" onClick={doExport}>
              <Download className="mr-2 h-4 w-4" /> Exportar CSV
            </Button>
            <Button size="sm" onClick={handleNew}>
              <Plus className="mr-1 h-4 w-4" /> Novo lançamento
            </Button>
          </div>
        </Card>

        {/* KPIs principais */}
        {loading ? (
          <div className="grid gap-3 md:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <KpiCard
              label="Receita" value={kpis.receita} tone="success" icon={ArrowUpRight}
              subtext={`${formatPct(receitaPct)} vs período anterior`}
              onClick={() => setCategoryToggle("receita")}
            />
            <KpiCard
              label="Despesa" value={kpis.despesa} tone="danger" icon={ArrowDownRight}
              subtext={`${formatPct(despesaPct)} vs período anterior`}
              onClick={() => setCategoryToggle("despesa")}
            />
            <KpiCard
              label="Resultado líquido" value={kpis.liquido}
              tone={kpis.liquido >= 0 ? "success" : "danger"}
              icon={kpis.liquido >= 0 ? TrendingUp : TrendingDown}
              subtext={`Margem: ${kpis.margem === null ? "—" : kpis.margem.toFixed(1) + "%"}`}
            />
            <KpiCard
              label="Ticket médio" value={kpis.ticketMedio} tone="warning" icon={CreditCard}
              subtext="Por serviço"
            />
          </div>
        )}

        {/* KPIs operacionais BPO */}
        {!loading && (
          <div className="grid gap-3 md:grid-cols-4">
            <KpiCard label="A receber" value={kpis.receivable} tone="warning" icon={Clock} small
              subtext={`${entries.filter((e) => e.type === "receita" && e.status === "pendente").length} lançamentos`} />
            <KpiCard label="A pagar" value={kpis.payable} tone="danger" icon={AlertCircle} small
              subtext={`${entries.filter((e) => e.type === "despesa" && e.status === "pendente").length} lançamentos`} />
            <KpiCard label="Fluxo projetado D+30" value={kpis.fluxoD30}
              tone={kpis.fluxoD30 >= 0 ? "success" : "danger"} icon={Wallet} small
              subtext="Pendentes nos próximos 30 dias" />
            <KpiCard
              label="Inadimplência"
              value={`${kpis.inadimplenciaPct.toFixed(1)}%`}
              isCurrency={false}
              tone={kpis.inadimplenciaPct > 10 ? "danger" : "neutral"}
              icon={AlertCircle}
              small
              subtext={`${formatBRL(kpis.inadimplenciaValor)} em atraso`}
            />
          </div>
        )}

        {/* Gráficos */}
        <div className="grid gap-3 lg:grid-cols-2">
          <Card className="rounded-2xl p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-accent-foreground/80">
              Receita vs Despesa (últimos 6 meses)
            </h2>
            {loading ? <Skeleton className="h-[300px] w-full" /> : <RevenueExpenseChart data={last6} />}
          </Card>
          <Card className="rounded-2xl p-4">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-accent-foreground/80">
              Receita por tipo de serviço
            </h2>
            {loading ? <Skeleton className="h-[300px] w-full" /> : <RevenueByServiceChart data={revenueByServiceType} />}
          </Card>
        </div>

        {/* DRE */}
        <section className="space-y-2">
          <h2 className="font-display text-xl">Fluxo de caixa por categoria</h2>
          {loading ? <Skeleton className="h-80 rounded-2xl" /> : <DreTable receitas={dreReceitas} despesas={dreDespesas} />}
        </section>

        {/* Tabela */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Lançamentos</h2>
            <div className="relative w-[280px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." className="pl-9" />
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-80 rounded-2xl" />
          ) : sorted.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 rounded-2xl border-dashed p-12 text-center">
              <Wallet className="h-10 w-10 text-muted-foreground" />
              <div>
                <h3 className="font-display text-xl">Nenhum lançamento no período</h3>
                <p className="text-sm text-muted-foreground">Comece criando um novo lançamento para acompanhar suas finanças.</p>
              </div>
              <Button onClick={handleNew}><Plus className="mr-1 h-4 w-4" /> Criar primeiro lançamento</Button>
            </Card>
          ) : (
            <Card className="overflow-hidden rounded-2xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer select-none" onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}>
                      Data {sortDir === "desc" ? "↓" : "↑"}
                    </TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((e) => {
                    const svc = e.service_id ? services[e.service_id] : null;
                    const cli = e.client_id ? clients[e.client_id] : null;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{format(new Date(e.date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                        <TableCell className="max-w-[260px] truncate font-medium">{e.description}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{e.category ?? "—"}</Badge></TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", e.type === "receita" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground")}>
                            {e.type === "receita" ? "Receita" : "Despesa"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", e.status === "pago" ? "bg-success/15 text-success" : "bg-warning/20 text-warning-foreground")}>
                            {e.status === "pago" ? (e.type === "receita" ? "Recebido" : "Pago") : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate text-sm">
                          {svc ? <span className="cursor-pointer underline-offset-2 hover:underline" onClick={() => window.location.assign("/servicos")}>{svc.subject}</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate text-sm">
                          {cli ? <span className="cursor-pointer underline-offset-2 hover:underline" onClick={() => window.location.assign("/crm")}>{cli.name}</span> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className={cn("text-right tabular-nums", e.type === "receita" ? "text-success" : "text-destructive")}>
                          {formatBRL(Number(e.amount))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {e.status === "pendente" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => togglePaid(e)}>
                                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Pago
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDuplicate(e)} title="Duplicar">
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(e)}>
                              ✎
                            </Button>
                            {canDeleteFinanceEntry(e.created_at) && (
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setToDelete(e)} title="Excluir">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-sm">
                  <span className="text-muted-foreground">Página {page} de {totalPages} • {sorted.length} lançamentos</span>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                    <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Próxima</Button>
                  </div>
                </div>
              )}
            </Card>
          )}
        </section>

        <BpoRecommendations />
      </div>

      <FinanceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        entry={editing}
        prefill={prefill}
        onSaved={loadAll}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Tem certeza que deseja excluir o lançamento "{toDelete?.description}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
