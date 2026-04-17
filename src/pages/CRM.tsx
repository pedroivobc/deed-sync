import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, Plus, Eye, Pencil, Trash2, Users, ChevronUp, ChevronDown,
} from "lucide-react";

import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  STATUS_LABEL, STATUS_BADGE, CATEGORY_LABEL, ORIGIN_LABEL,
  followupColorClass, type ClientStatus, type ClientCategory, type ClientOrigin,
} from "@/lib/clientUi";
import { ClientFormDialog } from "@/components/crm/ClientFormDialog";
import { ClientDetailsDialog } from "@/components/crm/ClientDetailsDialog";
import type { Database } from "@/integrations/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

type SortKey = "name" | "status" | "next_followup";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

export default function CRM() {
  const { isManager } = useAuth(); // admin or gerente

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState<ClientStatus | "all">("all");
  const [catF, setCatF] = useState<ClientCategory | "all">("all");
  const [origF, setOrigF] = useState<ClientOrigin | "all">("all");

  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [viewing, setViewing] = useState<ClientRow | null>(null);
  const [openDetails, setOpenDetails] = useState(false);
  const [confirmDel, setConfirmDel] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: clients, error }, { data: svcs }] = await Promise.all([
      supabase.from("clients").select("*").order("created_at", { ascending: false }),
      supabase.from("services").select("client_id"),
    ]);
    if (error) toast.error(error.message);
    setRows((clients ?? []) as ClientRow[]);
    const counts: Record<string, number> = {};
    (svcs ?? []).forEach((s) => {
      if (s.client_id) counts[s.client_id] = (counts[s.client_id] ?? 0) + 1;
    });
    setServiceCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows.filter((c) => {
      if (statusF !== "all" && c.status !== statusF) return false;
      if (catF !== "all" && c.category !== catF) return false;
      if (origF !== "all" && c.origin !== origF) return false;
      if (!q) return true;
      const fields = [c.name, c.email, c.phone, c.cpf_cnpj].filter(Boolean).join(" ").toLowerCase();
      return fields.includes(q);
    });
    out = [...out].sort((a, b) => {
      let va: string | number = "", vb: string | number = "";
      if (sortBy === "name") { va = a.name?.toLowerCase() ?? ""; vb = b.name?.toLowerCase() ?? ""; }
      else if (sortBy === "status") { va = a.status; vb = b.status; }
      else if (sortBy === "next_followup") {
        va = a.next_followup ? new Date(a.next_followup).getTime() : Infinity;
        vb = b.next_followup ? new Date(b.next_followup).getTime() : Infinity;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [rows, search, statusF, catF, origF, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [search, statusF, catF, origF]);

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  };

  const openNew = () => { setEditing(null); setOpenForm(true); };
  const openEdit = (c: ClientRow) => { setEditing(c); setOpenForm(true); };
  const openView = (c: ClientRow) => { setViewing(c); setOpenDetails(true); };

  const doDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    // Detach services to preserve them
    await supabase.from("services").update({ client_id: null }).eq("client_id", confirmDel.id);
    const { error } = await supabase.from("clients").delete().eq("id", confirmDel.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Cliente excluído.");
    setConfirmDel(null);
    load();
  };

  const SortHead = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
      {children}
      {sortBy === k && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
    </button>
  );

  return (
    <AppLayout title="CRM — Relacionamento com Clientes">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">Gestão do pós-venda e acompanhamento de clientes ativos</p>
      </div>

      {/* Toolbar */}
      <Card className="mb-5 rounded-2xl p-4 shadow-soft">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, telefone ou CPF/CNPJ"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusF} onValueChange={(v) => setStatusF(v as ClientStatus | "all")}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {(Object.keys(STATUS_LABEL) as ClientStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{STATUS_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={catF} onValueChange={(v) => setCatF(v as ClientCategory | "all")}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {(Object.keys(CATEGORY_LABEL) as ClientCategory[]).map((k) => (
                  <SelectItem key={k} value={k}>{CATEGORY_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={origF} onValueChange={(v) => setOrigF(v as ClientOrigin | "all")}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas origens</SelectItem>
                {(Object.keys(ORIGIN_LABEL) as ClientOrigin[]).map((k) => (
                  <SelectItem key={k} value={k}>{ORIGIN_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Novo cliente</Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-2xl shadow-soft">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl font-semibold">Nenhum cliente cadastrado ainda</h3>
            <p className="mt-1 text-sm text-muted-foreground">Comece registrando seu primeiro cliente para acompanhar o pós-venda.</p>
            <Button onClick={openNew} className="mt-5 gap-2">
              <Plus className="h-4 w-4" /> Cadastrar primeiro cliente
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><SortHead k="name">Cliente</SortHead></TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead><SortHead k="status">Status</SortHead></TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Serviços</TableHead>
                    <TableHead><SortHead k="next_followup">Próximo follow-up</SortHead></TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{c.name}</div>
                        {c.cpf_cnpj && <div className="text-xs text-muted-foreground">{c.cpf_cnpj}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{c.email ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{c.phone ?? c.whatsapp ?? "—"}</div>
                      </TableCell>
                      <TableCell>
                        {c.origin ? <Badge variant="outline">{ORIGIN_LABEL[c.origin]}</Badge> : "—"}
                      </TableCell>
                      <TableCell><Badge className={STATUS_BADGE[c.status]}>{STATUS_LABEL[c.status]}</Badge></TableCell>
                      <TableCell className="text-sm">{CATEGORY_LABEL[c.category]}</TableCell>
                      <TableCell className="text-sm">
                        <span className="font-semibold">{serviceCounts[c.id] ?? 0}</span>
                        <span className="ml-1 text-xs text-muted-foreground">vinculados</span>
                      </TableCell>
                      <TableCell className={cn("text-sm", followupColorClass(c.next_followup))}>
                        {c.next_followup ? format(new Date(c.next_followup), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openView(c)} aria-label="Ver">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(c)} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => setConfirmDel(c)}
                            disabled={!isManager}
                            className="text-destructive hover:text-destructive"
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Nenhum cliente encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between border-t border-border p-4 text-sm">
              <span className="text-muted-foreground">
                {filtered.length} cliente{filtered.length !== 1 && "s"}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                <span>Página {page} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ClientFormDialog
        open={openForm} onOpenChange={setOpenForm}
        client={editing} onSaved={load}
      />

      <ClientDetailsDialog
        open={openDetails} onOpenChange={setOpenDetails}
        client={viewing}
        onEdit={(c) => { setOpenDetails(false); setEditing(c); setOpenForm(true); }}
        onChanged={load}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente <strong>{confirmDel?.name}</strong>. Os serviços
              vinculados <strong>NÃO serão apagados</strong> — apenas ficarão sem cliente associado.
              Tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir cliente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
