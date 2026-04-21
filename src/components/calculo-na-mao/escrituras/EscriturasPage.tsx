import { useEffect, useMemo, useState } from "react";
import { PenTool, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { CalculationHeader } from "../shared/CalculationHeader";
import { CurrencyInput } from "../shared/CurrencyInput";
import { ResultCard } from "../shared/ResultCard";
import { EmptyResultState } from "../shared/EmptyResultState";
import { ExportButtons } from "../shared/ExportButtons";
import { ImportValorVenalButton } from "../shared/ImportValorVenalButton";
import { BreakdownRow } from "../shared/BreakdownRow";

import {
  calcularEscritura,
  ESCRITURA_SUBTIPO_LABEL,
  type EscrituraSubtipo,
  type EscrituraInput,
  escrituraSum,
} from "@/lib/calculo-na-mao/calculators/escrituras";
import { CERTIDOES_PADRAO, HONORARIOS_PADRAO } from "@/lib/calculo-na-mao/constants";
import { formatCurrency } from "@/lib/calculo-na-mao/currency";
import { generateClementePDF, downloadPdf } from "@/lib/calculo-na-mao/pdfGenerator";
import { shareToWhatsApp } from "@/lib/calculo-na-mao/whatsapp";
import { useCreateCalculation } from "@/hooks/calculo-na-mao/useCalculations";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

const EMPTY: EscrituraInput = {
  subtipo: "compra_venda_simples",
  valorDeclarado: 0,
  valorVenalCorrigido: 0,
  valorDeclarado1: 0,
  valorVenal1: 0,
  valorDeclarado2: 0,
  valorVenal2: 0,
  valorDeclaradoCompra: 0,
  valorVenalCompra: 0,
  valorVinculo: 0,
  valorAtribuido: 0,
  avaliacaoFazenda: 0,
  folhas: 25,
  certidoes: CERTIDOES_PADRAO,
  honorarios: HONORARIOS_PADRAO,
};

export function EscriturasPage() {
  const { profile } = useAuth();
  const createCalc = useCreateCalculation();
  const [form, setForm] = useState<EscrituraInput>(EMPTY);

  // Reset campos ao trocar subtipo (mantém comuns)
  useEffect(() => {
    setForm((f) => ({
      ...EMPTY,
      subtipo: f.subtipo,
      folhas: f.folhas,
      certidoes: f.certidoes,
      honorarios: f.honorarios,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [/* trigger */]);

  const setField = <K extends keyof EscrituraInput>(k: K, v: EscrituraInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onChangeSubtipo = (s: EscrituraSubtipo) =>
    setForm({
      ...EMPTY,
      subtipo: s,
      folhas: form.folhas,
      certidoes: form.certidoes,
      honorarios: form.honorarios,
    });

  const result = useMemo(() => calcularEscritura(form), [form]);
  const reset = () => setForm(EMPTY);

  const subtipoLabel = ESCRITURA_SUBTIPO_LABEL[form.subtipo];

  const handleSave = async () => {
    if (!result) return;
    try {
      const baseTotal = Array.isArray(result.base) ? result.base[0] : result.base;
      await createCalc.mutateAsync({
        tipo: "escritura",
        subtipo: subtipoLabel,
        valor_base: baseTotal,
        valor_total: result.total,
        dados: { input: form, result } as unknown as Json,
      });
      toast.success("Cálculo salvo");
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    }
  };

  const fmtMaybeArr = (v: number | number[]) =>
    Array.isArray(v) ? v.map(formatCurrency).join(" + ") : formatCurrency(v);

  const handlePdf = () => {
    if (!result) return;
    const blob = generateClementePDF({
      titulo: "Cálculo de Escritura",
      subtipo: subtipoLabel,
      base: Array.isArray(result.base) ? result.base[0] : result.base,
      itens: [
        { label: result.impostoLabel, valor: escrituraSum(result.imposto) },
        { label: "Lavratura", valor: escrituraSum(result.lavratura) },
        { label: `Arquivamento (${form.folhas} fls)`, valor: result.arquivamento },
        { label: "Registro", valor: escrituraSum(result.registro) },
        { label: "Certidões", valor: result.certidoes },
        { label: "Honorários", valor: result.honorarios },
      ],
      total: result.total,
      responsavel: profile
        ? { nome: profile.name ?? "—", telefone: profile.phone ?? undefined, email: profile.email ?? undefined }
        : undefined,
    });
    downloadPdf(blob, `escritura-${form.subtipo}-${Date.now()}`);
  };

  const handleWhatsApp = () => {
    if (!result) return;
    const lines = [
      "📋 *Orçamento de Escritura*",
      `Tipo: ${subtipoLabel}`,
      "",
      `Base: ${fmtMaybeArr(result.base)}`,
      `${result.impostoLabel}: ${formatCurrency(escrituraSum(result.imposto))}`,
      `Lavratura: ${formatCurrency(escrituraSum(result.lavratura))}`,
      `Arquivamento: ${formatCurrency(result.arquivamento)}`,
      `Registro: ${formatCurrency(escrituraSum(result.registro))}`,
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
        icon={PenTool}
        title="Cálculo de Escrituras"
        description="Simule custos de lavratura, registro e impostos para escrituras."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da escritura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Subtipo</Label>
              <Select value={form.subtipo} onValueChange={(v) => onChangeSubtipo(v as EscrituraSubtipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ESCRITURA_SUBTIPO_LABEL) as EscrituraSubtipo[]).map((k) => (
                    <SelectItem key={k} value={k}>{ESCRITURA_SUBTIPO_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {form.subtipo === "compra_venda_simples" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor declarado">
                  <CurrencyInput value={form.valorDeclarado} onValueChange={(v) => setField("valorDeclarado", v)} />
                </Field>
                <Field
                  label="Valor venal corrigido"
                  action={<ImportValorVenalButton onImport={(v) => setField("valorVenalCorrigido", v)} />}
                >
                  <CurrencyInput value={form.valorVenalCorrigido} onValueChange={(v) => setField("valorVenalCorrigido", v)} />
                </Field>
              </div>
            )}

            {form.subtipo === "com_intervenienca" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor declarado 1">
                  <CurrencyInput value={form.valorDeclarado1} onValueChange={(v) => setField("valorDeclarado1", v)} />
                </Field>
                <Field label="Valor venal 1" action={<ImportValorVenalButton onImport={(v) => setField("valorVenal1", v)} />}>
                  <CurrencyInput value={form.valorVenal1} onValueChange={(v) => setField("valorVenal1", v)} />
                </Field>
                <Field label="Valor declarado 2">
                  <CurrencyInput value={form.valorDeclarado2} onValueChange={(v) => setField("valorDeclarado2", v)} />
                </Field>
                <Field label="Valor venal 2">
                  <CurrencyInput value={form.valorVenal2} onValueChange={(v) => setField("valorVenal2", v)} />
                </Field>
              </div>
            )}

            {form.subtipo === "compra_vinculo" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor declarado (compra)">
                  <CurrencyInput value={form.valorDeclaradoCompra} onValueChange={(v) => setField("valorDeclaradoCompra", v)} />
                </Field>
                <Field label="Valor venal (compra)" action={<ImportValorVenalButton onImport={(v) => setField("valorVenalCompra", v)} />}>
                  <CurrencyInput value={form.valorVenalCompra} onValueChange={(v) => setField("valorVenalCompra", v)} />
                </Field>
                <Field label="Valor do vínculo">
                  <CurrencyInput value={form.valorVinculo} onValueChange={(v) => setField("valorVinculo", v)} />
                </Field>
              </div>
            )}

            {(form.subtipo === "doacao_simples" ||
              form.subtipo === "doacao_usufruto" ||
              form.subtipo === "renuncia_usufruto") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Valor atribuído">
                  <CurrencyInput value={form.valorAtribuido} onValueChange={(v) => setField("valorAtribuido", v)} />
                </Field>
                <Field label="Avaliação Fazenda Estadual">
                  <CurrencyInput value={form.avaliacaoFazenda} onValueChange={(v) => setField("avaliacaoFazenda", v)} />
                </Field>
              </div>
            )}

            <Separator />

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nº de folhas">
                <Input
                  type="number"
                  min={0}
                  value={form.folhas}
                  onChange={(e) => setField("folhas", Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Certidões">
                <CurrencyInput value={form.certidoes} onValueChange={(v) => setField("certidoes", v)} />
              </Field>
              <Field label="Honorários">
                <CurrencyInput value={form.honorarios} onValueChange={(v) => setField("honorarios", v)} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {result ? (
            <>
              <ResultCard label="Total estimado" value={formatCurrency(result.total)} hint={subtipoLabel} />
              <Card>
                <CardHeader><CardTitle className="text-base">Composição</CardTitle></CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <BreakdownRow label="Base de cálculo" value={fmtMaybeArr(result.base)} />
                  <BreakdownRow label={result.impostoLabel} value={formatCurrency(escrituraSum(result.imposto))} />
                  <BreakdownRow label="Lavratura" value={formatCurrency(escrituraSum(result.lavratura))} />
                  <BreakdownRow label={`Arquivamento (${form.folhas} fls)`} value={formatCurrency(result.arquivamento)} />
                  <BreakdownRow label="Registro" value={formatCurrency(escrituraSum(result.registro))} />
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
                <Button size="sm" variant="ghost" onClick={reset}>
                  <RotateCcw className="mr-2 h-4 w-4" />Novo
                </Button>
              </div>
              <ExportButtons onExportPdf={handlePdf} onShareWhatsApp={handleWhatsApp} />
            </>
          ) : (
            <EmptyResultState message="Preencha os valores ao lado para ver o orçamento." />
          )}
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  action,
  children,
}: {
  label: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        {action}
      </div>
      {children}
    </div>
  );
}