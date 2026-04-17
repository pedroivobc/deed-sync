import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon, LayoutGrid, List as ListIcon, Plus, Search, Trash2,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { KanbanSkeleton, TableRowsSkeleton } from "@/components/ui/skeletons";
import { IconAction } from "@/components/ui/icon-action";
import { cn } from "@/lib/utils";
import { notify, humanizeBackendError } from "@/lib/notify";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  SERVICE_TYPE_BADGE, SERVICE_TYPE_LABEL, STAGE_BADGE_CLASS, STAGE_LABEL,
  STAGE_ORDER, dueDateColorClass, type ServiceStage, type ServiceType,
} from "@/lib/serviceUi";
import { getInitials } from "@/lib/clientUi";
import { KanbanColumn } from "@/components/servicos/KanbanColumn";
import { ServiceFormDialog } from "@/components/servicos/ServiceFormDialog";
import type { ServiceCardData } from "@/components/servicos/ServiceCard";
import { useServiceAlerts } from "@/hooks/useServiceAlerts";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type ProfileRow = { id: string; name: string | null; email: string | null };
type ClientLite = { id: string; name: string; cpf_cnpj: string | null };

interface ServiceFull extends ServiceRow {
  client: ClientLite | null;
  assigned: ProfileRow | null;
}

const PAGE_SIZE = 25;

