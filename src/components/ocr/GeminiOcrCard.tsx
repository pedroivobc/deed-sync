import { useEffect, useMemo, useState } from "react";
import { Sparkles, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { callOcr } from "@/lib/ocr";
import { OcrTestDialog } from "./OcrTestDialog";
import { toast } from "sonner";

interface UsageStats {
  total_extractions: number;
  total_tokens_used: number;
  estimated_cost_brl: number;
  by_document_type: Record<string, number>;
}

const TYPE_LABELS: Record<string, string> = {
  rg: "RG/CNH",
  cnh: "RG/CNH",
  cpf: "CPF",
  comprovante_residencia: "Comprovante",
  contrato_social: "Contrato social",
  certidao_junta: "Certidão Junta",
};

export function GeminiOcrCard() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [testing, setTesting] = useState(false);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [openTest, setOpenTest] = useState(false);

  const monthLabel = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, []);

  const refresh = async () => {
    const month = new Date();
    month.setUTCDate(1);
    const monthKey = month.toISOString().slice(0, 10);
    const [conn, st] = await Promise.all([
      callOcr("test_connection"),
      supabase
        .from("ocr_usage_stats")
        .select("total_extractions,total_tokens_used,estimated_cost_brl,by_document_type")
        .eq("month", monthKey)
        .maybeSingle(),
    ]);
    setConnected(conn.ok);
    setStats((st.data as UsageStats) ?? {
      total_extractions: 0, total_tokens_used: 0,
      estimated_cost_brl: 0, by_document_type: {},
    });
  };

  useEffect(() => { refresh(); }, []);

  const handleTest = async () => {
    setTesting(true);
    const r = await callOcr("test_connection");
    setTesting(false);
    setConnected(r.ok);
    if (r.ok) toast.success("Gemini conectado.");
    else toast.error(r.error ?? "Falha na conexão");
  };

  const aggregated = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(stats?.by_document_type ?? {})) {
      const label = TYPE_LABELS[k] ?? "Outros";
      out[label] = (out[label] ?? 0) + (v as number);
    }
    const total = stats?.total_extractions ?? 0;
    return Object.entries(out)
      .map(([label, n]) => ({ label, n, pct: total ? Math.round((n / total) * 100) : 0 }))
      .sort((a, b) => b.n - a.n);
  }, [stats]);

  return (
    <>
      <Card className="rounded-2xl p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-accent/10 p-2">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-xl">Gemini AI (OCR)</h3>
              <p className="text-sm text-muted-foreground">
                Extração automática de documentos.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {connected === null ? (
                  <Badge variant="outline">Verificando…</Badge>
                ) : connected ? (
                  <Badge className="gap-1 bg-success/15 text-success">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" /> Desconectado
                  </Badge>
                )}
                <Badge variant="outline">Modelo: gemini-2.0-flash-exp</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Testar conexão
            </Button>
            <Button onClick={() => setOpenTest(true)} className="gap-2">
              <Sparkles className="h-4 w-4" /> Testar extração
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div>
          <p className="mb-3 text-xs uppercase text-muted-foreground">
            Consumo — {monthLabel}
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-2xl font-display">{stats?.total_extractions ?? 0}</div>
              <div className="text-xs text-muted-foreground">extrações</div>
            </div>
            <div>
              <div className="text-2xl font-display">
                {((stats?.total_tokens_used ?? 0) / 1000).toFixed(1)}k
              </div>
              <div className="text-xs text-muted-foreground">tokens</div>
            </div>
            <div>
              <div className="text-2xl font-display">
                R$ {Number(stats?.estimated_cost_brl ?? 0).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">custo estimado</div>
            </div>
          </div>

          {aggregated.length > 0 && (
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Por tipo:</div>
              {aggregated.map((a) => (
                <div key={a.label} className="flex items-center justify-between">
                  <span>▪ {a.label}</span>
                  <span>{a.n} ({a.pct}%)</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <OcrTestDialog open={openTest} onOpenChange={setOpenTest} />
    </>
  );
}
