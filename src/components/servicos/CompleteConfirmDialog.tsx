import { useState } from "react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { docs_delivered: boolean; final_notes: string }) => void;
}

export function CompleteConfirmDialog({ open, onOpenChange, onConfirm }: Props) {
  const [docs, setDocs] = useState(false);
  const [notes, setNotes] = useState("");

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
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Observações finais (opcional)
            </label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm({ docs_delivered: docs, final_notes: notes })}>
            Confirmar conclusão
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