export default function Servicos() {
  const { user } = useAuth();
  const { canDeleteService } = usePermissions();

  const [view, setView] = useState<"kanban" | "lista">("kanban");
  const [services, setServices] = useState<ServiceFull[]>([]);
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ServiceType | "all">("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);

  // Dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);

  // Delete confirm
  const [toDelete, setToDelete] = useState<ServiceFull | null>(null);

  // Pagination (list view)
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"created_at" | "due_date" | "subject">("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load
  const loadServices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("services")
      .select(`
        *,
        client:clients ( id, name, cpf_cnpj ),
        assigned:profiles!services_assigned_to_fkey ( id, name, email )
      `)
      .order("created_at", { ascending: false });
    if (error) notify.error(humanizeBackendError(error), { retry: loadServices });
    setServices((data as unknown as ServiceFull[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    loadServices();
    supabase.from("profiles").select("id, name, email").order("name").then(({ data }) => {
      setUsers((data ?? []) as ProfileRow[]);
    });
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("services-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "services" },
        () => loadServices()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return services.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false;
      if (assignedFilter !== "all" && s.assigned_to !== assignedFilter) return false;
      if (dateFrom && new Date(s.created_at) < dateFrom) return false;
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        if (new Date(s.created_at) > end) return false;
      }
      if (q) {
        const hay = `${s.subject} ${s.client?.name ?? ""} ${s.client?.cpf_cnpj ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [services, search, typeFilter, assignedFilter, dateFrom, dateTo]);

  // Group for Kanban
  const grouped = useMemo(() => {
    const g: Record<ServiceStage, ServiceCardData[]> = {
      entrada: [], documentacao: [], analise: [], execucao: [], revisao: [], concluido: [],
    };
    filtered.forEach((s) => {
      g[s.stage].push({
        id: s.id,
        type: s.type,
        subject: s.subject,
        client_name: s.client?.name ?? null,
        created_at: s.created_at,
        due_date: s.due_date,
        pasta_fisica: s.pasta_fisica,
        assigned_name: s.assigned?.name ?? s.assigned?.email ?? null,
      });
    });
    return g;
  }, [filtered]);

  // Alerts for escritura services (badges on cards/rows)
  const escrituraIds = useMemo(
    () => filtered.filter((s) => s.type === "escritura").map((s) => s.id),
    [filtered]
  );
  const alertsMap = useServiceAlerts(escrituraIds);

  // Sorted list (lista view)
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av: string | number = (a[sortBy] as string) ?? "";
      const bv: string | number = (b[sortBy] as string) ?? "";
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sorted.slice(start, start + PAGE_SIZE);
  }, [sorted, page]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));

  // Drag & drop
  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const newStage = over.id as ServiceStage;
    const id = active.id as string;
    const svc = services.find((s) => s.id === id);
    if (!svc || svc.stage === newStage) return;

    const previousStage = svc.stage;
    // Optimistic
    setServices((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              stage: newStage,
              completed_at: newStage === "concluido" ? new Date().toISOString() : null,
            }
          : s
      )
    );

    const { error } = await supabase
      .from("services")
      .update({
        stage: newStage,
        completed_at: newStage === "concluido" ? new Date().toISOString() : null,
      })
      .eq("id", id);

    if (error) {
      // Rollback
      setServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, stage: previousStage } : s))
      );
      notify.error("Não foi possível mover o card.", { retry: () => onDragEnd(e) });
      return;
    }

    await supabase.from("service_activity_log").insert({
      service_id: id,
      user_id: user?.id ?? null,
      action: "stage_changed",
      payload: { from: previousStage, to: newStage } as never,
    });

    notify.success(`Movido para ${STAGE_LABEL[newStage]}`);
  };

  const handleOpenEdit = (id: string) => {
    const svc = services.find((s) => s.id === id);
    if (svc) {
      setEditing(svc);
      setFormOpen(true);
    }
  };

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const canDelete = (s: ServiceFull) => canDeleteService(s.created_by);

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("services").delete().eq("id", toDelete.id);
    if (error) {
      notify.error(humanizeBackendError(error));
    } else {
      notify.success("Serviço excluído");
      setServices((prev) => prev.filter((s) => s.id !== toDelete.id));
    }
    setToDelete(null);
  };

  const clearFilters = () => {
    setSearch(""); setTypeFilter("all"); setAssignedFilter("all");
    setDateFrom(null); setDateTo(null);
  };

  return (
    <AppLayout title="Serviços em Andamento">
      <div className="space-y-5">
        <header>
          <h1 className="font-display text-3xl">Serviços em Andamento</h1>
          <p className="text-sm text-muted-foreground">
            Gestão completa dos processos em execução
          </p>
        </header>

        {/* Toolbar */}
        <div className="sticky top-0 z-10 -mx-6 border-b border-border bg-background/95 px-6 py-3 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            {/* View toggle */}
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setView("kanban")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                  view === "kanban" ? "bg-card shadow-sm" : "text-muted-foreground"
                )}
              >
                <LayoutGrid className="h-4 w-4" /> Kanban
              </button>
              <button
                type="button"
                onClick={() => setView("lista")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
                  view === "lista" ? "bg-card shadow-sm" : "text-muted-foreground"
                )}
              >
                <ListIcon className="h-4 w-4" /> Lista
              </button>
            </div>

            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ServiceType | "all")}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="escritura">Escritura</SelectItem>
                <SelectItem value="avulso">Serviço Avulso</SelectItem>
                <SelectItem value="regularizacao">Regularização</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yy") : "De"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom ?? undefined} onSelect={(d) => setDateFrom(d ?? null)} className="pointer-events-auto p-3" />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yy") : "Até"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo ?? undefined} onSelect={(d) => setDateTo(d ?? null)} className="pointer-events-auto p-3" />
              </PopoverContent>
            </Popover>

            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos responsáveis</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name ?? u.email ?? u.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por assunto, cliente ou CPF/CNPJ..."
                className="pl-9"
              />
            </div>

            {(search || typeFilter !== "all" || assignedFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar</Button>
            )}

            <Button onClick={handleNew} className="ml-auto gap-1.5">
              <Plus className="h-4 w-4" /> Novo serviço
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          view === "kanban" ? (
            <KanbanSkeleton columns={STAGE_ORDER.length} cardsPerColumn={3} />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <TableHead key={i}>—</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton rows={5} cols={9} />
                </TableBody>
              </Table>
            </Card>
          )
        ) : services.length === 0 ? (
          <EmptyState onCreate={handleNew} />
        ) : view === "kanban" ? (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-4">
              {STAGE_ORDER.map((s) => (
                <KanbanColumn
                  key={s}
                  stage={s}
                  services={grouped[s]}
                  onOpen={handleOpenEdit}
                  virtualize={services.length > 50}
                  alertsMap={alertsMap}
                />
              ))}
            </div>
          </DndContext>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortHeader label="Assunto" col="subject" sortBy={sortBy} sortDir={sortDir} onSort={(c) => { setSortBy(c); setSortDir(sortBy === c && sortDir === "asc" ? "desc" : "asc"); }} />
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Etapa do processo</TableHead>
                  <SortHeader label="Entrada" col="created_at" sortBy={sortBy} sortDir={sortDir} onSort={(c) => { setSortBy(c); setSortDir(sortBy === c && sortDir === "asc" ? "desc" : "asc"); }} />
                  <SortHeader label="Prazo" col="due_date" sortBy={sortBy} sortDir={sortDir} onSort={(c) => { setSortBy(c); setSortDir(sortBy === c && sortDir === "asc" ? "desc" : "asc"); }} />
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => handleOpenEdit(s.id)}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {s.type === "escritura" && alertsMap[s.id]?.hasExpired && (
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-destructive" aria-label="Documento vencido" />
                        )}
                        {s.type === "escritura" && !alertsMap[s.id]?.hasExpired && alertsMap[s.id]?.expiringSoon && (
                          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-warning" aria-label="Documento vence em breve" />
                        )}
                        {s.type === "escritura" && !alertsMap[s.id]?.hasExpired && !alertsMap[s.id]?.expiringSoon && alertsMap[s.id]?.complete && (
                          <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-success" aria-label="Documentação completa" />
                        )}
                        <span>{s.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[10px] uppercase", SERVICE_TYPE_BADGE[s.type])}>
                        {SERVICE_TYPE_LABEL[s.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.client ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help underline-offset-2 hover:underline">{s.client.name}</span>
                            </TooltipTrigger>
                            <TooltipContent>{s.client.cpf_cnpj ?? "Sem documento"}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-xs", STAGE_BADGE_CLASS[s.stage])}>{STAGE_LABEL[s.stage]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.etapa_processo ?? "—"}</TableCell>
                    <TableCell className="text-sm">{format(new Date(s.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                    <TableCell className={cn("text-sm", dueDateColorClass(s.due_date))}>
                      {s.due_date ? format(new Date(s.due_date), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.assigned ? (
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                            {getInitials(s.assigned.name ?? s.assigned.email)}
                          </div>
                          <span>{s.assigned.name ?? s.assigned.email}</span>
                        </div>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      {canDelete(s) && (
                        <IconAction
                          label="Excluir serviço"
                          onClick={(e) => { e.stopPropagation(); setToDelete(s); }}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconAction>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  Página {page} de {totalPages} · {sorted.length} serviços
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
                </div>
              </div>
            )}
          </Card>
        )}
      </div>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editing}
        onSaved={loadServices}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir serviço?"
        description={
          <>
            Esta ação não pode ser desfeita. O serviço{" "}
            <strong>"{toDelete?.subject}"</strong> será removido permanentemente.
          </>
        }
        confirmText="Sim, excluir"
        loadingText="Excluindo..."
        onConfirm={confirmDelete}
      />
    </AppLayout>
  );
}

function SortHeader({
  label, col, sortBy, sortDir, onSort,
}: {
  label: string; col: "created_at" | "due_date" | "subject";
  sortBy: string; sortDir: "asc" | "desc"; onSort: (c: "created_at" | "due_date" | "subject") => void;
}) {
  const active = sortBy === col;
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      >
        {label}
        {active && <span className="text-xs">{sortDir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </TableHead>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-4 rounded-2xl border-dashed py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
        <LayoutGrid className="h-7 w-7 text-accent" />
      </div>
      <div>
        <h3 className="font-display text-2xl">Nenhum serviço cadastrado ainda</h3>
        <p className="text-sm text-muted-foreground">
          Comece criando o primeiro serviço para acompanhar no Kanban.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1.5">
        <Plus className="h-4 w-4" /> Cadastrar primeiro serviço
      </Button>
    </Card>
  );
}
