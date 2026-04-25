import { useState } from "react";
import {
  ExternalLink, Plus, Pencil, Trash2, RefreshCw, Info, Upload,
  CheckCircle2, Clock, AlertTriangle, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import {
  INTERNET_CERT_DEFAULTS, INTERNET_STATUS_LABEL, computeValidity,
  type ServiceParty, type InternetCertificate, type InternetCertificateType,
  type ValidityInfo,
} from "@/lib/serviceDocs";
import { InternetCertDialog } from "./InternetCertDialog";
import { AttachInternetCertDialog } from "./AttachInternetCertDialog";
import { AttachedFileBadge } from "@/components/files/AttachedFileBadge";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { deleteDriveFile } from "@/lib/driveFiles";
import { notify } from "@/lib/notify";
import { usePermissions } from "@/hooks/usePermissions";

interface Props {
  serviceId: string;
  parties: ServiceParty[];
  internetCerts: InternetCertificate[];
  onChanged: () => void;
}

export function InternetCertsSection({ serviceId, parties, internetCerts, onChanged }: Props) {
  usePermissions();
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
      {(() => {
        const rows = [
          ...INTERNET_CERT_DEFAULTS.map((cfg) => ({
            key: cfg.type as string,
            name: cfg.label,
            description: cfg.description,
            url: cfg.url,
            cert: internetCerts.find((c) => c.certificate_type === cfg.type),
            isCustom: false,
            cfgType: cfg.type as InternetCertificateType,
          })),
          ...customCerts.map((c) => ({
            key: c.id,
            name: c.custom_name ?? "Certidão customizada",
            description: c.comarca ?? "Customizada",
            url: c.issuer_url ?? null,
            cert: c,
            isCustom: true,
            cfgType: "outra" as InternetCertificateType,
          })),
        ];
        const totalIssued = rows.filter((r) => r.cert?.status === "emitida").length;
        const totalSlots = rows.length;

        return (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Certidões de Internet</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalIssued}</span> de{" "}
                  <span className="font-semibold text-foreground">{totalSlots}</span> certidões emitidas
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => openNew("outra")}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar customizada
              </Button>
            </div>

            <div className="mb-3 flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Certidões em nome da parte VENDEDORA. Todas possuem validade de 30 dias corridos a partir do pedido.</span>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <ul className="divide-y divide-border">
                {rows.map((r) => (
                  <CertRow
                    key={r.key}
                    name={r.name}
                    description={r.description}
                    url={r.url}
                    cert={r.cert}
                    isCustom={r.isCustom}
                    onCreate={() => openNew(r.cfgType)}
                    onEdit={() => r.cert && openEdit(r.cert)}
                    onRenew={() => r.cert && onRenew(r.cert)}
                    onDelete={() => r.cert && setDeleteId(r.cert.id)}
                    onAttach={() => openAttach(r.cert ?? r.cfgType)}
                    onPreview={() => r.cert && setPreviewFor(r.cert)}
                    onRemoveFile={() => r.cert && setRemoveFileFor(r.cert)}
                  />
                ))}
              </ul>
            </div>

            <p className="mt-2 text-[11px] text-muted-foreground">
              Use "Adicionar customizada" para vendedores em outra comarca/estado (ex: TJSP, TRF3).
            </p>
          </>
        );
      })()}

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

/**
 * Visual classification used for the row's icon, status badge and primary action.
 * Combines DB status with computed validity (expired / expiring soon).
 */
type RowVariant = "issued" | "expiring" | "expired" | "pending" | "requested";

function classifyRow(cert: InternetCertificate | undefined, v: ValidityInfo | null): RowVariant {
  if (!cert) return "pending";
  if (cert.status === "vencida" || v?.level === "expired") return "expired";
  if (cert.status === "emitida") {
    if (v?.level === "soon" || v?.level === "warn") return "expiring";
    return "issued";
  }
  if (cert.status === "solicitada") return "requested";
  return "pending";
}

