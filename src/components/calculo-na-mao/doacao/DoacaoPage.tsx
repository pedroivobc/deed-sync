import { useEffect, useMemo, useState } from "react";
import { Handshake, Save, RotateCcw } from "lucide-react";
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
import { BreakdownRow } from "../shared/BreakdownRow";

import {
  calcularDoacao,
  DOACAO_SUBTIPO_LABEL,
  type DoacaoSubtipo,
  type DoacaoInput,
} from "@/lib/calculo-na-mao/calculators/doacao";
import { CERTIDOES_PADRAO, HONORARIOS_PADRAO } from "@/lib/calculo-na-mao/constants";
import { formatCurrency } from "@/lib/calculo-na-mao/currency";
import { generateClementePDF, downloadPdf } from "@/lib/calculo-na-mao/pdfGenerator";
import { shareToWhatsApp } from "@/lib/calculo-na-mao/whatsapp";
import { useCreateCalculation } from "@/hooks/calculo-na-mao/useCalculations";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

const EMPTY: DoacaoInput = {
  subtipo: "doacao_simples",
  valorAtribuido: 0,
  avaliacaoFazenda: 0,
  folhas: 25,
  certidoes: CERTIDOES_PADRAO,
  honorarios: HONORARIOS_PADRAO,
};

const sumArr = (v: number | number[]) =>
  Array.isArray(v) ? v.reduce((a, b) => a + b, 0) : v;
const fmtMaybeArr = (v: number | number[]) =>
  Array.isArray(v) ? v.map(formatCurrency).join(" + ") : formatCurrency(v);

export function DoacaoPage() {
  const { profile } = useAuth();
  const createCalc = useCreateCalculation();
  const [form, setForm] = useState<DoacaoInput>(EMPTY);

  useEffect(() => {
    // limpa valores ao trocar subtipo, mantém comuns
    setForm((f) => ({
      ...EMPTY,
      subtipo: f.subtipo,
      folhas: f.folhas,
      certidoes: f.certidoes,
      honorarios: f.honorarios,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = <K extends keyof DoacaoInput>(k: K, v: DoacaoInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onChangeSubtipo = (s: DoacaoSubtipo) =>
    setForm({ ...EMPTY, subtipo: s, folhas: form.folhas, certidoes: form.certidoes, honorarios: form.honorarios });

  const result = useMemo(() => calcularDoacao(form), [form]);
  const subtipoLabel = DOACAO_SUBTIPO_LABEL[form.subtipo];

  const handleSave = async () => {
    if (!result) return;
    try {
      await createCalc.mutateAsync({
        tipo: "doacao",
        subtipo: subtipoLabel,
        valor_base: Array.isArray(result.base) ? result.base[0] : result.base,
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
      titulo: "Cálculo de Doação",
      subtipo: subtipoLabel,
      base: Array.isArray(result.base) ? result.base[0] : result.base,
      itens: [
        { label: result.itcdLabel, valor: result.itcd },
        { label: "Lavratura", valor: sumArr(result.lavratura) },
        { label: `Arquivamento (${form.folhas} fls)`, valor: result.arquivamento },
        { label: "Registro", valor: sumArr(result.registro) },
        { label: "Certidões", valor: result.certidoes },
        { label: "Honorários", valor: result.honorarios },
      ],
      total: result.total,
      responsavel: profile
        ? { nome: profile.name ?? "—", telefone: profile.phone ?? undefined, email: profile.email ?? undefined }
        : undefined,
    });
    downloadPdf(blob, `doacao-${form.subtipo}-${Date.now()}`);
  };

  const handleWhatsApp = () => {
    if (!result) return;
    const lines = [
      "🤝 *Orçamento — Doação*",
      `Tipo: ${subtipoLabel}`,
      "",
      `Base: ${fmtMaybeArr(result.base)}`,
      `${result.itcdLabel}: ${formatCurrency(result.itcd)}`,
      `Lavratura: ${formatCurrency(sumArr(result.lavratura))}`,
      `Arquivamento: ${formatCurrency(result.arquivamento)}`,
      `Registro: ${formatCurrency(sumArr(result.registro))}`,
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
        icon={Handshake}
        title="Doação"
        description="Calcule custos de doações com ou sem usufruto."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados da doação</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Subtipo</Label>
              <Select value={form.subtipo} onValueChange={(v) => onChangeSubtipo(v as DoacaoSubtipo)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(DOACAO_SUBTIPO_LABEL) as DoacaoSubtipo[]).map((k) => (
                    <SelectItem key={k} value={k}>{DOACAO_SUBTIPO_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Valor atribuído</Label>
                <CurrencyInput value={form.valorAtribuido} onValueChange={(v) => setField("valorAtribuido", v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Avaliação Fazenda (ITCD)</Label>
                <CurrencyInput value={form.avaliacaoFazenda} onValueChange={(v) => setField("avaliacaoFazenda", v)} />
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
              <ResultCard label="Total estimado" value={formatCurrency(result.total)} hint={subtipoLabel} />
              <Card>
                <CardHeader><CardTitle className="text-base">Composição</CardTitle></CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <BreakdownRow label="Base" value={fmtMaybeArr(result.base)} />
                  <BreakdownRow label={result.itcdLabel} value={formatCurrency(result.itcd)} />
                  <BreakdownRow label="Lavratura" value={formatCurrency(sumArr(result.lavratura))} />
                  <BreakdownRow label={`Arquivamento (${form.folhas} fls)`} value={formatCurrency(result.arquivamento)} />
                  <BreakdownRow label="Registro" value={formatCurrency(sumArr(result.registro))} />
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
            <EmptyResultState message="Informe valor atribuído ou avaliação para calcular." />
          )}
        </aside>
      </div>
    </div>
  );
}