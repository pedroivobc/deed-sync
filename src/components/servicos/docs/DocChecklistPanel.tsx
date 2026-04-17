import { Check, AlertCircle, AlertTriangle, Circle, Users, FileText, Globe, Coins, Home } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CIVIL_CERT_LABEL, type DocProgress, PARTY_ROLE_LABEL } from "@/lib/serviceDocs";

interface Props {
  progress: DocProgress;
}

export function DocChecklistPanel({ progress }: Props) {
  const p = progress;

  return (
    <aside className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-accent">
          Checklist de Documentação
        </h5>
      </div>

      {/* Partes */}
      <Section icon={Users} title="Partes">
        <Row
          ok={p.partiesCount > 0}
          label={`${p.partiesCount} parte${p.partiesCount === 1 ? "" : "s"} cadastrada${p.partiesCount === 1 ? "" : "s"}`}
        />
      </Section>

      {/* Certidões pessoais */}
      <Section icon={FileText} title="Certidões pessoais">
        {p.perPartyCivil.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">—</p>
        ) : (
          <ul className="space-y-1">
            {p.perPartyCivil.map((pc) => {
              const complete = pc.issuedCount >= pc.totalNeeded;
              return (
                <li key={pc.partyId} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {complete ? (
                      <Check className="h-3 w-3 shrink-0 text-success" />
                    ) : pc.issuedCount > 0 ? (
                      <AlertCircle className="h-3 w-3 shrink-0 text-warning" />
                    ) : (
                      <Circle className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">
                      {pc.partyName}
                      <span className="ml-1 text-muted-foreground">({PARTY_ROLE_LABEL[pc.role]})</span>
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {pc.issuedCount}/{pc.totalNeeded}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {/* Internet */}
      <Section icon={Globe} title={`Internet (${p.internet.issuedCount}/${p.internet.perCert.length})`}>
        <ul className="space-y-1">
          {p.internet.perCert.map((c) => (
            <li key={c.type} className="flex items-center justify-between gap-2 text-[11px]">
              <span className="flex items-center gap-1.5">
                {c.status === "emitida" ? (
                  <Check className="h-3 w-3 text-success" />
                ) : c.hasRecord ? (
                  <AlertCircle className="h-3 w-3 text-warning" />
                ) : (
                  <Circle className="h-3 w-3 text-muted-foreground" />
                )}
                {c.label}
              </span>
              {c.hasRecord && (c.validity.level === "soon" || c.validity.level === "expired") && (
                <Badge className={cn("text-[9px]", c.validity.badgeClass)}>
                  {c.validity.label}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* Imóvel */}
      <Section icon={Home} title="Documentação do imóvel">
        <ul className="space-y-1 text-[11px]">
          <li className="flex items-center gap-1.5">
            {p.itbi.isIssued ? <Check className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
            <Coins className="h-3 w-3 text-muted-foreground" /> Guia ITBI
          </li>
          <li className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              {p.registration.hasRecord && p.registration.validity.level === "ok" ? (
                <Check className="h-3 w-3 text-success" />
              ) : p.registration.hasRecord ? (
                <AlertCircle className="h-3 w-3 text-warning" />
              ) : (
                <Circle className="h-3 w-3 text-muted-foreground" />
              )}
              <FileText className="h-3 w-3 text-muted-foreground" /> Matrícula
            </span>
            {p.registration.hasRecord && (p.registration.validity.level !== "ok" && p.registration.validity.level !== "none") && (
              <Badge className={cn("text-[9px]", p.registration.validity.badgeClass)}>
                {p.registration.validity.label}
              </Badge>
            )}
          </li>
        </ul>
      </Section>

      {/* Overall */}
      <div className="border-t border-border pt-3">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Progresso geral
          </span>
          <span className="text-xl font-semibold tabular-nums">{p.overallPercent}%</span>
        </div>
        <Progress value={p.overallPercent} className="h-2" />
      </div>
    </aside>
  );
}

function Section({ icon: Icon, title, children }: {
  icon: typeof Users; title: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {title}
      </div>
      {children}
    </div>
  );
}

function Row({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      {ok ? <Check className="h-3 w-3 text-success" /> : <Circle className="h-3 w-3 text-muted-foreground" />}
      {label}
    </div>
  );
}

// Re-export AlertTriangle to avoid lint
export { AlertTriangle };
