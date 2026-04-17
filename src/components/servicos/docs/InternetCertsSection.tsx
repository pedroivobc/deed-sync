import { useState } from "react";
import { ExternalLink, Plus, Pencil, Trash2, RefreshCw, Info } from "lucide-react";
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
    const { error } = await supabase.from("service_internet_certificates").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Certidão removida.");
    setDeleteId(null);
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

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={onDelete}
        title="Remover certidão?"
        description="Esta ação não pode ser desfeita."
        confirmText="Remover"
      />
    </section>
  );
}

function InternetCertCard({ cfg, cert, onCreate, onEdit, onRenew, onDelete }: {
  cfg: typeof INTERNET_CERT_DEFAULTS[number];
  cert: InternetCertificate | undefined;
  onCreate: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onDelete: () => void;
}) {
  const v = cert ? computeValidity(cert.expected_validity_date) : null;
  const status = cert?.status ?? "pendente";

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

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <Button size="sm" variant="outline" asChild>
          <a href={cfg.url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1 h-3 w-3" /> Acessar site
          </a>
        </Button>
        {!cert ? (
          <Button size="sm" variant="ghost" onClick={onCreate}>Cadastrar</Button>
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

function CustomCertCard({ cert, onEdit, onRenew, onDelete }: {
  cert: InternetCertificate;
  onEdit: () => void;
  onRenew: () => void;
  onDelete: () => void;
}) {
  const v = computeValidity(cert.expected_validity_date);
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <p className="text-sm font-semibold">{cert.custom_name ?? "Certidão customizada"}</p>
      {cert.comarca && <p className="text-[11px] text-muted-foreground">{cert.comarca}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline" className="text-[9px]">{INTERNET_STATUS_LABEL[cert.status]}</Badge>
        {cert.expected_validity_date && <Badge className={cn("text-[9px]", v.badgeClass)}>{v.label}</Badge>}
      </div>
      <div className="flex items-center gap-1 pt-1">
        {cert.issuer_url && (
          <Button size="sm" variant="outline" asChild>
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
