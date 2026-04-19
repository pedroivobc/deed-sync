import { useState } from "react";
import { ExternalLink, Pencil, FileText, Coins, AlertTriangle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { FieldLabel } from "../FormSection";
import {
  ITBI_STATUS_LABEL, PROP_REG_TYPE_LABEL, PROP_REG_STATUS_LABEL,
  computeValidity,
  type PropertyItbi, type PropertyRegistration,
} from "@/lib/serviceDocs";
import type { EscrituraFields } from "@/lib/serviceFields";
import { ItbiDialog } from "./ItbiDialog";
import { PropertyRegistrationDialog } from "./PropertyRegistrationDialog";
import { AttachPropertyRegistrationDialog } from "./AttachPropertyRegistrationDialog";
import { AttachedFileBadge } from "@/components/files/AttachedFileBadge";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { deleteDriveFile } from "@/lib/driveFiles";
import { notify } from "@/lib/notify";

interface Props {
  serviceId: string;
  itbi: PropertyItbi | null;
  registration: PropertyRegistration | null;
  imovel: EscrituraFields["imovel"];
  onImovelChange: (v: Partial<EscrituraFields["imovel"]>) => void;
  onChanged: () => void;
}

export function PropertyDocsSection({
  serviceId, itbi, registration, imovel, onImovelChange, onChanged,
}: Props) {
  const [itbiOpen, setItbiOpen] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [attachRegOpen, setAttachRegOpen] = useState(false);
  const [previewReg, setPreviewReg] = useState(false);
  const [confirmRemoveFile, setConfirmRemoveFile] = useState(false);

  const regValidity = computeValidity(registration?.expiration_date);
  const hasFile = !!registration?.drive_file_id;

  const openAttach = async () => {
    if (registration) { setAttachRegOpen(true); return; }
    // Create a stub registration row so we have an id to attach to
    const { data, error } = await supabase
      .from("service_property_registration")
      .insert({ service_id: serviceId, registration_type: "inteiro_teor", status: "pendente" })
      .select()
      .single();
    if (error || !data) {
      notify.error("Não foi possível criar registro da matrícula", { description: error?.message });
      return;
    }
    onChanged();
    // Open the dialog after the parent reloads (next tick)
    setTimeout(() => setAttachRegOpen(true), 50);
  };

  const removeFile = async () => {
    if (!registration?.drive_file_id) { setConfirmRemoveFile(false); return; }
    try { await deleteDriveFile(registration.drive_file_id); } catch { /* ignore */ }
    const { error } = await supabase
      .from("service_property_registration")
      .update({ drive_file_id: null, file_name: null, file_size: null, file_uploaded_at: null })
      .eq("id", registration.id);
    if (error) {
      notify.error("Erro ao remover arquivo", { description: error.message });
      return;
    }
    notify.success("Arquivo removido da matrícula.");
    setConfirmRemoveFile(false);
    onChanged();
  };

  return (
    <section id="section-imovel" className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Documentação do Imóvel</h4>
      </div>

      {/* A) Dados básicos do imóvel */}
      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <div>
          <FieldLabel>Inscrição de IPTU</FieldLabel>
          <Input value={imovel.inscricao_iptu ?? ""}
            onChange={(e) => onImovelChange({ inscricao_iptu: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Matrícula (cartório/ofício)</FieldLabel>
          <Input value={imovel.matricula ?? ""}
            onChange={(e) => onImovelChange({ matricula: e.target.value })} />
        </div>
        <div>
          <FieldLabel>Nº da matrícula</FieldLabel>
          <Input value={imovel.numero_matricula ?? ""}
            onChange={(e) => onImovelChange({ numero_matricula: e.target.value })} />
        </div>
        <div className="md:col-span-3">
          <FieldLabel>Endereço completo do imóvel</FieldLabel>
          <Textarea rows={2} value={imovel.endereco ?? ""}
            onChange={(e) => onImovelChange({ endereco: e.target.value })} />
        </div>
      </div>

      {/* B) ITBI */}
      <div className="mb-4 rounded-lg border-2 border-border bg-background p-4">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-accent" />
            <h5 className="font-display text-sm">Guia de ITBI</h5>
          </div>
          <Button size="sm" variant="outline" onClick={() => setItbiOpen(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> {itbi ? "Editar" : "Cadastrar"}
          </Button>
        </div>

        {itbi ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{ITBI_STATUS_LABEL[itbi.status]}</Badge>
              {itbi.is_issued && <Badge className="bg-success/15 text-success text-[10px]">Guia emitida</Badge>}
            </div>
            {itbi.prefecture_url && (
              <Button size="sm" variant="link" asChild className="h-auto p-0">
                <a href={itbi.prefecture_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" /> Acessar prefeitura
                </a>
              </Button>
            )}
            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {itbi.protocol_number && <span>Protocolo: {itbi.protocol_number}</span>}
              {itbi.protocol_date && <span>Data: {new Date(itbi.protocol_date).toLocaleDateString("pt-BR")}</span>}
              {itbi.itbi_value && <span>Valor: R$ {Number(itbi.itbi_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>}
              {itbi.payment_date && <span>Pago: {new Date(itbi.payment_date).toLocaleDateString("pt-BR")}</span>}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma guia de ITBI cadastrada.</p>
        )}
      </div>

      {/* C) Matrícula */}
      <div className="rounded-lg border-2 border-border bg-background p-4">
        {registration && (regValidity.level === "expired" || regValidity.level === "soon") && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              {regValidity.isExpired
                ? "A matrícula está vencida. Requisite uma nova antes da lavratura."
                : `A matrícula vence em ${regValidity.daysRemaining} dias. Considere requisitar uma nova.`}
            </span>
          </div>
        )}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            <h5 className="font-display text-sm">Matrícula do Imóvel</h5>
          </div>
          <Button size="sm" variant="outline" onClick={() => setRegOpen(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> {registration ? "Editar" : "Cadastrar"}
          </Button>
        </div>

        {registration ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="text-[10px]">{PROP_REG_TYPE_LABEL[registration.registration_type]}</Badge>
              <Badge variant="outline" className="text-[10px]">{PROP_REG_STATUS_LABEL[registration.status]}</Badge>
              {registration.is_released && <Badge className="bg-success/15 text-success text-[10px]">Liberada</Badge>}
              {registration.expiration_date && (
                <Badge className={cn("text-[10px]", regValidity.badgeClass)}>{regValidity.label}</Badge>
              )}
            </div>
            <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {registration.request_date && <span>Requisitada: {new Date(registration.request_date).toLocaleDateString("pt-BR")}</span>}
              {registration.issued_date && <span>Emitida: {new Date(registration.issued_date).toLocaleDateString("pt-BR")}</span>}
              {registration.onr_protocol && <span>Protocolo ONR: {registration.onr_protocol}</span>}
              {registration.amount_paid != null && (
                <span>Pago: R$ {Number(registration.amount_paid).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              )}
              {registration.expiration_date && (
                <span>Validade: {new Date(registration.expiration_date).toLocaleDateString("pt-BR")}</span>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma matrícula cadastrada.</p>
        )}
      </div>

      <ItbiDialog
        open={itbiOpen}
        onOpenChange={setItbiOpen}
        serviceId={serviceId}
        itbi={itbi}
        onSaved={onChanged}
      />
      <PropertyRegistrationDialog
        open={regOpen}
        onOpenChange={setRegOpen}
        serviceId={serviceId}
        registration={registration}
        onSaved={onChanged}
      />
    </section>
  );
}
