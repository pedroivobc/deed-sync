import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useServiceStages, STAGE_CATEGORY_LABEL, type ServiceStageRow, type StageCategory } from "@/hooks/useServiceStages";
import { DynamicStageBadge } from "@/components/servicos/DynamicStageBadge";
import { SERVICE_TYPE_LABEL, type ServiceType } from "@/lib/serviceUi";

type EditableStage = Partial<ServiceStageRow> & { name: string; color: string; category: StageCategory; display_order: number; is_active: boolean };

const TIPO_OPTIONS: Array<{ value: ServiceType; locked: boolean }> = [
  { value: "escritura", locked: false },
  { value: "avulso", locked: true },
  { value: "regularizacao", locked: true },
];

const PRESET_COLORS = [
  "#64748b", "#0ea5e9", "#f59e0b", "#a855f7", "#6366f1",
  "#ec4899", "#14b8a6", "#2563eb", "#16a34a", "#ef4444",
];

export function ServiceStagesPanel() {
  const { roles } = useAuth();
  const canEdit = roles.some((r) => r === "administrador" || r === "gerente");

  const [tipo, setTipo] = useState<ServiceType>("escritura");
  const { stages, loading } = useServiceStages(tipo, /* includeInactive */ true);

  const [editing, setEditing] = useState<EditableStage | null>(null);
  const [toDelete, setToDelete] = useState<ServiceStageRow | null>(null);

  const grouped = useMemo(() => {
    const g: Record<StageCategory, ServiceStageRow[]> = { active: [], done: [], closed: [] };
    for (const s of stages) g[s.category].push(s);
    return g;
  }, [stages]);

  const handleNew = () => {
    const nextOrder = (stages[stages.length - 1]?.display_order ?? 0) + 10;
    setEditing({
      tipo_servico: tipo,
      name: "",
      description: "",
      color: "#0ea5e9",
      category: "active",
      display_order: nextOrder,
      is_active: true,
    });
  };

  const handleEdit = (s: ServiceStageRow) => setEditing({ ...s });

  const handleSave = async () => {
    if (!editing || !editing.name.trim()) {
      toast.error("Informe o nome da etapa.");
      return;
    }
    const payload = {
      tipo_servico: tipo,
      name: editing.name.trim(),
      description: editing.description?.trim() || null,
      color: editing.color,
      category: editing.category,
      display_order: editing.display_order,
      is_active: editing.is_active,
    };
    // Cast: `service_stages` was added by a recent migration and isn't in the
    // generated types yet. We narrow inputs locally to keep the rest type-safe.
    type AnyTable = ReturnType<typeof supabase.from> & {
      insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
      update: (v: unknown) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> };
    };
    const table = (supabase.from as unknown as (n: string) => AnyTable)("service_stages");
    const result = editing.id
      ? await table.update(payload).eq("id", editing.id)
      : await table.insert(payload);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(editing.id ? "Etapa atualizada." : "Etapa criada.");
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    type DelTable = { delete: () => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> } };
    const tbl = (supabase.from as unknown as (n: string) => DelTable)("service_stages");
    const { error } = await tbl.delete().eq("id", toDelete.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Etapa removida.");
    setToDelete(null);
  };

  return (
    <Card className="rounded-2xl p-6 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="section-title">Etapas dos serviços</h3>
          <p className="text-sm text-muted-foreground">
            Configure as etapas dinâmicas usadas no funil de Escrituras.
          </p>
        </div>
        {canEdit && tipo === "escritura" && (
          <Button onClick={handleNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> Nova etapa
          </Button>
        )}
      </div>

      <Tabs value={tipo} onValueChange={(v) => setTipo(v as ServiceType)} className="mb-4">
        <TabsList>
          {TIPO_OPTIONS.map((opt) => (
            <TabsTrigger
              key={opt.value}
              value={opt.value}
              disabled={opt.locked}
              className="gap-1.5"
              title={opt.locked ? "Disponível em breve" : undefined}
            >
              {SERVICE_TYPE_LABEL[opt.value]}
              {opt.locked && <Lock className="h-3 w-3" />}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tipo !== "escritura" ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          A configuração de etapas dinâmicas ainda não está habilitada para este tipo de serviço.
        </div>
      ) : loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>
      ) : stages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma etapa cadastrada para Escritura ainda.
        </div>
      ) : (
        <div className="space-y-5">
          {(["active", "done", "closed"] as StageCategory[]).map((cat) =>
            grouped[cat].length === 0 ? null : (
              <div key={cat}>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {STAGE_CATEGORY_LABEL[cat]}
                </h4>
                <ul className="space-y-1.5">
                  {grouped[cat].map((s) => (
                    <li
                      key={s.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2",
                        !s.is_active && "opacity-50",
                      )}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/60" />
                      <DynamicStageBadge name={s.name} color={s.color} />
                      {s.description && (
                        <span className="truncate text-sm text-muted-foreground">{s.description}</span>
                      )}
                      {!s.is_active && <Badge variant="outline" className="text-[10px]">Inativa</Badge>}
                      <span className="ml-auto text-xs text-muted-foreground">#{s.display_order}</span>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setToDelete(s)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>
      )}

      {/* Editor */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar etapa" : "Nova etapa"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Ex: Revisão"
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  rows={2}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={editing.category}
                    onValueChange={(v) => setEditing({ ...editing, category: v as StageCategory })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="done">Concluída</SelectItem>
                      <SelectItem value="closed">Encerrada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editing.display_order}
                    onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditing({ ...editing, color: c })}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition",
                        editing.color === c ? "border-foreground" : "border-transparent",
                      )}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                  <Input
                    type="color"
                    value={editing.color}
                    onChange={(e) => setEditing({ ...editing, color: e.target.value })}
                    className="h-9 w-14 cursor-pointer p-1"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <Label className="cursor-pointer">Etapa ativa</Label>
                  <p className="text-xs text-muted-foreground">Etapas inativas não aparecem em novos serviços.</p>
                </div>
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Remover etapa?"
        description={
          <>Os serviços que estavam nesta etapa <strong>perderão</strong> a referência (ficarão sem etapa dinâmica).</>
        }
        confirmText="Remover"
        loadingText="Removendo..."
        onConfirm={handleDelete}
      />
    </Card>
  );
}