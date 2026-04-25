import { ExternalLink, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { maskPhoneBR } from "@/lib/masks";

import { FormSection, FieldLabel } from "../FormSection";
import { MoneyInput } from "../MoneyInput";
import { EscrituraDocs } from "../docs/EscrituraDocs";
import { ImovelSection } from "./ImovelSection";
import { type EscrituraFields, TIPO_ESCRITURA_OPTIONS } from "@/lib/serviceFields";
import { usePermissions } from "@/hooks/usePermissions";

interface Props {
  value: EscrituraFields;
  onChange: (v: EscrituraFields) => void;
  serviceId: string | null;
}

export function EscrituraForm({ value, onChange, serviceId }: Props) {
  const { can } = usePermissions();
  const canSeeFinancial = can("view_service_financial");
  const set = <K extends keyof EscrituraFields>(section: K, partial: Partial<EscrituraFields[K]>) => {
    onChange({ ...value, [section]: { ...value[section], ...partial } });
  };

  const showInterveniencia = value.processo_contrato.tera_interveniencia === "sim";
  const itbiEmitida = !!value.financeiro.guia_itbi_emitida;

  // Detect legacy data: any of the old checkboxes was true
  const legacyDoc = value.documentacao;
  const hasLegacyDoc = !!(
    legacyDoc?.certidoes_estado_civil ||
    legacyDoc?.certidoes_internet ||
    legacyDoc?.cndi ||
    legacyDoc?.docs_compradora ||
    legacyDoc?.docs_vendedora ||
    legacyDoc?.docs_imovel
  );

  const dataItbi = value.financeiro.data_emissao_itbi
    ? new Date(value.financeiro.data_emissao_itbi) : null;

  const clearLegacyDoc = () => {
    set("documentacao", {
      certidoes_estado_civil: false,
      certidoes_internet: false,
      cndi: false,
      docs_compradora: false,
      docs_vendedora: false,
      docs_imovel: false,
    });
  };

  return (
    <div className="space-y-5">
      {/* Partes Envolvidas (campos originais — mantidos como resumo livre; as Partes detalhadas vão na nova seção abaixo) */}
      <FormSection title="Resumo das Partes (livre)" id="section-partes_envolvidas">
        <p className="mb-3 text-xs text-muted-foreground">
          Use este resumo para anotações rápidas. O cadastro detalhado das partes (com CPF, certidões etc.) está na seção “Documentação Detalhada” abaixo.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Compradora</FieldLabel>
            <Input value={value.partes_envolvidas.compradora ?? ""}
              onChange={(e) => set("partes_envolvidas", { compradora: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Parte vendedora</FieldLabel>
            <Input value={value.partes_envolvidas.vendedora ?? ""}
              onChange={(e) => set("partes_envolvidas", { vendedora: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Corretor</FieldLabel>
            <Input value={value.partes_envolvidas.corretor ?? ""}
              onChange={(e) => set("partes_envolvidas", { corretor: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Contato do corretor</FieldLabel>
            <Input value={value.partes_envolvidas.contato_corretor ?? ""}
              onChange={(e) => set("partes_envolvidas", { contato_corretor: e.target.value })}
              placeholder="Telefone ou e-mail" />
          </div>
          <div>
            <FieldLabel>Telefone vendedor</FieldLabel>
            <Input value={value.partes_envolvidas.telefone_vendedor ?? ""}
              onChange={(e) => set("partes_envolvidas", { telefone_vendedor: maskPhoneBR(e.target.value) })}
              placeholder="(00) 00000-0000" />
          </div>
        </div>
      </FormSection>

      {/* NOVA Documentação Detalhada (substitui a antiga seção de checkboxes) */}
      <FormSection title="Documentação Detalhada" id="section-documentacao">
        {hasLegacyDoc && (
          <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Estrutura antiga detectada</p>
                  <p className="text-xs text-muted-foreground">
                    Este serviço foi cadastrado com checkboxes simples. A documentação agora é gerenciada por partes, certidões e prazos detalhados.
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={clearLegacyDoc}>
                  Limpar marcações antigas
                </Button>
              </div>
            </div>
          </div>
        )}

        <EscrituraDocs
          serviceId={serviceId}
          imovel={value.imovel}
          onImovelChange={(v) => set("imovel", v)}
        />

        <div className="mt-4">
          <FieldLabel>Observações gerais sobre a documentação</FieldLabel>
          <Textarea rows={2} value={value.documentacao.observacoes ?? ""}
            onChange={(e) => set("documentacao", { observacoes: e.target.value })} />
        </div>
      </FormSection>

      {/* Dados do Imóvel */}
      <ImovelSection
        value={value.imovel}
        onChange={(v) => set("imovel", v)}
      />

      {/* Processo e Contrato */}
      <FormSection title="Processo e Contrato" id="section-processo_contrato">
        <div className="space-y-4">
          <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
            <Checkbox checked={!!value.processo_contrato.contrato_compra_venda}
              onCheckedChange={(v) => set("processo_contrato", { contrato_compra_venda: !!v })} />
            Contrato de Compra e Venda já existe
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Terá contrato declarado?</FieldLabel>
              <RadioGroup
                value={value.processo_contrato.tera_contrato_declarado ?? ""}
                onValueChange={(v) => set("processo_contrato", { tera_contrato_declarado: v as "sim" | "nao" })}
                className="flex gap-6"
              >
                <label className="flex items-center gap-2"><RadioGroupItem value="sim" id="cd-sim" /> Sim</label>
                <label className="flex items-center gap-2"><RadioGroupItem value="nao" id="cd-nao" /> Não</label>
              </RadioGroup>
            </div>
            <div>
              <FieldLabel>Terá interveniência?</FieldLabel>
              <RadioGroup
                value={value.processo_contrato.tera_interveniencia ?? ""}
                onValueChange={(v) => set("processo_contrato", { tera_interveniencia: v as "sim" | "nao" })}
                className="flex gap-6"
              >
                <label className="flex items-center gap-2"><RadioGroupItem value="sim" id="iv-sim" /> Sim</label>
                <label className="flex items-center gap-2"><RadioGroupItem value="nao" id="iv-nao" /> Não</label>
              </RadioGroup>
            </div>

            {showInterveniencia && (
              <div className="md:col-span-2">
                <FieldLabel>Valor declarado da interveniência</FieldLabel>
                <MoneyInput value={value.processo_contrato.valor_interveniencia ?? null}
                  onChange={(n) => set("processo_contrato", { valor_interveniencia: n })} />
              </div>
            )}
          </div>
        </div>
      </FormSection>

      {/* Escritura */}
      <FormSection title="Escritura" id="section-escritura">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Cartório de Notas onde será lavrada</FieldLabel>
            <Input value={value.escritura.cartorio_notas ?? ""}
              onChange={(e) => set("escritura", { cartorio_notas: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Tipo de escritura</FieldLabel>
            <Select value={value.escritura.tipo_escritura ?? ""}
              onValueChange={(v) => set("escritura", { tipo_escritura: v })}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {TIPO_ESCRITURA_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Observações sobre a escritura</FieldLabel>
            <Textarea rows={2} value={value.escritura.observacoes ?? ""}
              onChange={(e) => set("escritura", { observacoes: e.target.value })} />
          </div>
        </div>
      </FormSection>

      {/* Financeiro — oculto para perfis sem permissão de ver valores */}
      {canSeeFinancial && (
        <FormSection title="Financeiro" id="section-financeiro">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <FieldLabel required>Valor declarado de compra</FieldLabel>
              <MoneyInput value={value.financeiro.valor_compra ?? null}
                onChange={(n) => set("financeiro", { valor_compra: n })} />
            </div>
            <div>
              <FieldLabel>Valor dos emolumentos cartorários</FieldLabel>
              <MoneyInput value={value.financeiro.valor_emolumentos ?? null}
                onChange={(n) => set("financeiro", { valor_emolumentos: n })} />
            </div>
            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <Checkbox checked={itbiEmitida}
                  onCheckedChange={(v) => set("financeiro", { guia_itbi_emitida: !!v })} />
                Guia de ITBI emitida (resumo)
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Os dados completos do ITBI estão na seção “Documentação Detalhada”.
              </p>
            </div>
            {itbiEmitida && (
              <>
                <div>
                  <FieldLabel>Valor do ITBI</FieldLabel>
                  <MoneyInput value={value.financeiro.valor_itbi ?? null}
                    onChange={(n) => set("financeiro", { valor_itbi: n })} />
                </div>
                <div>
                  <FieldLabel>Data de emissão da guia ITBI</FieldLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-normal", !dataItbi && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataItbi ? format(dataItbi, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={dataItbi ?? undefined}
                        onSelect={(d) => set("financeiro", { data_emissao_itbi: d ? format(d, "yyyy-MM-dd") : null })}
                        className="pointer-events-auto p-3" />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </FormSection>
      )}

      {/* Sistemas e Controle */}
      <FormSection title="Sistemas e Controle" id="section-sistemas_controle">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <FieldLabel>Imobiliária</FieldLabel>
            <Input value={value.sistemas_controle.imobiliaria ?? ""}
              onChange={(e) => set("sistemas_controle", { imobiliaria: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Link Google Drive</FieldLabel>
            <div className="flex gap-2">
              <Input type="url" placeholder="https://..." value={value.sistemas_controle.link_drive ?? ""}
                onChange={(e) => set("sistemas_controle", { link_drive: e.target.value })} />
              {value.sistemas_controle.link_drive && (
                <Button type="button" variant="outline" size="icon" asChild>
                  <a href={value.sistemas_controle.link_drive} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div>
            <FieldLabel>Protocolo SAEC</FieldLabel>
            <Input value={value.sistemas_controle.protocolo_saec ?? ""}
              onChange={(e) => set("sistemas_controle", { protocolo_saec: e.target.value })} />
          </div>
        </div>
      </FormSection>
    </div>
  );
}
