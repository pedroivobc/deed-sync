import { useMemo, useState } from "react";
import { Plus, Mail, Phone, Pencil, Trash2, ShieldCheck, AlertCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import {
  PARTY_ROLE_LABEL, PARTY_ROLE_BADGE, SIGNATURE_MODE_LABEL,
  type ServiceParty, type PartyRole,
} from "@/lib/serviceDocs";
import { PartyFormDialog } from "./PartyFormDialog";

interface Props {
  serviceId: string;
  parties: ServiceParty[];
  onChanged: () => void;
}

const ROLE_GROUPS: Array<{ title: string; roles: PartyRole[] }> = [
  { title: "Compradores", roles: ["comprador", "socio_comprador"] },
  { title: "Vendedores", roles: ["vendedor", "socio_vendedor"] },
  { title: "Outros", roles: ["outorgante", "outorgado", "interveniente", "outros"] },
];

export function PartiesSection({ serviceId, parties, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceParty | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return ROLE_GROUPS.map((g) => ({
      ...g,
      items: parties.filter((p) => g.roles.includes(p.role)),
    })).filter((g) => g.items.length > 0);
  }, [parties]);

  const onDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("service_parties").delete().eq("id", deleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Parte removida.");
    setDeleteId(null);
    onChanged();
  };

  return (
    <section id="section-partes_envolvidas" className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Partes Envolvidas</h4>
        <Button size="sm" variant="outline" onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar parte
        </Button>
      </div>

      {parties.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhuma parte cadastrada"
          description="Adicione compradores, vendedores e demais envolvidos no processo."
        />
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.title}>
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g.title} ({g.items.length})
              </h5>
              <div className="grid gap-3 md:grid-cols-2">
                {g.items.map((p) => (
                  <PartyCard
                    key={p.id}
                    party={p}
                    onEdit={() => { setEditing(p); setDialogOpen(true); }}
                    onDelete={() => setDeleteId(p.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <PartyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serviceId={serviceId}
        party={editing}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={onDelete}
        title="Remover parte?"
        description="Todas as certidões vinculadas a esta parte também serão removidas."
        confirmText="Remover"
      />
    </section>
  );
}

function PartyCard({ party, onEdit, onDelete }: {
  party: ServiceParty; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge className={cn("text-[10px] uppercase", PARTY_ROLE_BADGE[party.role])}>
          {PARTY_ROLE_LABEL[party.role]}
        </Badge>
        <Badge variant="outline" className="text-[10px]">{party.person_type}</Badge>
        <Badge variant="outline" className="text-[10px]">
          {SIGNATURE_MODE_LABEL[party.signature_mode]}
        </Badge>
        {party.has_digital_certificate && (
          <ShieldCheck className="h-3.5 w-3.5 text-success" aria-label="Possui certificado digital" />
        )}
        {party.signature_mode !== "presencial" && party.has_digital_certificate === false && (
          <AlertCircle className="h-3.5 w-3.5 text-warning" aria-label="Sem certificado digital" />
        )}
      </div>
      <div>
        <p className="font-medium leading-tight">{party.name}</p>
        {party.cpf_cnpj && <p className="text-xs text-muted-foreground">{party.cpf_cnpj}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {party.email && (
          <a href={`mailto:${party.email}`} className="flex items-center gap-1 hover:text-foreground">
            <Mail className="h-3 w-3" /> {party.email}
          </a>
        )}
        {party.phone && (
          <a href={`tel:${party.phone.replace(/\D/g, "")}`} className="flex items-center gap-1 hover:text-foreground">
            <Phone className="h-3 w-3" /> {party.phone}
          </a>
        )}
      </div>
      <div className="flex items-center justify-end gap-1 pt-1">
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
