import { useState } from "react";
import { ExternalLink, Plus, Pencil, Trash2, RefreshCw, Info, Upload, Zap, Loader2, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  INTERNET_CERT_DEFAULTS, INTERNET_STATUS_LABEL, computeValidity,
  type ServiceParty, type InternetCertificate, type InternetCertificateType,
} from "@/lib/serviceDocs";
import { InternetCertDialog } from "./InternetCertDialog";
import { AttachInternetCertDialog } from "./AttachInternetCertDialog";
import { AttachedFileBadge } from "@/components/files/AttachedFileBadge";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { deleteDriveFile } from "@/lib/driveFiles";
import { notify } from "@/lib/notify";
import { requestSingleCertificate, type InfosimplesConsultationType } from "@/lib/infosimples";
import { usePermissions } from "@/hooks/usePermissions";

const CERT_TYPE_TO_CONSULTATION: Partial<Record<InternetCertificateType, InfosimplesConsultationType>> = {
  trf6_fisico: "trf6_certidao",
  trf6_eproc: "trf6_certidao",
  tst: "tst_cndt",
  trt3: "trt3_ceat",
  receita_federal: "receita_federal_pgfn",
};

interface Props {
  serviceId: string;
  parties: ServiceParty[];
  internetCerts: InternetCertificate[];
  onChanged: () => void;
}

