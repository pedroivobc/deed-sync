import { useState } from "react";
import { CheckSquare, Trash2, UserPlus, ArrowRightLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { notify, humanizeBackendError } from "@/lib/notify";
import { STAGE_LABEL, STAGE_ORDER, type ServiceStage } from "@/lib/serviceUi";

interface ProfileRow { id: string; name: string | null; email: string | null }

interface Props {
  selectedIds: string[];
  users: ProfileRow[];
  canDelete: boolean;
  onClear: () => void;
  onChanged: () => void;
}

export function BulkActionBar({ selectedIds, users, canDelete, onClear, onChanged }: Props) {
  const [working, setWorking] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedIds.length === 0) return null;

  const updateStage = async (stage: ServiceStage) => {
    setWorking(true);
    const completed_at = stage === "concluido" ? new Date().toISOString() : null;
    const { error } = await supabase
      .from("services")
      .update({ stage, completed_at })
      .in("id", selectedIds);
    setWorking(false);
    if (error) return notify.error(humanizeBackendError(error));
    notify.success(`${selectedIds.length} serviço(s) movido(s) para ${STAGE_LABEL[stage]}`);
    onChanged();
    onClear();
  };

  const assign = async (userId: string) => {
    setWorking(true);
    const value = userId === "__unassign__" ? null : userId;
    const { error } = await supabase
      .from("services")
      .update({ assigned_to: value })
      .in("id", selectedIds);
    setWorking(false);
    if (error) return notify.error(humanizeBackendError(error));
    notify.success(value ? `Responsável atribuído a ${selectedIds.length} serviço(s)` : `Responsável removido de ${selectedIds.length} serviço(s)`);
    onChanged();
    onClear();
  };

  const handleDelete = async () => {
    setWorking(true);
    const { error } = await supabase.from("services").delete().in("id", selectedIds);
    setWorking(false);
    setConfirmDelete(false);
    if (error) return notify.error(humanizeBackendError(error));
    notify.success(`${selectedIds.length} serviço(s) excluído(s)`);
    onChanged();
    onClear();
  };

  return (
    <>
      <div className="sticky top-[64px] z-20 -mx-6 mb-3 border-b border-border bg-primary/5 px-6 py-2.5 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span>{selectedIds.length} selecionado(s)</span>
          </div>

          <div className="ml-2 flex flex-wrap items-center gap-2">
            <Select onValueChange={(v) => updateStage(v as ServiceStage)} disabled={working}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue placeholder="Alterar etapa" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={assign} disabled={working}>
              <SelectTrigger className="h-8 w-[200px] text-xs">
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                <SelectValue placeholder="Atribuir responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__unassign__">Remover responsável</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name ?? u.email ?? u.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(true)}
                disabled={working}
                className="h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
              </Button>
            )}
          </div>

          <Button
            size="sm"
            variant="ghost"
            className="ml-auto h-8"
            onClick={onClear}
            disabled={working}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Limpar seleção
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Excluir ${selectedIds.length} serviço(s)?`}
        description="Esta ação não pode ser desfeita. Todos os dados relacionados serão removidos."
        confirmText="Sim, excluir tudo"
        loadingText="Excluindo..."
        onConfirm={async () => { await handleDelete(); }}
      />
    </>
  );
}