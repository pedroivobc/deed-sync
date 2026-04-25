import { useEffect, useMemo, useState } from "react";
import { PenLine, Users, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EmptyState } from "@/components/ui/empty-state";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  PARTY_ROLE_LABEL, PARTY_ROLE_BADGE, SIGNATURE_MODE_LABEL,
  type ServiceParty, type SignatureMode, type PartyRole,
} from "@/lib/serviceDocs";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  serviceId: string;
  parties: ServiceParty[];
  onChanged: () => void;
}

/** Roles that participate in the signature workflow. */
const SIGNING_ROLES: PartyRole[] = [
  "comprador", "vendedor", "socio_comprador", "socio_vendedor",
  "outorgante", "outorgado", "interveniente",
];

interface ActivityEntry {
  party_id: string;
  signature_mode: SignatureMode;
  has_digital_certificate: boolean | null;
  user_name: string | null;
  created_at: string;
}

/**
 * Signature module — one card per party with quick controls to confirm
 * signature mode (online/presencial) and digital-certificate status.
 * Records every change in `service_activity_log` for traceability.
 */
export function SignaturesSection({ serviceId, parties, onChanged }: Props) {
  const { user, profile } = useAuth();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [lastByParty, setLastByParty] = useState<Record<string, ActivityEntry>>({});

  const signingParties = useMemo(
    () => parties.filter((p) => SIGNING_ROLES.includes(p.role)),
    [parties],
  );

  // Load most recent "signature_updated" entry per party for traceability badge.
  useEffect(() => {
    if (!serviceId || signingParties.length === 0) {
      setLastByParty({});
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("service_activity_log")
        .select("payload, created_at, user:profiles ( name, email )")
        .eq("service_id", serviceId)
        .eq("action", "signature_updated")
        .order("created_at", { ascending: false })
        .limit(100);
      if (!active || !data) return;
      const map: Record<string, ActivityEntry> = {};
      for (const row of data as Array<{
        payload: Record<string, unknown> | null;
        created_at: string;
        user: { name: string | null; email: string | null } | null;
      }>) {
        const pid = row.payload?.party_id as string | undefined;
        if (!pid || map[pid]) continue;
        map[pid] = {
          party_id: pid,
          signature_mode: row.payload?.signature_mode as SignatureMode,
          has_digital_certificate:
            (row.payload?.has_digital_certificate as boolean | null | undefined) ?? null,
          user_name: row.user?.name ?? row.user?.email ?? null,
          created_at: row.created_at,
        };
      }
      setLastByParty(map);
    })();
    return () => { active = false; };
  }, [serviceId, signingParties.length, parties]);

  const updateParty = async (
    party: ServiceParty,
    patch: { signature_mode?: SignatureMode; has_digital_certificate?: boolean | null },
  ) => {
    setSavingId(party.id);
    const next = {
      signature_mode: patch.signature_mode ?? party.signature_mode,
      has_digital_certificate:
        patch.has_digital_certificate !== undefined
          ? patch.has_digital_certificate
          : party.has_digital_certificate,
    };
    // For presencial, the digital certificate field becomes irrelevant.
    if (next.signature_mode === "presencial") {
      next.has_digital_certificate = null;
    }
    const { error } = await supabase
      .from("service_parties")
      .update(next)
      .eq("id", party.id);
    if (error) {
      setSavingId(null);
      toast.error(error.message);
      return;
    }
    // Audit trail
    await supabase.from("service_activity_log").insert({
      service_id: serviceId,
      user_id: user?.id ?? null,
      action: "signature_updated",
      payload: {
        party_id: party.id,
        party_name: party.name,
        signature_mode: next.signature_mode,
        has_digital_certificate: next.has_digital_certificate,
      } as unknown as Json,
    });
    // Optimistic update of the "last action" badge
    setLastByParty((prev) => ({
      ...prev,
      [party.id]: {
        party_id: party.id,
        signature_mode: next.signature_mode,
        has_digital_certificate: next.has_digital_certificate,
        user_name: profile?.name ?? profile?.email ?? null,
        created_at: new Date().toISOString(),
      },
    }));
    setSavingId(null);
    toast.success("Assinatura atualizada.");
    onChanged();
  };

  return (
    <section id="section-assinatura" className="rounded-xl border border-border bg-card/50 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Assinatura</h4>
        <p className="mt-1 text-xs text-muted-foreground">
          Defina o tipo de assinatura para cada parte envolvida no processo.
        </p>
      </div>

      {signingParties.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Cadastre as partes primeiro"
          description="O controle de assinatura é gerado a partir das partes envolvidas."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {signingParties.map((p) => (
            <SignatureCard
              key={p.id}
              party={p}
              saving={savingId === p.id}
              lastEntry={lastByParty[p.id]}
              onChange={(patch) => updateParty(p, patch)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function SignatureCard({
  party, saving, lastEntry, onChange,
}: {
  party: ServiceParty;
  saving: boolean;
  lastEntry?: ActivityEntry;
  onChange: (patch: {
    signature_mode?: SignatureMode;
    has_digital_certificate?: boolean | null;
  }) => void;
}) {
  const mode = party.signature_mode;
  const showDigital = mode === "online" || mode === "hibrida";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-tight">{party.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge className={cn("text-[10px] uppercase", PARTY_ROLE_BADGE[party.role])}>
              {PARTY_ROLE_LABEL[party.role]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">{party.person_type}</Badge>
          </div>
        </div>
        {saving && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
      </div>

      {/* Signature mode selector */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tipo de assinatura</Label>
        <RadioGroup
          value={mode}
          onValueChange={(v) => onChange({ signature_mode: v as SignatureMode })}
          className="grid grid-cols-2 gap-2"
        >
          {(["presencial", "online"] as SignatureMode[]).map((m) => (
            <label
              key={m}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs",
                mode === m ? "border-accent bg-accent/5" : "border-border",
              )}
            >
              <RadioGroupItem value={m} className="h-3.5 w-3.5" />
              {SIGNATURE_MODE_LABEL[m]}
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Digital certificate question (online only) */}
      {showDigital && (
        <div className="space-y-1.5 rounded-md border border-border bg-muted/30 p-2.5">
          <Label className="text-xs">Possui certificado digital válido?</Label>
          <RadioGroup
            value={
              party.has_digital_certificate === null || party.has_digital_certificate === undefined
                ? ""
                : party.has_digital_certificate ? "sim" : "nao"
            }
            onValueChange={(v) => onChange({ has_digital_certificate: v === "sim" })}
            className="flex gap-4"
          >
            <label className="flex items-center gap-1.5 text-xs">
              <RadioGroupItem value="sim" className="h-3.5 w-3.5" /> Sim
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <RadioGroupItem value="nao" className="h-3.5 w-3.5" /> Não
            </label>
          </RadioGroup>
          {party.has_digital_certificate === true && (
            <div className="flex items-center gap-1.5 text-[11px] text-success">
              <ShieldCheck className="h-3 w-3" /> Certificado digital confirmado.
            </div>
          )}
          {party.has_digital_certificate === false && (
            <div className="flex items-start gap-1.5 text-[11px] text-warning">
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              Cliente precisará emitir certificado digital antes da assinatura.
            </div>
          )}
        </div>
      )}

      {/* Audit footer */}
      {lastEntry && (
        <div className="flex items-start gap-1.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <PenLine className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            Assinatura {SIGNATURE_MODE_LABEL[lastEntry.signature_mode].toLowerCase()}
            {lastEntry.user_name ? ` confirmada por ${lastEntry.user_name}` : " atualizada"}
            {" em "}
            {new Date(lastEntry.created_at).toLocaleString("pt-BR", {
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </span>
        </div>
      )}
    </div>
  );
}