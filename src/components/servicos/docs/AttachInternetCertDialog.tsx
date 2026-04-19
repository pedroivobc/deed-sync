import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SimpleFileUploader } from "@/components/files/SimpleFileUploader";
import { notify } from "@/lib/notify";
import { deleteDriveFile, type UploadedDriveFile } from "@/lib/driveFiles";
import type { InternetCertificate } from "@/lib/serviceDocs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  cert: InternetCertificate;
  onSaved: () => void;
}

type Outcome = "negativa" | "positiva" | "positiva_efeito_negativa";
const OUTCOME_LABEL: Record<Outcome, string> = {
  negativa: "Negativa",
  positiva: "Positiva",
  positiva_efeito_negativa: "Positiva c/ efeito de negativa",
};

export function AttachInternetCertDialog({ open, onOpenChange, serviceId, cert, onSaved }: Props) {
  const [requestDate, setRequestDate] = useState(cert.request_date ?? new Date().toISOString().slice(0, 10));
  const [issuedDate, setIssuedDate] = useState(cert.issued_date ?? new Date().toISOString().slice(0, 10));
  const [protocol, setProtocol] = useState(cert.protocol_number ?? "");
  const [outcome, setOutcome] = useState<Outcome>("negativa");
  const [notes, setNotes] = useState(cert.notes ?? "");
  const [savingMeta, setSavingMeta] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<UploadedDriveFile | null>(null);

  useEffect(() => {
    if (!open) {
      setPendingUpload(null);
      setSavingMeta(false);
    }
  }, [open]);

  const handleUploaded = async (uploaded: UploadedDriveFile) => {
    setPendingUpload(uploaded);
  };

  const handleSave = async () => {
    if (!pendingUpload) {
      notify.warning("Anexe o arquivo da certidão antes de salvar.");
      return;
    }
    setSavingMeta(true);
    const finalNotes = [
      `[${OUTCOME_LABEL[outcome]}]`,
      notes?.trim() || null,
    ].filter(Boolean).join(" — ");

    const { error } = await supabase
      .from("service_internet_certificates")
      .update({
        request_date: requestDate || null,
        issued_date: issuedDate || null,
        protocol_number: protocol || null,
        notes: finalNotes,
        status: "emitida",
        drive_file_id: pendingUpload.drive_file_id,
        file_name: pendingUpload.file_name,
        file_size: pendingUpload.file_size,
        file_uploaded_at: new Date().toISOString(),
      })
      .eq("id", cert.id);
    setSavingMeta(false);
    if (error) {
      notify.error("Erro ao salvar dados da certidão", { description: error.message });
      // Roll back the upload to avoid orphan files
      try { await deleteDriveFile(pendingUpload.drive_file_id); } catch { /* ignore */ }
      return;
    }
    if (outcome === "positiva") {
      notify.warning("Certidão POSITIVA anexada — verifique pendências.");
    } else {
      notify.success("Certidão anexada com sucesso ao serviço.");
    }
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anexar certidão emitida</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <SimpleFileUploader
            entityType="service"
            entityId={serviceId}
            subfolderType="certidoes_internet"
            relatedEntityType="internet_certificate"
            relatedEntityId={cert.id}
            autoUploadOnSelect
            helperText="Selecione o PDF da certidão emitida no site oficial."
            onUploaded={handleUploaded}
          />

          {pendingUpload && (
            <div className="rounded-md border border-success/30 bg-success/5 p-2 text-xs text-success">
              ✓ Arquivo enviado: {pendingUpload.file_name}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Data do pedido</Label>
              <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data de emissão</Label>
              <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Nº do protocolo (opcional)</Label>
              <Input value={protocol} onChange={(e) => setProtocol(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Marcar como</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => (
                    <SelectItem key={o} value={o}>{OUTCOME_LABEL[o]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            ℹ️ Validade calculada automaticamente: 30 dias a partir da data do pedido.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={savingMeta}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!pendingUpload || savingMeta}>
            {savingMeta ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Salvando…</> : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
