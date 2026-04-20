import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  ALL_AUTO_TYPES, INFOSIMPLES_LABELS, INFOSIMPLES_PRICES_BRL, totalCost,
  requestAllForParty,
  type InfosimplesConsultationType, type InfosimplesResultItem,
} from "@/lib/infosimples";
import { notify } from "@/lib/notify";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  partyId: string | null;
  partyName: string;
  cpfCnpj: string;
  personType: "PF" | "PJ";
  onCompleted: () => void;
}

type Phase = "confirm" | "running" | "done";

export function BatchInfosimplesDialog({
  open, onOpenChange, serviceId, partyId, partyName, cpfCnpj, personType, onCompleted,
}: Props) {
  const [phase, setPhase] = useState<Phase>("confirm");
  const [selected, setSelected] = useState<Set<InfosimplesConsultationType>>(
    new Set(ALL_AUTO_TYPES),
  );
  const [results, setResults] = useState<InfosimplesResultItem[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setPhase("confirm");
      setResults([]);
      setSelected(new Set(ALL_AUTO_TYPES));
      setStartedAt(null);
      setElapsed(0);
    }
  }, [open]);

  useEffect(() => {
    if (phase !== "running" || !startedAt) return;
    const i = window.setInterval(() => setElapsed(Date.now() - startedAt), 500);
    return () => window.clearInterval(i);
  }, [phase, startedAt]);

  const toggle = (t: InfosimplesConsultationType) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const types = Array.from(selected);
  const cost = totalCost(types);

  const startRequest = async () => {
    if (types.length === 0) {
      notify.warning("Selecione ao menos uma certidão.");
      return;
    }
    if (!cpfCnpj || cpfCnpj.replace(/\D/g, "").length < 11) {
      notify.error("CPF/CNPJ inválido para esta parte.");
      return;
    }
    setPhase("running");
    setStartedAt(Date.now());
    const res = await requestAllForParty({
      service_id: serviceId,
      party_id: partyId,
      cpf_cnpj: cpfCnpj,
      person_type: personType,
      consultation_types: types,
    });
    setResults(res.results ?? []);
    setPhase("done");
    onCompleted();
    if (res.summary?.positive_count > 0) {
      notify.warning(`${res.summary.positive_count} certidão(ões) POSITIVA(s) detectada(s).`);
    } else if (res.summary?.success > 0) {
      notify.success(`${res.summary.success}/${res.summary.total} certidões emitidas.`);
    }
    if (res.summary?.failed > 0) {
      notify.error(`${res.summary.failed} certidão(ões) falharam.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => phase !== "running" && onOpenChange(o)}>
      <DialogContent className="max-h-[92vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {phase === "confirm" && "Emissão automática de certidões"}
            {phase === "running" && "Emitindo certidões…"}
            {phase === "done" && "Resultado da emissão"}
          </DialogTitle>
        </DialogHeader>

        {phase === "confirm" && (
          <div className="space-y-4 py-2">
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{partyName}</p>
              <p className="text-xs text-muted-foreground">
                {personType === "PF" ? "CPF" : "CNPJ"}: {cpfCnpj}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Certidões a emitir</p>
              {ALL_AUTO_TYPES.map((t) => (
                <label
                  key={t}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-md border border-border p-2 text-sm hover:bg-muted/40"
                >
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has(t)}
                      onCheckedChange={() => toggle(t)}
                    />
                    <span>{INFOSIMPLES_LABELS[t]}</span>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    R$ {INFOSIMPLES_PRICES_BRL[t].toFixed(2)}
                  </Badge>
                </label>
              ))}
            </div>

            <Separator />

            <div className="flex items-center justify-between text-sm">
              <span>Custo estimado:</span>
              <span className="font-semibold">R$ {cost.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">⏱️ Tempo médio: 2-5 minutos · Validação Gemini incluída.</p>
          </div>
        )}

        {phase === "running" && (
          <div className="space-y-4 py-4 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-accent" />
            <p className="text-sm">Emitindo {types.length} certidões em paralelo…</p>
            <Progress value={Math.min(95, (elapsed / (3 * 60_000)) * 100)} />
            <p className="text-xs text-muted-foreground">
              {Math.floor(elapsed / 1000)}s decorridos · não feche esta janela.
            </p>
          </div>
        )}

        {phase === "done" && (
          <div className="space-y-3 py-2">
            {results.map((r) => <ResultRow key={r.consultation_type} item={r} />)}
            <Separator />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{results.filter((r) => r.success).length}/{results.length} sucesso</span>
              <span>R$ {totalCost(results.map((r) => r.consultation_type)).toFixed(2)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              <Sparkles className="mr-1 inline h-3 w-3" />
              Validação Gemini executando em segundo plano para auditar cada PDF.
            </p>
          </div>
        )}

        <DialogFooter>
          {phase === "confirm" && (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={startRequest} disabled={types.length === 0}>
                ⚡ Emitir {types.length} certidão{types.length === 1 ? "" : "ões"}
              </Button>
            </>
          )}
          {phase === "running" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Continuar em segundo plano
            </Button>
          )}
          {phase === "done" && (
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({ item }: { item: InfosimplesResultItem }) {
  if (!item.success) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="font-medium">{INFOSIMPLES_LABELS[item.consultation_type]}</p>
          <p className="text-destructive">{item.error ?? "Falha"}</p>
        </div>
      </div>
    );
  }
  const isPositive = item.classification === "positiva";
  const isMixed = item.classification === "positiva_com_efeito_negativa";
  const Icon = isPositive ? AlertTriangle : isMixed ? AlertTriangle : CheckCircle2;
  const cls = isPositive
    ? "border-destructive/30 bg-destructive/5 text-destructive"
    : isMixed
    ? "border-warning/30 bg-warning/5 text-warning"
    : "border-success/30 bg-success/5 text-success";
  return (
    <div className={cn("flex items-start gap-2 rounded-md border p-2 text-xs", cls)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-foreground">{INFOSIMPLES_LABELS[item.consultation_type]}</p>
        <p>
          Resultado: <span className="font-semibold uppercase">{item.classification ?? "—"}</span>
          {item.protocol && <> · Protocolo: {item.protocol}</>}
        </p>
      </div>
      <Clock className="mt-0.5 h-3 w-3 text-muted-foreground" />
    </div>
  );
}
