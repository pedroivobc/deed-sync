import { LayoutDashboard } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { CalculationHeader } from "@/components/calculo-na-mao/shared/CalculationHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCalculations } from "@/hooks/calculo-na-mao/useCalculations";
import { formatCurrency } from "@/lib/calculo-na-mao/currency";
import { Link } from "react-router-dom";

const TIPO_LABEL: Record<string, string> = {
  valor_venal: "Valor Venal",
  escritura: "Escritura",
  doacao: "Doação",
  correcao_incc: "Correção INCC",
  financiamento_caixa: "Fin. Caixa",
  financiamento_privado: "Fin. Privado",
  regularizacao: "Regularização",
};

export default function CalculoDashboardPage() {
  const { data: calculos = [], isLoading } = useCalculations({ limit: 50 });
  const total = calculos.length;
  const ultimos = calculos.slice(0, 5);

  return (
    <AppLayout title="Cálculo na Mão">
      <div className="space-y-6">
        <CalculationHeader
          icon={LayoutDashboard}
          title="Cálculo na Mão"
          description="Visão geral dos cálculos imobiliários do escritório."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card><CardHeader><CardTitle className="text-base">Total de cálculos</CardTitle></CardHeader>
            <CardContent className="font-display text-4xl">{isLoading ? "…" : total}</CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Últimos 30 dias</CardTitle></CardHeader>
            <CardContent className="font-display text-4xl">
              {isLoading ? "…" : calculos.filter((c) => {
                const d = new Date(c.created_at).getTime();
                return Date.now() - d < 30 * 24 * 3600 * 1000;
              }).length}
            </CardContent>
          </Card>
          <Card><CardHeader><CardTitle className="text-base">Valor médio</CardTitle></CardHeader>
            <CardContent className="font-display text-3xl">
              {isLoading ? "…" : formatCurrency(
                total ? calculos.reduce((s, c) => s + Number(c.valor_total ?? 0), 0) / total : 0,
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Últimos cálculos</CardTitle></CardHeader>
          <CardContent>
            {ultimos.length === 0 ? (
              <Alert><AlertDescription>Nenhum cálculo ainda. Comece pela <Link to="/calculo-na-mao/correcao-contratual" className="underline">Correção INCC</Link>.</AlertDescription></Alert>
            ) : (
              <ul className="divide-y divide-border">
                {ultimos.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-medium">{TIPO_LABEL[c.tipo] ?? c.tipo}</div>
                      <div className="text-xs text-muted-foreground">{c.subtipo ?? "—"}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(Number(c.valor_total ?? 0))}</div>
                      <div className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}