import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TableRowsSkeleton } from "@/components/ui/skeletons";
import { IconAction } from "@/components/ui/icon-action";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { notify, humanizeBackendError } from "@/lib/notify";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  role: AppRole | null;
}

const roleLabel: Record<AppRole, string> = {
  administrador: "Administrador",
  gerente: "Gerente",
  colaborador: "Colaborador",
};

function RoleBadge({ role }: { role: AppRole | null }) {
  if (!role) return <Badge variant="outline">—</Badge>;
  const cls =
    role === "administrador"
      ? "bg-yellow-100 text-yellow-900 hover:bg-yellow-100 dark:bg-yellow-500/20 dark:text-yellow-200"
      : role === "gerente"
      ? "bg-blue-100 text-blue-900 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-200"
      : "bg-muted text-muted-foreground hover:bg-muted";
  return <Badge className={cls}>{roleLabel[role]}</Badge>;
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{0,2})(\d{0,4})(\d{0,4}).*/, (_, a, b, c) =>
      [a && `(${a}`, a && a.length === 2 ? ") " : "", b, c && `-${c}`].filter(Boolean).join("")
    );
  return d.replace(/(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
}

export function UserManagement() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("colaborador");

  // delete state
  const [confirmDelete, setConfirmDelete] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      supabase.from("profiles").select("id, name, email, phone, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr || rErr) {
      toast.error(pErr?.message ?? rErr?.message ?? "Erro ao carregar");
      setLoading(false);
      return;
    }
    const roleMap = new Map<string, AppRole>();
    (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role as AppRole));
    setRows((profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? null })));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName(""); setEmail(""); setPhone(""); setPassword(""); setRole("colaborador");
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setName(u.name ?? ""); setEmail(u.email ?? ""); setPhone(u.phone ?? "");
    setPassword(""); setRole(u.role ?? "colaborador");
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome é obrigatório.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("E-mail inválido.");
    if (!editing && password.length < 6) return toast.error("Senha mínima de 6 caracteres.");
    if (editing && password && password.length < 6) return toast.error("Senha mínima de 6 caracteres.");

    setSubmitting(true);
    const payload = editing
      ? { action: "update", user_id: editing.id, name, email, phone, role, ...(password ? { password } : {}) }
      : { action: "create", name, email, phone, password, role };

    const { data, error } = await supabase.functions.invoke("manage-users", { body: payload });
    setSubmitting(false);

    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Falha");
      return;
    }
    toast.success(editing ? "Usuário atualizado." : "Usuário criado.");
    setDialogOpen(false);
    load();
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("manage-users", {
      body: { action: "delete", user_id: confirmDelete.id },
    });
    setDeleting(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Falha");
      return;
    }
    toast.success("Usuário excluído.");
    setConfirmDelete(null);
    load();
  };

  const sorted = useMemo(() => rows, [rows]);

  return (
    <Card className="rounded-2xl p-6 shadow-soft">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="section-title">Usuários do sistema</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie acessos, perfis e credenciais.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
            ) : sorted.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum usuário.</TableCell></TableRow>
            ) : (
              sorted.map((u) => {
                const isMe = u.id === me?.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name ?? "—"} {isMe && <span className="ml-1 text-xs text-muted-foreground">(você)</span>}</TableCell>
                    <TableCell>{u.email ?? "—"}</TableCell>
                    <TableCell>{u.phone ?? "—"}</TableCell>
                    <TableCell><RoleBadge role={u.role} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(u.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => setConfirmDelete(u)}
                          disabled={isMe}
                          aria-label="Excluir"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do usuário." : "Preencha os dados para criar um novo usuário."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="u-name">Nome completo *</Label>
              <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u-email">E-mail *</Label>
                <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-phone">Telefone</Label>
                <Input id="u-phone" value={phone} onChange={(e) => setPhone(maskPhone(e.target.value))} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="u-pw">{editing ? "Nova senha (opcional)" : "Senha inicial *"}</Label>
                <Input
                  id="u-pw" type="password" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? "Deixe em branco para manter" : "mínimo 6 caracteres"}
                  required={!editing}
                  minLength={editing && !password ? undefined : 6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-role">Perfil *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                  <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Salvando..." : editing ? "Salvar alterações" : "Criar usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação removerá permanentemente <strong>{confirmDelete?.name ?? confirmDelete?.email}</strong>{" "}
              do sistema, incluindo acesso, perfil e papéis. Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); doDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
