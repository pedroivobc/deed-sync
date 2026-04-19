import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { SimpleFileUploader } from "@/components/files/SimpleFileUploader";
import { notify } from "@/lib/notify";
import { deleteDriveFile, type UploadedDriveFile } from "@/lib/driveFiles";
import type { PropertyRegistration } from "@/lib/serviceDocs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  registration: PropertyRegistration;
  onSaved: () => void;
}

export function AttachPropertyRegistrationDialog({
  open, onOpenChange, serviceId, registration, onSaved,
}: Props) {
  const [notes, setNotes] = useState(registration.notes ?? "");
  const [pendingUpload, setPendingUpload] = useState<UploadedDriveFile | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setPendingUpload(null);
      setSaving(false);
    }
  }, [open]);

  const handleSave = async () => {
    if (!pendingUpload) {
      notify.warning("Anexe o arquivo antes de salvar.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("service_property_registration")
      .update({
        notes: notes || null,
        status: "liberada",
        is_released: true,
        drive_file_id: pendingUpload.drive_file_id,
        file_name: pendingUpload.file_name,
        file_size: pendingUpload.file_size,
        file_uploaded_at: new Date().toISOString(),
      })
      .eq("id", registration.id);
    setSaving(false);
    if (error) {
      notify.error("Erro ao salvar matrícula", { description: error.message });
      try { await deleteDriveFile(pendingUpload.drive_file_id); } catch { /* ignore */ }
      return;
    }
    notify.success("Matrícula anexada com sucesso.");
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anexar matrícula emitida</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <SimpleFileUploader
            entityType="service"
            entityId={serviceId}
            subfolderType="docs_imovel"
            relatedEntityType="property_registration"
            relatedEntityId={registration.id}
            autoUploadOnSelect
            helperText="Os dados já preenchidos no formulário permanecem inalterados."
            onUploaded={(u) => setPendingUpload(u)}
          />

          {pendingUpload && (
            <div className="rounded-md border border-success/30 bg-success/5 p-2 text-xs text-success">
              ✓ Arquivo enviado: {pendingUpload.file_name}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!pendingUpload || saving}>
            {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando…</> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