const VARIANT_META: Record<RowVariant, {
  Icon: typeof CheckCircle2;
  iconWrap: string;
  badge: string;
  label: string;
}> = {
  issued: {
    Icon: CheckCircle2,
    iconWrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    label: "Emitida",
  },
  expiring: {
    Icon: AlertTriangle,
    iconWrap: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30",
    label: "Vencendo",
  },
  expired: {
    Icon: AlertTriangle,
    iconWrap: "bg-destructive/10 text-destructive",
    badge: "bg-destructive/15 text-destructive border border-destructive/30",
    label: "Vencida",
  },
  requested: {
    Icon: Clock,
    iconWrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    label: "Solicitada",
  },
  pending: {
    Icon: Clock,
    iconWrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30",
    label: "Pendente",
  },
};

function CertRow({
  name, description, url, cert, isCustom,
  onCreate, onEdit, onRenew, onDelete, onAttach, onPreview, onRemoveFile,
}: {
  name: string;
  description: string;
  url: string | null;
  cert: InternetCertificate | undefined;
  isCustom: boolean;
  onCreate: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onDelete: () => void;
  onAttach: () => void;
  onPreview: () => void;
  onRemoveFile: () => void;
}) {
  const v = cert ? computeValidity(cert.expected_validity_date) : null;
  const variant = classifyRow(cert, v);
  const meta = VARIANT_META[variant];
  const { Icon } = meta;
  const hasFile = !!cert?.drive_file_id;

  // Primary contextual action (right side)
  let primaryAction: React.ReactNode = null;
  if (variant === "issued" && hasFile) {
    primaryAction = (
      <Button size="sm" variant="outline" onClick={onPreview}>
        <FileText className="mr-1.5 h-3.5 w-3.5" /> Abrir
      </Button>
    );
  } else if (variant === "issued" && !hasFile) {
    primaryAction = (
      <Button size="sm" variant="outline" onClick={onAttach}>
        <Upload className="mr-1.5 h-3.5 w-3.5" /> Anexar
      </Button>
    );
  } else if (variant === "expired" || variant === "expiring") {
    primaryAction = (
      <Button size="sm" variant="outline" onClick={onRenew}>
        <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Atualizar
      </Button>
    );
  } else if (variant === "requested") {
    primaryAction = (
      <Button size="sm" variant="outline" onClick={onAttach}>
        <Upload className="mr-1.5 h-3.5 w-3.5" /> Anexar emitida
      </Button>
    );
  } else {
    // pending / no record yet
    primaryAction = url ? (
      <Button size="sm" variant="default" asChild>
        <a href={url} target="_blank" rel="noreferrer">
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Emitir
        </a>
      </Button>
    ) : (
      <Button size="sm" variant="default" onClick={onCreate}>
        Cadastrar
      </Button>
    );
  }

  // Secondary info line (validity / file)
  const validityLine = cert?.expected_validity_date
    ? `Validade ${new Date(cert.expected_validity_date).toLocaleDateString("pt-BR")}${
        v && v.level !== "none" ? ` · ${v.label}` : ""
      }`
    : description;

  return (
    <li className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", meta.iconWrap)}>
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          {hasFile && (
            <span title="Arquivo anexado" className="text-muted-foreground">
              <FileText className="h-3 w-3" />
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{validityLine}</p>
      </div>

      <Badge className={cn("hidden shrink-0 text-[10px] font-medium sm:inline-flex", meta.badge)} variant="outline">
        {meta.label}
      </Badge>

      <div className="flex shrink-0 items-center gap-1">
        {primaryAction}

        {/* Secondary actions: only when a record exists */}
        {cert && (
          <>
            {hasFile && variant === "issued" && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onRemoveFile}
                title="Remover arquivo"
              >
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} title="Editar">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
              title="Remover"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}

        {!cert && url && (
          <Button size="icon" variant="ghost" className="h-8 w-8" asChild title="Cadastrar dados">
            <button type="button" onClick={onCreate}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </Button>
        )}
      </div>
    </li>
  );
}