export function InternetCertsSection({ serviceId, parties, internetCerts, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<InternetCertificate | null>(null);
  const [defaultType, setDefaultType] = useState<InternetCertificateType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [attachOpen, setAttachOpen] = useState(false);
  const [attachCert, setAttachCert] = useState<InternetCertificate | null>(null);

  const [previewFor, setPreviewFor] = useState<InternetCertificate | null>(null);
  const [removeFileFor, setRemoveFileFor] = useState<InternetCertificate | null>(null);

  const vendors = parties.filter((p) => p.role === "vendedor" || p.role === "socio_vendedor");

  const customCerts = internetCerts.filter(
    (c) => c.certificate_type === "outra"
      || (!INTERNET_CERT_DEFAULTS.some((d) => d.type === c.certificate_type))
  );

  const openNew = (t: InternetCertificateType | null) => {
    setEditing(null); setDefaultType(t); setDialogOpen(true);
  };
  const openEdit = (cert: InternetCertificate) => {
    setEditing(cert); setDefaultType(null); setDialogOpen(true);
  };
  const onRenew = async (cert: InternetCertificate) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("service_internet_certificates").insert({
      service_id: cert.service_id,
      party_id: cert.party_id,
      certificate_type: cert.certificate_type,
      custom_name: cert.custom_name,
      comarca: cert.comarca,
      state: cert.state,
      request_date: today,
      status: "solicitada",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Renovação criada.");
    onChanged();
  };
  const onDelete = async () => {
    if (!deleteId) return;
    const cert = internetCerts.find((c) => c.id === deleteId);
    // Best-effort: remove file from Drive too
    if (cert?.drive_file_id) {
      try { await deleteDriveFile(cert.drive_file_id); } catch { /* ignore */ }
    }
    const { error } = await supabase.from("service_internet_certificates").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Certidão removida.");
    setDeleteId(null);
    onChanged();
  };

  // Open the attach dialog. If the cert row doesn't exist yet (default type clicked
  // for the first time), create a stub row so we have an id to attach to.
  const openAttach = async (typeOrCert: InternetCertificateType | InternetCertificate) => {
    if (typeof typeOrCert !== "string") {
      setAttachCert(typeOrCert);
      setAttachOpen(true);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("service_internet_certificates")
      .insert({
        service_id: serviceId,
        certificate_type: typeOrCert,
        request_date: today,
        status: "pendente",
      })
      .select()
      .single();
    if (error || !data) {
      notify.error("Não foi possível criar registro da certidão", { description: error?.message });
      return;
    }
    onChanged();
    setAttachCert(data as InternetCertificate);
    setAttachOpen(true);
  };

  const removeFile = async () => {
    if (!removeFileFor?.drive_file_id) { setRemoveFileFor(null); return; }
    try { await deleteDriveFile(removeFileFor.drive_file_id); } catch { /* ignore */ }
    const { error } = await supabase
      .from("service_internet_certificates")
      .update({
        drive_file_id: null,
        file_name: null,
        file_size: null,
        file_uploaded_at: null,
      })
      .eq("id", removeFileFor.id);
    if (error) {
      notify.error("Erro ao remover arquivo", { description: error.message });
      return;
    }
    notify.success("Arquivo removido da certidão.");
    setRemoveFileFor(null);
    onChanged();
  };

  return (
    <section id="section-certidoes_internet" className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Certidões de Internet</h4>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>Certidões em nome da parte VENDEDORA. Todas possuem validade de 30 dias corridos a partir do pedido.</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {INTERNET_CERT_DEFAULTS.map((cfg) => {
          const cert = internetCerts.find((c) => c.certificate_type === cfg.type);
          return (
            <InternetCertCard
              key={cfg.type}
              cfg={cfg}
              cert={cert}
              onCreate={() => openNew(cfg.type)}
              onEdit={() => cert && openEdit(cert)}
              onRenew={() => cert && onRenew(cert)}
              onDelete={() => cert && setDeleteId(cert.id)}
              onAttach={() => openAttach(cert ?? cfg.type)}
              onPreview={() => cert && setPreviewFor(cert)}
              onRemoveFile={() => cert && setRemoveFileFor(cert)}
            />
          );
        })}
      </div>

      {customCerts.length > 0 && (
        <div className="mt-4 space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customizadas</h5>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {customCerts.map((c) => (
              <CustomCertCard
                key={c.id}
                cert={c}
                onEdit={() => openEdit(c)}
                onRenew={() => onRenew(c)}
                onDelete={() => setDeleteId(c.id)}
                onAttach={() => openAttach(c)}
                onPreview={() => setPreviewFor(c)}
                onRemoveFile={() => setRemoveFileFor(c)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={() => openNew("outra")}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar certidão customizada
        </Button>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Use para vendedores que residem em outra comarca/estado (ex: TJSP, TRF3).
        </p>
      </div>

      <InternetCertDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serviceId={serviceId}
        cert={editing}
        defaultType={defaultType}
        vendorParties={vendors}
        onSaved={onChanged}
      />

      {attachCert && (
        <AttachInternetCertDialog
          open={attachOpen}
          onOpenChange={(o) => { setAttachOpen(o); if (!o) setAttachCert(null); }}
          serviceId={serviceId}
          cert={attachCert}
          onSaved={onChanged}
        />
      )}

      <FilePreviewDialog
        open={!!previewFor}
        onOpenChange={(o) => !o && setPreviewFor(null)}
        driveFileId={previewFor?.drive_file_id ?? null}
        fileName={previewFor?.file_name ?? null}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={onDelete}
        title="Remover certidão?"
        description="Esta ação não pode ser desfeita. O arquivo no Drive também será removido."
        confirmText="Remover"
      />

      <ConfirmDialog
        open={!!removeFileFor}
        onOpenChange={(o) => !o && setRemoveFileFor(null)}
        onConfirm={removeFile}
        title="Remover arquivo anexado?"
        description="O arquivo será removido do Google Drive. Os dados da certidão são preservados."
        confirmText="Remover arquivo"
      />
    </section>
  );
}

function InternetCertCard({
  cfg, cert, onCreate, onEdit, onRenew, onDelete, onAttach, onPreview, onRemoveFile,
}: {
  cfg: typeof INTERNET_CERT_DEFAULTS[number];
  cert: InternetCertificate | undefined;
  onCreate: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onDelete: () => void;
  onAttach: () => void;
  onPreview: () => void;
  onRemoveFile: () => void;
}) {
  const v = cert ? computeValidity(cert.expected_validity_date) : null;
  const status = cert?.status ?? "pendente";
  const hasFile = !!cert?.drive_file_id;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <div>
        <p className="text-sm font-semibold">{cfg.label}</p>
        <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[9px]">{INTERNET_STATUS_LABEL[status]}</Badge>
        {v && cert?.expected_validity_date && <Badge className={cn("text-[9px]", v.badgeClass)}>{v.label}</Badge>}
      </div>

      {cert?.expected_validity_date && (
        <p className="text-[11px] text-muted-foreground">
          Validade: {new Date(cert.expected_validity_date).toLocaleDateString("pt-BR")}
        </p>
      )}

      {hasFile && cert ? (
        <AttachedFileBadge
          fileName={cert.file_name ?? "arquivo"}
          fileSize={cert.file_size}
          driveFileId={cert.drive_file_id!}
          onPreview={onPreview}
          onReplace={onAttach}
          onRemove={onRemoveFile}
          compact
        />
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={onAttach}>
          <Upload className="mr-1.5 h-3 w-3" /> Anexar certidão emitida
        </Button>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <Button size="sm" variant="ghost" asChild>
          <a href={cfg.url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1 h-3 w-3" /> Site
          </a>
        </Button>
        {!cert ? (
          <Button size="sm" variant="ghost" onClick={onCreate}>Cadastrar dados</Button>
        ) : (
          <>
            {(v?.level === "expired" || v?.level === "soon") && (
              <Button size="sm" variant="ghost" onClick={onRenew}>
                <RefreshCw className="mr-1 h-3 w-3" /> Renovar
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function CustomCertCard({
  cert, onEdit, onRenew, onDelete, onAttach, onPreview, onRemoveFile,
}: {
  cert: InternetCertificate;
  onEdit: () => void;
  onRenew: () => void;
  onDelete: () => void;
  onAttach: () => void;
  onPreview: () => void;
  onRemoveFile: () => void;
}) {
  const v = computeValidity(cert.expected_validity_date);
  const hasFile = !!cert.drive_file_id;
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-semibold">{cert.custom_name ?? "Certidão customizada"}</p>
      {cert.comarca && <p className="text-[11px] text-muted-foreground">{cert.comarca}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[9px]">{INTERNET_STATUS_LABEL[cert.status]}</Badge>
        {cert.expected_validity_date && <Badge className={cn("text-[9px]", v.badgeClass)}>{v.label}</Badge>}
      </div>

      {hasFile ? (
        <AttachedFileBadge
          fileName={cert.file_name ?? "arquivo"}
          fileSize={cert.file_size}
          driveFileId={cert.drive_file_id!}
          onPreview={onPreview}
          onReplace={onAttach}
          onRemove={onRemoveFile}
          compact
        />
      ) : (
        <Button size="sm" variant="outline" className="w-full" onClick={onAttach}>
          <Upload className="mr-1.5 h-3 w-3" /> Anexar certidão emitida
        </Button>
      )}

      <div className="flex items-center gap-1 pt-1">
        {cert.issuer_url && (
          <Button size="sm" variant="ghost" asChild>
            <a href={cert.issuer_url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-3 w-3" /> Site
            </a>
          </Button>
        )}
        {(v.level === "expired" || v.level === "soon") && (
          <Button size="sm" variant="ghost" onClick={onRenew}>
            <RefreshCw className="mr-1 h-3 w-3" /> Renovar
          </Button>
        )}
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
