import { useEffect, useState } from "react";
import { Shield, RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { testInfosimplesConnection, INFOSIMPLES_LABELS } from "@/lib/infosimples";

interface UsageRow {
  month: string;
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  estimated_cost_brl: number;
  by_consultation_type: Record<string, number>;
}

export function InfosimplesIntegrationCard() {
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<UsageRow | null>(null);
  const [validationStats, setValidationStats] = useState({ ok: 0, mismatch: 0, error: 0, pending: 0 });
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const month = new Date();
    month.setUTCDate(1);
    const monthKey = month.toISOString().slice(0, 10);
    const [{ data: u }, { data: certs }] = await Promise.all([
      supabase.from("infosimples_usage_stats").select("*").eq("month", monthKey).maybeSingle(),
      supabase
        .from("service_internet_certificates")
        .select("validation_status")
        .eq("auto_emitted", true),
    ]);
    setUsage(u as UsageRow | null);
    const stats = { ok: 0, mismatch: 0, error: 0, pending: 0 };
    (certs ?? []).forEach((c: any) => {
      const s = c.validation_status as string | null;
      if (s === "validated") stats.ok++;
      else if (s === "mismatch") stats.mismatch++;
      else if (s === "error") stats.error++;
      else stats.pending++;
    });
    setValidationStats(stats);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const test = async () => {
    setTesting(true);
    const r = await testInfosimplesConnection();
    setTesting(false);
    setConnected(r.ok);
    if (r.ok) toast.success("Infosimples conectado.");
    else toast.error(`Conexão falhou: ${r.error ?? "desconhecido"}`);
  };

  const successRate = usage && usage.total_requests > 0
    ? Math.round((usage.successful_requests / usage.total_requests) * 100)
    : null;

  return (
    <Card className="rounded-2xl p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-accent/10 p-2">
            <Shield className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h3 className="font-display text-xl">Infosimples API</h3>
            <p className="text-sm text-muted-foreground">
              Emissão automática de certidões com auditoria Gemini.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {connected === true && (
                <Badge className="gap-1 bg-success/15 text-success">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              )}
              {connected === false && (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Desconectado
                </Badge>
              )}
              {connected === null && <Badge variant="outline">Não testado</Badge>}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={test} disabled={testing} variant="outline" className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Testar conexão
          </Button>
          <Button onClick={refresh} disabled={loading} variant="ghost" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Certidões no mês</p>
          <p className="text-2xl font-semibold">{usage?.total_requests ?? 0}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Custo estimado</p>
          <p className="text-2xl font-semibold">
            R$ {Number(usage?.estimated_cost_brl ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Taxa de sucesso</p>
          <p className="text-2xl font-semibold">{successRate !== null ? `${successRate}%` : "—"}</p>
        </div>
      </div>

      <Separator className="my-5" />

      <div>
        <p className="mb-3 text-xs uppercase text-muted-foreground">Por tipo</p>
        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries(INFOSIMPLES_LABELS).map(([key, label]) => {
            const count = usage?.by_consultation_type?.[key] ?? 0;
            return (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{label}</span>
                <Badge variant="outline">{count}</Badge>
              </div>
            );
          })}
        </div>
      </div>

      <Separator className="my-5" />

      <div>
        <p className="mb-3 text-xs uppercase text-muted-foreground">Validação Gemini</p>
        <div className="grid grid-cols-4 gap-2">
          <Stat label="✓ OK" value={validationStats.ok} className="text-success" />
          <Stat label="⚠ Divergências" value={validationStats.mismatch} className="text-warning" />
          <Stat label="✗ Erros" value={validationStats.error} className="text-destructive" />
          <Stat label="⏳ Pendentes" value={validationStats.pending} />
        </div>
      </div>
    </Card>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <p className={`text-xl font-semibold ${className ?? ""}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
