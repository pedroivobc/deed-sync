import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { formatBRL } from "@/lib/money";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    docs_delivered: boolean;
    final_notes: string;
    create_revenue: boolean;
  }) => void;
  /** Valor declarado da escritura (se houver) — habilita oferta de criação de receita */
  suggestedRevenue?: number | null;
}

export function CompleteConfirmDialog({ open, onOpenChange, onConfirm, suggestedRevenue }: Props) {
  const [docs, setDocs] = useState(false);
  const [notes, setNotes] = useState("");
  const [createRevenue, setCreateRevenue] = useState(true);

  useEffect(() => {
    if (open) {
      setDocs(false);
      setNotes("");
      setCreateRevenue(true);
    }
  }, [open]);

  const hasSuggestion = !!suggestedRevenue && suggestedRevenue > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirma a conclusão do serviço?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação marcará o serviço como concluído e registrará a data de conclusão.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-background p-3 text-sm">
            <Checkbox checked={docs} onCheckedChange={(v) => setDocs(!!v)} />
            <span>Todos os documentos foram entregues ao cliente?</span>
          </label>

          {hasSuggestion && (
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
              <Checkbox checked={createRevenue} onCheckedChange={(v) => setCreateRevenue(!!v)} />
              <span>
                Criar lançamento de <strong>receita</strong> de{" "}
                <strong>{formatBRL(suggestedRevenue!)}</strong> vinculado a este serviço?
              </span>
            </label>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Observações finais (opcional)
            </label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              onConfirm({ docs_delivered: docs, final_notes: notes, create_revenue: createRevenue && hasSuggestion })
            }
          >
            Confirmar conclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
