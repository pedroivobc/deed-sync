import { useMemo, useState } from "react";
import { ClipboardCheck, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

import { CalculationHeader } from "../shared/CalculationHeader";
import { CurrencyInput } from "../shared/CurrencyInput";
import { ResultCard } from "../shared/ResultCard";
import { EmptyResultState } from "../shared/EmptyResultState";
import { ExportButtons } from "../shared/ExportButtons";
import { ImportValorVenalButton } from "../shared/ImportValorVenalButton";
import { BreakdownRow } from "../shared/BreakdownRow";

import {
  calcularRegularizacao,
  type RegularizacaoInput,
} from "@/lib/calculo-na-mao/calculators/regularizacao";
import { CERTIDOES_PADRAO, HONORARIOS_PADRAO } from "@/lib/calculo-na-mao/constants";
import { formatCurrency } from "@/lib/calculo-na-mao/currency";
import { generateClementePDF, downloadPdf } from "@/lib/calculo-na-mao/pdfGenerator";
import { shareToWhatsApp } from "@/lib/calculo-na-mao/whatsapp";
import { useCreateCalculation } from "@/hooks/calculo-na-mao/useCalculations";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

const EMPTY: RegularizacaoInput = {
  valorVenalCorrigido: 0,
  folhas: 10,
  certidoes: CERTIDOES_PADRAO,
  honorarios: HONORARIOS_PADRAO,
};

export function RegularizacaoPage() {
  const { profile } = useAuth();
  const createCalc = useCreateCalculation();
  const [form, setForm] = useState<RegularizacaoInput>(EMPTY);

  const setField = <K extends keyof RegularizacaoInput>(k: K, v: RegularizacaoInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const result = useMemo(() => calcularRegularizacao(form), [form]);

  const handleSave = async () => {
    if (!result) return;
    try {
      await createCalc.mutateAsync({
        tipo: "regularizacao",
        subtipo: "Averbação de construção",
        valor_base: result.base,
        valor_total: result.total,
        dados: { input: form, result } as unknown as Json,
      });
      toast.success("Cálculo salvo");
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    }
  };

  const handlePdf = () => {
    if (!result) return;
    const blob = generateClementePDF({
      titulo: "Regularização — Averbação",
      subtipo: "Averbação de construção/edificação",
      base: result.base,
      itens: [
        { label: "Averbação", valor: result.averbacao },
        { label: `Arquivamento (${form.folhas} fls)`, valor: result.arquivamento },
        { label: "Registro", valor: result.registro },
        { label: "Certidões", valor: result.certidoes },
        { label: "Honorários", valor: result.honorarios },
      ],
      total: result.total,
      responsavel: profile
        ? { nome: profile.name ?? "—", telefone: profile.phone ?? undefined, email: profile.email ?? undefined }
        : undefined,
    });
    downloadPdf(blob, `regularizacao-${Date.now()}`);
  };

  const handleWhatsApp = () => {
    if (!result) return;
    const lines = [
      "🏗️ *Regularização de imóvel*",
      "",
      `Base: ${formatCurrency(result.base)}`,
      `Averbação: ${formatCurrency(result.averbacao)}`,
      `Arquivamento: ${formatCurrency(result.arquivamento)}`,
      `Registro: ${formatCurrency(result.registro)}`,
      `Certidões: ${formatCurrency(result.certidoes)}`,
      `Honorários: ${formatCurrency(result.honorarios)}`,
      "",
      `*TOTAL: ${formatCurrency(result.total)}*`,
      "",
      "_Valores estimados. Sujeitos a alteração._",
    ].join("\n");
    shareToWhatsApp(lines);
  };

  return (
    <div className="space-y-6">
      <CalculationHeader
        icon={ClipboardCheck}
        title="Regularização"
        description="Estimativa de averbação para regularização de construção/edificação."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados do imóvel</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Valor venal corrigido (base)</Label>
                <ImportValorVenalButton onImport={(v) => setField("valorVenalCorrigido", v)} />
              </div>
              <CurrencyInput value={form.valorVenalCorrigido} onValueChange={(v) => setField("valorVenalCorrigido", v)} />
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nº de folhas</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.folhas}
                  onChange={(e) => setField("folhas", Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Certidões</Label>
                <CurrencyInput value={form.certidoes} onValueChange={(v) => setField("certidoes", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Honorários</Label>
                <CurrencyInput value={form.honorarios} onValueChange={(v) => setField("honorarios", v)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {result ? (
            <>
              <ResultCard label="Total estimado" value={formatCurrency(result.total)} hint="Averbação de construção" />
              <Card>
                <CardHeader><CardTitle className="text-base">Composição</CardTitle></CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <BreakdownRow label="Base" value={formatCurrency(result.base)} />
                  <BreakdownRow label="Averbação" value={formatCurrency(result.averbacao)} />
                  <BreakdownRow label={`Arquivamento (${form.folhas} fls)`} value={formatCurrency(result.arquivamento)} />
                  <BreakdownRow label="Registro" value={formatCurrency(result.registro)} />
                  <BreakdownRow label="Certidões" value={formatCurrency(result.certidoes)} />
                  <BreakdownRow label="Honorários" value={formatCurrency(result.honorarios)} />
                  <Separator className="my-2" />
                  <BreakdownRow label="Total" value={formatCurrency(result.total)} bold emphasis />
                </CardContent>
              </Card>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleSave} disabled={createCalc.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {createCalc.isPending ? "Salvando…" : "Salvar"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setForm(EMPTY)}>
                  <RotateCcw className="mr-2 h-4 w-4" />Novo
                </Button>
              </div>
              <ExportButtons onExportPdf={handlePdf} onShareWhatsApp={handleWhatsApp} />
            </>
          ) : (
            <EmptyResultState message="Informe o valor venal corrigido para calcular a averbação." />
          )}
        </aside>
      </div>
    </div>
  );
}