import { useEffect, useState } from "react";
import { FileSignature, RefreshCw, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { testClickSignConnection } from "@/lib/clicksign";

interface Stats {
  total: number;
  signed: number;
  running: number;
  cancelled: number;
  refused: number;
  expired: number;
}

export function ClickSignIntegrationCard() {
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [environment, setEnvironment] = useState<string>("sandbox");
  const [stats, setStats] = useState<Stats>({ total: 0, signed: 0, running: 0, cancelled: 0, refused: 0, expired: 0 });
  const [avgSignTime, setAvgSignTime] = useState<string>("—");
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { data } = await supabase
      .from("clicksign_envelopes")
      .select("status,sent_at,signed_at")
      .gte("created_at", monthStart.toISOString());

    const rows = data ?? [];
    const s: Stats = { total: rows.length, signed: 0, running: 0, cancelled: 0, refused: 0, expired: 0 };
    let totalSignMs = 0;
    let signedCount = 0;
    rows.forEach((r: any) => {
      if (r.status === "signed") s.signed++;
      else if (r.status === "running") s.running++;
      else if (r.status === "cancelled") s.cancelled++;
      else if (r.status === "refused") s.refused++;
      else if (r.status === "expired") s.expired++;

      if (r.signed_at && r.sent_at) {
        totalSignMs += new Date(r.signed_at).getTime() - new Date(r.sent_at).getTime();
        signedCount++;
      }
    });
    setStats(s);
    if (signedCount > 0) {
      const avgMs = totalSignMs / signedCount;
      const hours = Math.floor(avgMs / 3600000);
      const mins = Math.floor((avgMs % 3600000) / 60000);
      setAvgSignTime(`${hours}h ${mins}min`);
    } else {
      setAvgSignTime("—");
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const test = async () => {
    setTesting(true);
    const r = await testClickSignConnection();
    setTesting(false);
    const result = r.result;
    if (r.ok && result?.ok) {
      setConnected(true);
      setEnvironment(result.environment);
      toast.success(`ClickSign conectado (${result.environment}).`);
    } else {
      setConnected(false);
      const msg = result?.message ?? r.error ?? "erro desconhecido";
      toast.error(`Conexão falhou: ${msg}`);
    }
  };

  const successRate = stats.total > 0 ? Math.round((stats.signed / stats.total) * 100) : 0;

  return (
    <Card className="rounded-2xl p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-accent/10 p-2">
            <FileSignature className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h3 className="font-display text-xl">ClickSign</h3>
            <p className="text-sm text-muted-foreground">
              Assinatura eletrônica de procurações e contratos.
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
              <Badge variant="outline" className="capitalize">
                Ambiente: {environment}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={test} disabled={testing} variant="outline" className="gap-2">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Testar conexão
          </Button>
          <Button onClick={refresh} disabled={loading} variant="ghost" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      <Separator className="my-5" />

      <div>
        <p className="mb-3 text-xs uppercase text-muted-foreground">Estatísticas do mês</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Enviados</div>
            <div className="text-2xl font-semibold">{stats.total}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Assinados</div>
            <div className="text-2xl font-semibold text-success">
              {stats.signed} <span className="text-sm font-normal text-muted-foreground">({successRate}%)</span>
            </div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Pendentes</div>
            <div className="text-2xl font-semibold text-warning">{stats.running}</div>
          </div>
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Expirados/Cancelados</div>
            <div className="text-2xl font-semibold text-destructive">
              {stats.expired + stats.cancelled + stats.refused}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Tempo médio até assinatura: <strong className="text-foreground">{avgSignTime}</strong>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        <strong>Webhook URL para configurar no ClickSign:</strong>
        <br />
        <code className="mt-1 inline-block rounded bg-background px-2 py-1 font-mono">
          https://cyknzbfvdmauqwuvbqpw.supabase.co/functions/v1/clicksign-webhook
        </code>
        <br />
        <span className="mt-2 inline-block">
          Eventos: <code>sign</code>, <code>close</code>, <code>auto_close</code>, <code>refuse</code>, <code>cancel</code>, <code>deadline</code>
        </span>
      </div>
    </Card>
  );
}
