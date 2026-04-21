import { useMemo, useState } from "react";
import { Banknote, Building2, Save, RotateCcw } from "lucide-react";
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
  calcularFinanciamentoCaixa,
  calcularFinanciamentoPrivado,
  type FinanciamentoInput,
} from "@/lib/calculo-na-mao/calculators/financiamentos";
import { CERTIDOES_PADRAO, HONORARIOS_PADRAO } from "@/lib/calculo-na-mao/constants";
import { formatCurrency } from "@/lib/calculo-na-mao/currency";
import { generateClementePDF, downloadPdf } from "@/lib/calculo-na-mao/pdfGenerator";
import { shareToWhatsApp } from "@/lib/calculo-na-mao/whatsapp";
import { useCreateCalculation } from "@/hooks/calculo-na-mao/useCalculations";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

const EMPTY: FinanciamentoInput = {
  valorDeclarado: 0,
  valorVenalCorrigido: 0,
  valorFinanciado: 0,
  folhas: 25,
  certidoes: CERTIDOES_PADRAO,
  honorarios: HONORARIOS_PADRAO,
};

interface Props {
  variant: "caixa" | "privado";
}

export function FinanciamentoPage({ variant }: Props) {
  const { profile } = useAuth();
  const createCalc = useCreateCalculation();
  const [form, setForm] = useState<FinanciamentoInput>(EMPTY);

  const setField = <K extends keyof FinanciamentoInput>(k: K, v: FinanciamentoInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const calc = variant === "caixa" ? calcularFinanciamentoCaixa : calcularFinanciamentoPrivado;
  const result = useMemo(() => calc(form), [form, calc]);

  const titulo = variant === "caixa" ? "Financiamento Caixa (SFH)" : "Financiamento Privado";
  const descricao =
    variant === "caixa"
      ? "Cálculo de ITBI no Sistema Financeiro de Habitação + custos cartoriais."
      : "ITBI cheio (2%) + lavratura, registros e custos cartoriais.";
  const Icon = variant === "caixa" ? Banknote : Building2;
  const tipoEnum = variant === "caixa" ? "financiamento_caixa" : "financiamento_privado";

  const handleSave = async () => {
    if (!result) return;
    try {
      await createCalc.mutateAsync({
        tipo: tipoEnum,
        subtipo: titulo,
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
      titulo,
      subtipo: `Valor financiado: ${formatCurrency(form.valorFinanciado)}`,
      base: result.base,
      itens: [
        { label: result.itbiLabel, valor: result.itbi },
        { label: "Lavratura compra", valor: result.lavraturaCompra },
        { label: "Lavratura hipoteca", valor: result.lavraturaHipoteca },
        { label: `Arquivamento (${form.folhas} fls)`, valor: result.arquivamento },
        { label: "Registro compra", valor: result.registroCompra },
        { label: "Registro hipoteca", valor: result.registroHipoteca },
        { label: "Certidões", valor: result.certidoes },
        { label: "Honorários", valor: result.honorarios },
      ],
      total: result.total,
      responsavel: profile
        ? { nome: profile.name ?? "—", telefone: profile.phone ?? undefined, email: profile.email ?? undefined }
        : undefined,
    });
    downloadPdf(blob, `${tipoEnum}-${Date.now()}`);
  };

  const handleWhatsApp = () => {
    if (!result) return;
    const lines = [
      `🏦 *${titulo}*`,
      "",
      `Base: ${formatCurrency(result.base)}`,
      `Financiado: ${formatCurrency(form.valorFinanciado)}`,
      `${result.itbiLabel}: ${formatCurrency(result.itbi)}`,
      `Lavratura compra: ${formatCurrency(result.lavraturaCompra)}`,
      `Lavratura hipoteca: ${formatCurrency(result.lavraturaHipoteca)}`,
      `Arquivamento: ${formatCurrency(result.arquivamento)}`,
      `Registro compra: ${formatCurrency(result.registroCompra)}`,
      `Registro hipoteca: ${formatCurrency(result.registroHipoteca)}`,
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
      <CalculationHeader icon={Icon} title={titulo} description={descricao} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados do imóvel</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor declarado</Label>
                <CurrencyInput value={form.valorDeclarado} onValueChange={(v) => setField("valorDeclarado", v)} />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Valor venal corrigido</Label>
                  <ImportValorVenalButton onImport={(v) => setField("valorVenalCorrigido", v)} />
                </div>
                <CurrencyInput value={form.valorVenalCorrigido} onValueChange={(v) => setField("valorVenalCorrigido", v)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Valor financiado</Label>
                <CurrencyInput value={form.valorFinanciado} onValueChange={(v) => setField("valorFinanciado", v)} />
              </div>
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
              <ResultCard label="Total estimado" value={formatCurrency(result.total)} hint={titulo} />
              <Card>
                <CardHeader><CardTitle className="text-base">Composição</CardTitle></CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <BreakdownRow label="Base" value={formatCurrency(result.base)} />
                  <BreakdownRow label={result.itbiLabel} value={formatCurrency(result.itbi)} />
                  <BreakdownRow label="Lavratura compra" value={formatCurrency(result.lavraturaCompra)} />
                  <BreakdownRow label="Lavratura hipoteca" value={formatCurrency(result.lavraturaHipoteca)} />
                  <BreakdownRow label={`Arquivamento (${form.folhas} fls)`} value={formatCurrency(result.arquivamento)} />
                  <BreakdownRow label="Registro compra" value={formatCurrency(result.registroCompra)} />
                  <BreakdownRow label="Registro hipoteca" value={formatCurrency(result.registroHipoteca)} />
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
            <EmptyResultState message="Informe os valores do imóvel para ver o orçamento." />
          )}
        </aside>
      </div>
    </div>
  );
}