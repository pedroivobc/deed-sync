import { useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, FileText, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  CIVIL_CERT_LABEL, CIVIL_STATUS_LABEL, PARTY_ROLE_LABEL, PARTY_ROLE_BADGE,
  computeValidity,
  type ServiceParty, type CivilCertificate,
} from "@/lib/serviceDocs";
import { CivilCertDialog } from "./CivilCertDialog";

interface Props {
  serviceId: string;
  parties: ServiceParty[];
  civilCerts: CivilCertificate[];
  onChanged: () => void;
}

export function CivilCertsSection({ serviceId, parties, civilCerts, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeParty, setActiveParty] = useState<ServiceParty | null>(null);
  const [editingCert, setEditingCert] = useState<CivilCertificate | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const onAdd = (party: ServiceParty) => {
    setActiveParty(party); setEditingCert(null); setDialogOpen(true);
  };
  const onEdit = (party: ServiceParty, cert: CivilCertificate) => {
    setActiveParty(party); setEditingCert(cert); setDialogOpen(true);
  };
  const onRenew = async (cert: CivilCertificate) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("service_civil_certificates").insert({
      service_id: cert.service_id,
      party_id: cert.party_id,
      certificate_type: cert.certificate_type,
      request_date: today,
      status: "solicitada",
      is_issued: false,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Renovação criada — certidão antiga mantida no histórico.");
    onChanged();
  };
  const onDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("service_civil_certificates").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Certidão removida.");
    setDeleteId(null);
    onChanged();
  };

  return (
    <section id="section-certidoes_pessoais" className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Certidões Pessoais</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Estado Civil (PF, validade 90 dias) e Junta Comercial (PJ, validade 30 dias).
        </p>
      </div>

      {parties.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Cadastre as partes primeiro"
          description="As certidões pessoais são vinculadas a cada pessoa envolvida."
        />
      ) : (
        <div className="space-y-4">
          {parties.map((p) => {
            const partyCerts = civilCerts.filter((c) => c.party_id === p.id);
            return (
              <div key={p.id} className="rounded-lg border border-border bg-background p-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{p.person_type === "PF" ? "👤" : "🏢"}</span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{p.name}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge className={cn("text-[9px] uppercase", PARTY_ROLE_BADGE[p.role])}>
                          {PARTY_ROLE_LABEL[p.role]}
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">{p.person_type}</Badge>
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => onAdd(p)}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar
                  </Button>
                </div>

                {partyCerts.length === 0 ? (
                  <p className="py-2 text-xs text-muted-foreground">Nenhuma certidão cadastrada.</p>
                ) : (
                  <ul className="space-y-2">
                    {partyCerts.map((c) => {
                      const v = computeValidity(c.expiration_date);
                      return (
                        <li key={c.id} className="rounded-md border border-border bg-card p-2.5">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm font-medium">{CIVIL_CERT_LABEL[c.certificate_type]}</span>
                                <Badge variant="outline" className="text-[9px]">{CIVIL_STATUS_LABEL[c.status]}</Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                                {c.request_date && <span>Pedido: {new Date(c.request_date).toLocaleDateString("pt-BR")}</span>}
                                {c.issued_date && <span>Emitida: {new Date(c.issued_date).toLocaleDateString("pt-BR")}</span>}
                                {c.total_paid != null && Number(c.total_paid) > 0 && (
                                  <span>Pago: R$ {Number(c.total_paid).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                )}
                              </div>
                              {c.expiration_date && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    Validade: {new Date(c.expiration_date).toLocaleDateString("pt-BR")}
                                  </span>
                                  <Badge className={v.badgeClass}>{v.label}</Badge>
                                </div>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              {(v.level === "expired" || v.level === "soon") && (
                                <Button size="sm" variant="outline" onClick={() => onRenew(c)}>
                                  <RefreshCw className="mr-1 h-3 w-3" /> Renovar
                                </Button>
                              )}
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(p, c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeParty && (
        <CivilCertDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          serviceId={serviceId}
          party={activeParty}
          cert={editingCert}
          onSaved={onChanged}
        />
      )}

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
