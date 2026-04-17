import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TableRowsSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { notify, humanizeBackendError } from "@/lib/notify";

type AuditAction = "create" | "update" | "delete" | "login" | "logout";

interface AuditRow {
  id: string;
  created_at: string;
  user_email: string | null;
  action: AuditAction;
  resource_type: string;
  resource_id: string | null;
  payload: unknown;
  ip_address: string | null;
}

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "Criar",
  update: "Atualizar",
  delete: "Excluir",
  login: "Login",
  logout: "Logout",
};

const ACTION_VARIANT: Record<AuditAction, string> = {
  create: "bg-success/15 text-success border border-success/30",
  update: "bg-info/15 text-info border border-info/30",
  delete: "bg-destructive/15 text-destructive border border-destructive/30",
  login: "bg-muted text-muted-foreground border border-border",
  logout: "bg-muted text-muted-foreground border border-border",
};

export function AuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<AuditAction | "all">("all");
  const [resourceFilter, setResourceFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select("id, created_at, user_email, action, resource_type, resource_id, payload, ip_address")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      notify.error(humanizeBackendError(error.message), { retry: load });
      setLoading(false);
      return;
    }
    setRows((data ?? []) as AuditRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resources = useMemo(
    () => Array.from(new Set(rows.map((r) => r.resource_type))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (resourceFilter !== "all" && r.resource_type !== resourceFilter) return false;
      if (!term) return true;
      return (
        (r.user_email ?? "").toLowerCase().includes(term) ||
        r.resource_type.toLowerCase().includes(term) ||
        (r.resource_id ?? "").toLowerCase().includes(term)
      );
    });
  }, [rows, search, actionFilter, resourceFilter]);

  return (
    <Card className="rounded-2xl p-6 shadow-soft">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="section-title">Log de Auditoria</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Últimos 200 eventos registrados automaticamente.
          </p>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Input
          placeholder="Buscar por usuário, recurso ou ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v as AuditAction | "all")}>
          <SelectTrigger><SelectValue placeholder="Ação" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            <SelectItem value="create">Criar</SelectItem>
            <SelectItem value="update">Atualizar</SelectItem>
            <SelectItem value="delete">Excluir</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="logout">Logout</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger><SelectValue placeholder="Recurso" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os recursos</SelectItem>
            {resources.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRowsSkeleton rows={6} cols={6} />
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10">
                  <EmptyState
                    icon={ScrollText}
                    title="Sem registros"
                    description="Nenhum evento corresponde aos filtros aplicados."
                  />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {format(new Date(r.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm">{r.user_email ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={ACTION_VARIANT[r.action]}>{ACTION_LABEL[r.action]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{r.resource_type}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.resource_id ? r.resource_id.slice(0, 8) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.ip_address ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
