import { useEffect, useMemo, useState } from "react";
import { Home, Save, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

import { CalculationHeader } from "../shared/CalculationHeader";
import { ResultCard } from "../shared/ResultCard";
import { EmptyResultState } from "../shared/EmptyResultState";
import { ExportButtons } from "../shared/ExportButtons";

import { PdfUploadDropzone } from "./PdfUploadDropzone";
import { ExtractionProgress, type ExtractionStep } from "./ExtractionProgress";
import { ManualAdjustments, type ValorVenalForm } from "./ManualAdjustments";
import { LinkServiceDialog } from "./LinkServiceDialog";

import { useExtractIptu } from "@/hooks/calculo-na-mao/useExtractIptu";
import { useCreateCalculation } from "@/hooks/calculo-na-mao/useCalculations";
import { useQueryClient } from "@tanstack/react-query";
import {
  findFatorComercializacao, findValorM2Edificacao, findValorM2Terreno,
  normalizeIsotima, normalizePadrao, normalizeTipoImovel,
} from "@/lib/calculo-na-mao/valorVenalLookup";
import { calcularValorVenal } from "@/lib/calculo-na-mao/calculators/valorVenal";
import { formatCurrency } from "@/lib/calculo-na-mao/currency";
import { generateClementePDF, downloadPdf } from "@/lib/calculo-na-mao/pdfGenerator";
import { shareToWhatsApp } from "@/lib/calculo-na-mao/whatsapp";
import type { Json } from "@/integrations/supabase/types";

const EMPTY_FORM: ValorVenalForm = {
  inscricao: "", endereco: "", isotima: "", tipo: "", padrao: "",
  vvTerrenoIPTU: 0, vM2TerrenoIPTU: 0, vvEdificacaoIPTU: 0, vM2EdificacaoIPTU: 0,
  valorM2TerrenoPJF: 0, valorM2EdificacaoPJF: 0, fatorComercializacao: 1,
};

export function ValorVenalPage() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const extract = useExtractIptu();
  const createCalc = useCreateCalculation();

  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ExtractionStep>("idle");
  const [form, setForm] = useState<ValorVenalForm>(EMPTY_FORM);
  const [link, setLink] = useState<{ clientId: string | null; serviceId: string | null }>({
    clientId: null, serviceId: null,
  });

  // Re-popular auto-lookups quando isótima/tipo/padrão mudam
  useEffect(() => {
    if (!form.isotima) return;
    const v = findValorM2Terreno(form.isotima);
    if (v != null && form.valorM2TerrenoPJF === 0) {
      setForm((f) => ({ ...f, valorM2TerrenoPJF: v }));
    }
    // fator
    if (form.tipo) {
      const fator = findFatorComercializacao(form.isotima, form.tipo);
      if (fator !== form.fatorComercializacao && form.fatorComercializacao === 1) {
        setForm((f) => ({ ...f, fatorComercializacao: fator }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.isotima, form.tipo]);

  useEffect(() => {
    if (!form.tipo || !form.padrao) return;
    const v = findValorM2Edificacao(form.tipo, form.padrao);
    if (v != null && form.valorM2EdificacaoPJF === 0) {
      setForm((f) => ({ ...f, valorM2EdificacaoPJF: v }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.tipo, form.padrao]);

  const handleExtract = async () => {
    if (!file) return;
    setStep("upload");
    try {
      setStep("ia");
      const data = await extract.mutateAsync(file);
      setStep("extract");

      const isotima = normalizeIsotima(data.terreno?.area_isotima ?? "");
      const tipo = normalizeTipoImovel(data.edificacao?.tipo ?? "");
      const padrao = normalizePadrao(data.edificacao?.padrao ?? "");

      setForm({
        inscricao: data.inscricao_imobiliaria ?? "",
        endereco: data.endereco_completo ?? "",
        isotima,
        tipo,
        padrao,
        vvTerrenoIPTU: data.terreno?.valor_venal ?? 0,
        vM2TerrenoIPTU: data.terreno?.valor_m2 ?? 0,
        vvEdificacaoIPTU: data.edificacao?.valor_venal ?? 0,
        vM2EdificacaoIPTU: data.edificacao?.valor_m2 ?? 0,
        valorM2TerrenoPJF: findValorM2Terreno(isotima) ?? 0,
        valorM2EdificacaoPJF: findValorM2Edificacao(tipo, padrao) ?? 0,
        fatorComercializacao: findFatorComercializacao(isotima, tipo),
      });
      setStep("done");
      toast.success("Dados extraídos. Confira e ajuste se necessário.");
    } catch (e) {
      setStep("error");
      toast.error("Falha na extração", { description: (e as Error).message });
    }
  };

  const result = useMemo(() => calcularValorVenal({
    vvTerrenoIPTU: form.vvTerrenoIPTU,
    vM2TerrenoIPTU: form.vM2TerrenoIPTU,
    vvEdificacaoIPTU: form.vvEdificacaoIPTU,
    vM2EdificacaoIPTU: form.vM2EdificacaoIPTU,
    valorM2TerrenoPJF: form.valorM2TerrenoPJF,
    valorM2EdificacaoPJF: form.valorM2EdificacaoPJF,
    fatorComercializacao: form.fatorComercializacao,
  }), [form]);

  const warnings = useMemo(() => ({
    isotimaNotFound: !!form.isotima && findValorM2Terreno(form.isotima) == null,
    tipoPadraoNotFound: !!(form.tipo && form.padrao) && findValorM2Edificacao(form.tipo, form.padrao) == null,
    fatorDefault: !!(form.isotima && form.tipo) && findFatorComercializacao(form.isotima, form.tipo) === 1,
  }), [form.isotima, form.tipo, form.padrao]);

  const reset = () => {
    setFile(null);
    setForm(EMPTY_FORM);
    setStep("idle");
    setLink({ clientId: null, serviceId: null });
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      await createCalc.mutateAsync({
        tipo: "valor_venal",
        subtipo: form.tipo ? `${form.tipo} ${form.padrao}`.trim() : null,
        inscricao: form.inscricao || null,
        endereco: form.endereco || null,
        valor_base: form.vvTerrenoIPTU + form.vvEdificacaoIPTU,
        valor_total: result.valorVenalTotal,
        client_id: link.clientId,
        service_id: link.serviceId,
        dados: { input: form, result } as unknown as Json,
      });
      qc.invalidateQueries({ queryKey: ["calculos", "ultimo-valor-venal"] });
      toast.success("Cálculo salvo");
    } catch (e) {
      toast.error("Erro ao salvar", { description: (e as Error).message });
    }
  };

  const handlePdf = () => {
    if (!result) return;
    const blob = generateClementePDF({
      titulo: "Cálculo de Valor Venal",
      subtipo: form.endereco || form.inscricao || "Imóvel PJF",
      base: form.vvTerrenoIPTU + form.vvEdificacaoIPTU,
      itens: [
        { label: "Área terreno (m²)", valor: result.areaTerrenoM2.toFixed(2) },
        { label: "Área edificação (m²)", valor: result.areaEdificacaoM2.toFixed(2) },
        { label: "Valor terreno corrigido", valor: formatCurrency(result.valorTerrenoCorrigido) },
        { label: "Valor edificação corrigida", valor: formatCurrency(result.valorEdificacaoCorrigida) },
        { label: "Fator de comercialização", valor: form.fatorComercializacao.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) },
      ],
      total: result.valorVenalTotal,
      responsavel: profile
        ? { nome: profile.name ?? "—", telefone: profile.phone ?? undefined, email: profile.email ?? undefined }
        : undefined,
    });
    downloadPdf(blob, `valor-venal-${form.inscricao || Date.now()}`);
  };

  const handleWhatsApp = () => {
    if (!result) return;
    const lines = [
      "🏠 *Cálculo de Valor Venal*",
      form.endereco ? `📍 ${form.endereco}` : "",
      form.inscricao ? `Inscrição: ${form.inscricao}` : "",
      "",
      `Terreno: ${result.areaTerrenoM2.toFixed(2)} m² → ${formatCurrency(result.valorTerrenoCorrigido)}`,
      `Edificação: ${result.areaEdificacaoM2.toFixed(2)} m² → ${formatCurrency(result.valorEdificacaoCorrigida)}`,
      `Fator: ${form.fatorComercializacao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      "",
      `*Valor venal corrigido: ${formatCurrency(result.valorVenalTotal)}*`,
      "",
      "_Valores estimados. Sujeitos a alteração._",
    ].filter(Boolean).join("\n");
    shareToWhatsApp(lines);
  };

  const isProcessing = extract.isPending;

  return (
    <div className="space-y-6">
      <CalculationHeader
        icon={Home}
        title="Valor Venal"
        description="Atualize o valor venal de imóveis em Juiz de Fora a partir do carnê do IPTU."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Coluna esquerda — entrada */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-base">1. Carnê do IPTU</CardTitle>
              <ExtractionProgress step={step} />
            </CardHeader>
            <CardContent className="space-y-4">
              <PdfUploadDropzone file={file} onChange={setFile} disabled={isProcessing} />
              <div className="flex justify-end">
                <Button
                  onClick={handleExtract}
                  disabled={!file || isProcessing}
                >
                  {isProcessing ? "Extraindo…" : "Extrair dados via IA"}
                </Button>
              </div>
              {step === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Não foi possível extrair os dados — confira o PDF ou preencha manualmente.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {isProcessing ? (
            <div className="space-y-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : (
            <ManualAdjustments value={form} onChange={setForm} warnings={warnings} />
          )}
        </div>

        {/* Coluna direita — resultado */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {result ? (
            <>
              <ResultCard label="Valor venal corrigido" value={formatCurrency(result.valorVenalTotal)} />

              <Card>
                <CardHeader><CardTitle className="text-base">Composição</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Área terreno" value={`${result.areaTerrenoM2.toFixed(2)} m²`} />
                  <Row label="Área edificação" value={`${result.areaEdificacaoM2.toFixed(2)} m²`} />
                  <Separator />
                  <Row label="Terreno corrigido" value={formatCurrency(result.valorTerrenoCorrigido)} />
                  <Row label="Edificação corrigida" value={formatCurrency(result.valorEdificacaoCorrigida)} />
                  <Row
                    label="Fator"
                    value={form.fatorComercializacao.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  />
                  <Separator />
                  <Row label="Total" value={formatCurrency(result.valorVenalTotal)} bold />
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                <LinkServiceDialog
                  clientId={link.clientId}
                  serviceId={link.serviceId}
                  onChange={setLink}
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSave}
                  disabled={createCalc.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {createCalc.isPending ? "Salvando…" : "Salvar"}
                </Button>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Novo
                </Button>
              </div>

              {(link.clientId || link.serviceId) && (
                <div className="flex flex-wrap gap-2">
                  {link.clientId && <Badge variant="outline">Cliente vinculado</Badge>}
                  {link.serviceId && <Badge variant="outline">Serviço vinculado</Badge>}
                </div>
              )}

              <ExportButtons onPdf={handlePdf} onWhatsApp={handleWhatsApp} />
            </>
          ) : (
            <EmptyResultState message="Faça upload do IPTU ou preencha os campos manualmente para ver o cálculo." />
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold text-foreground" : "font-medium"}>{value}</span>
    </div>
  );
}