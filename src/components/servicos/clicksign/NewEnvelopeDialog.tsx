import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronLeft, ChevronRight, Send, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  createEnvelopeFromPdf, htmlToPdfBase64, renderTemplate,
} from "@/lib/clicksign";
import type { ServiceParty } from "@/lib/serviceDocs";
import type { EscrituraFields } from "@/lib/serviceFields";

interface Template {
  id: string;
  name: string;
  type: string;
  content_html: string;
  variables_schema: Record<string, { label: string; required?: boolean; default?: string; auto?: string }>;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  parties: ServiceParty[];
  imovel: EscrituraFields["imovel"];
  onCreated?: () => void;
}

export function NewEnvelopeDialog({ open, onOpenChange, serviceId, parties, imovel, onCreated }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [template, setTemplate] = useState<Template | null>(null);
  const [partyId, setPartyId] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [signerEmail, setSignerEmail] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(14);
  const [submitting, setSubmitting] = useState(false);

  const eligibleParties = useMemo(
    () => parties.filter((p) => p.cpf_cnpj && p.email),
    [parties],
  );

  // Load default template
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("clicksign_templates")
        .select("id,name,type,content_html,variables_schema")
        .eq("type", "procuracao_itbi")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setTemplate(data as unknown as Template);
    })();
  }, [open]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStep(1);
      setPartyId("");
      setVariables({});
      setSignerEmail("");
      setSignerPhone("");
      setDeadlineDays(14);
    }
  }, [open]);

  const selectedParty = eligibleParties.find((p) => p.id === partyId);

  // Auto-fill variables on party select
  const fillFromParty = (p: ServiceParty | undefined) => {
    if (!p || !template) return;
    const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const filled: Record<string, string> = {};
    Object.entries(template.variables_schema).forEach(([key, schema]) => {
      if (schema.auto === "today") filled[key] = today;
      else if (schema.default) filled[key] = schema.default;
    });
    filled.nome_outorgante = p.name ?? "";
    filled.cpf_cnpj_outorgante = p.cpf_cnpj ?? "";
    filled.endereco_outorgante = p.address ?? "";
    filled.estado_civil_outorgante = p.marital_status ?? "";
    filled.profissao_outorgante = p.profession ?? "";
    filled.nacionalidade_outorgante = p.nationality ?? "brasileiro(a)";
    filled.rg_outorgante = p.rg ?? p.cnh ?? "";
    if (imovel) {
      filled.endereco_imovel = imovel.endereco ?? imovel.endereco_completo ?? "";
      filled.inscricao_iptu = imovel.iptu ?? imovel.inscricao_municipal ?? "";
      filled.numero_matricula = imovel.matricula ?? "";
      filled.municipio_imovel = imovel.municipio ?? "Juiz de Fora/MG";
    }
    setVariables(filled);
    setSignerEmail(p.email ?? "");
    setSignerPhone(p.phone ?? "");
  };

  useEffect(() => {
    fillFromParty(selectedParty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, template]);

  const renderedHtml = useMemo(() => {
    if (!template) return "";
    return renderTemplate(template.content_html, variables);
  }, [template, variables]);

  const canAdvance1 = !!partyId && !!template;
  const canAdvance2 = template
    ? Object.entries(template.variables_schema)
        .filter(([_, s]) => s.required)
        .every(([k]) => (variables[k] ?? "").trim() !== "")
    : false;
  const canSubmit = canAdvance2 && /\S+@\S+\.\S+/.test(signerEmail);

  const handleSubmit = async () => {
    if (!template || !selectedParty || !user) return;
    setSubmitting(true);
    try {
      toast.loading("Gerando PDF...", { id: "cs" });
      const pdfBase64 = await htmlToPdfBase64(renderedHtml);
      toast.loading("Enviando para ClickSign...", { id: "cs" });
      const r = await createEnvelopeFromPdf({
        service_id: serviceId,
        party_id: selectedParty.id,
        client_id: null,
        envelope_type: "procuracao_itbi",
        document_name: `Procuração ITBI - ${variables.nome_outorgante ?? selectedParty.name}`,
        pdf_base64: pdfBase64,
        template_id: template.id,
        template_name: template.name,
        custom_variables: variables,
        signers: [{
          name: variables.nome_outorgante ?? selectedParty.name,
          email: signerEmail,
          cpf_cnpj: selectedParty.cpf_cnpj ?? undefined,
          phone: signerPhone || undefined,
          party_id: selectedParty.id,
        }],
        deadline_days: deadlineDays,
        auto_send: true,
      });
      if (!r.ok || !r.result?.success) {
        toast.error(`Falha: ${r.error ?? "erro desconhecido"}`, { id: "cs" });
      } else {
        toast.success("Envelope enviado para assinatura!", { id: "cs" });
        onCreated?.();
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`, { id: "cs" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Nova Procuração ITBI — Etapa {step} de 3
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selecione a parte (vendedor ou comprador) que será o(a) outorgante da procuração.
            </p>
            {eligibleParties.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Nenhuma parte com CPF/CNPJ + e-mail cadastrado.
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Parte</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger><SelectValue placeholder="Selecione uma parte" /></SelectTrigger>
                  <SelectContent>
                    {eligibleParties.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} — {p.role} ({p.cpf_cnpj})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === 2 && template && (
          <div className="grid gap-4 py-2 lg:grid-cols-2">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              <p className="text-sm font-medium">Variáveis do documento</p>
              {Object.entries(template.variables_schema).map(([key, schema]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">
                    {schema.label}
                    {schema.required && <span className="text-destructive"> *</span>}
                  </Label>
                  {key.includes("endereco") ? (
                    <Textarea
                      value={variables[key] ?? ""}
                      onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                      rows={2}
                      className="text-sm"
                    />
                  ) : (
                    <Input
                      value={variables[key] ?? ""}
                      onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                      className="text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Pré-visualização</p>
              <div
                className="max-h-[60vh] overflow-y-auto rounded-lg border border-border bg-background p-4 text-xs"
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Confirme os dados do signatário. Será enviado um e-mail com o link para assinatura.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Nome do signatário</Label>
                <Input value={selectedParty?.name ?? ""} disabled />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">CPF/CNPJ</Label>
                <Input value={selectedParty?.cpf_cnpj ?? ""} disabled />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">E-mail <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Telefone (opcional)</Label>
                <Input
                  value={signerPhone}
                  onChange={(e) => setSignerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prazo para assinatura (dias)</Label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={deadlineDays}
                  onChange={(e) => setDeadlineDays(Number(e.target.value) || 14)}
                />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((step - 1) as 1 | 2 | 3)} disabled={submitting} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                disabled={(step === 1 && !canAdvance1) || (step === 2 && !canAdvance2)}
                className="gap-2"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar para assinatura
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
