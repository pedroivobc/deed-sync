import { useEffect, useMemo, useState } from "react";
import { TrendingUp, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalculationHeader } from "../shared/CalculationHeader";
import { CurrencyInput } from "../shared/CurrencyInput";
import { ResultCard } from "../shared/ResultCard";
import { EmptyResultState } from "../shared/EmptyResultState";
import { ExportButtons } from "../shared/ExportButtons";
import { calcularCorrecaoIncc } from "@/lib/calculo-na-mao/calculators/correcaoIncc";
import { INCC_ANOS, INCC_ANO_BASE } from "@/lib/calculo-na-mao/inccIndices";
import { formatCurrency, formatPercent } from "@/lib/calculo-na-mao/currency";
import { generateClementePDF, downloadPdf } from "@/lib/calculo-na-mao/pdfGenerator";
import { buildCorrecaoInccMessage, shareToWhatsApp } from "@/lib/calculo-na-mao/whatsapp";
import { useCreateCalculation } from "@/hooks/calculo-na-mao/useCalculations";
import { useAuth } from "@/contexts/AuthContext";

export function CorrecaoContratualPage() {
  const { profile } = useAuth();
  const createCalc = useCreateCalculation();

  const [valorCompra, setValorCompra] = useState<number>(0);
  const [anoContrato, setAnoContrato] = useState<number>(INCC_ANO_BASE);

  const result = useMemo(
    () => calcularCorrecaoIncc({ valorCompra, anoContrato }),
    [valorCompra, anoContrato],
  );

  const reset = () => {
    setValorCompra(0);
    setAnoContrato(INCC_ANO_BASE);
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await createCalc.mutateAsync({
        tipo: "correcao_incc",
        subtipo: `Correção INCC ${anoContrato} → ${INCC_ANO_BASE}`,
        valor_base: result.valorCompra,
        valor_total: result.valorCorrigido,
        dados: { input: { valorCompra, anoContrato }, result },
      });
      toast.success("Cálculo salvo com sucesso");
    } catch (e) {
      toast.error("Erro ao salvar cálculo", { description: (e as Error).message });
    }
  };

  const handlePdf = () => {
    if (!result) return;
    const blob = generateClementePDF({
      titulo: "Correção Contratual INCC",
      subtipo: `Contrato firmado em ${anoContrato} corrigido para ${INCC_ANO_BASE}`,
      base: result.valorCompra,
      itens: [
        { label: `Índice INCC ${anoContrato}`, valor: result.indiceAno.toFixed(2) },
        { label: `Índice INCC ${INCC_ANO_BASE}`, valor: result.indiceBase.toFixed(2) },
        { label: "Variação", valor: formatPercent(result.variacaoPercentual, true) },
        { label: "Diferença", valor: formatCurrency(result.diferenca) },
      ],
      total: result.valorCorrigido,
      responsavel: profile
        ? { nome: profile.name ?? "—", telefone: profile.phone ?? undefined, email: profile.email ?? undefined }
        : undefined,
    });
    downloadPdf(blob, `correcao-incc-${anoContrato}`);
  };

  const handleWhatsApp = () => {
    if (!result) return;
    shareToWhatsApp(
      buildCorrecaoInccMessage({
        valorCompra: formatCurrency(result.valorCompra),
        anoContrato: result.anoContrato,
        valorCorrigido: formatCurrency(result.valorCorrigido),
        variacao: formatPercent(result.variacaoPercentual, true),
      }),
    );
  };

  return (
    <div className="space-y-6">
      <CalculationHeader
        icon={TrendingUp}
        title="Correção Contratual INCC"
        description="Atualiza valores de contratos antigos para o índice INCC do ano-base atual."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dados do contrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="valor-compra">Valor de compra</Label>
              <CurrencyInput
                id="valor-compra"
                value={valorCompra}
                onValueChange={setValorCompra}
                placeholder="R$ 0,00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ano-contrato">Ano do contrato</Label>
              <Select
                value={String(anoContrato)}
                onValueChange={(v) => setAnoContrato(Number(v))}
              >
                <SelectTrigger id="ano-contrato">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCC_ANOS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {anoContrato === INCC_ANO_BASE && (
              <Alert>
                <AlertDescription>
                  O ano selecionado é o ano-base atual ({INCC_ANO_BASE}). Não há correção a aplicar.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={reset}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Limpar
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSave}
                disabled={!result || createCalc.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {createCalc.isPending ? "Salvando..." : "Salvar cálculo"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {result ? (
            <>
              <ResultCard
                label="Valor corrigido"
                value={formatCurrency(result.valorCorrigido)}
                hint={
                  <span
                    className={
                      result.variacaoPercentual >= 0 ? "text-success" : "text-destructive"
                    }
                  >
                    {formatPercent(result.variacaoPercentual, true)} em relação ao valor original
                  </span>
                }
              />

              <Card>
                <CardContent className="space-y-2 pt-6 text-sm">
                  <Row label="Valor original" value={formatCurrency(result.valorCompra)} />
                  <Row label={`Índice ${result.anoContrato}`} value={result.indiceAno.toFixed(2)} />
                  <Row label={`Índice ${result.anoBase}`} value={result.indiceBase.toFixed(2)} />
                  <Row label="Diferença" value={formatCurrency(result.diferenca)} />
                </CardContent>
              </Card>

              <ExportButtons
                onExportPdf={handlePdf}
                onShareWhatsApp={handleWhatsApp}
              />
            </>
          ) : (
            <EmptyResultState message="Informe o valor de compra para calcular a correção." />
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}