import { Check, ExternalLink } from "lucide-react";
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
import { type EscrituraFields, TIPO_ESCRITURA_OPTIONS } from "@/lib/serviceFields";
import { usePermissions } from "@/hooks/usePermissions";

interface Props {
  value: EscrituraFields;
  onChange: (v: EscrituraFields) => void;
}

const docItems: { key: keyof EscrituraFields["documentacao"]; label: string }[] = [
  { key: "certidoes_estado_civil", label: "Certidões de Estado Civil / Simplificada" },
  { key: "certidoes_internet", label: "Certidões Internet" },
  { key: "cndi", label: "CNDI (Certidão Negativa de Débitos Imobiliários)" },
  { key: "docs_compradora", label: "Documentos da parte compradora" },
  { key: "docs_vendedora", label: "Documentos da parte vendedora" },
  { key: "docs_imovel", label: "Documentos do imóvel" },
];

export function EscrituraForm({ value, onChange }: Props) {
  const { can } = usePermissions();
  const canSeeFinancial = can("view_service_financial");
  const set = <K extends keyof EscrituraFields>(section: K, partial: Partial<EscrituraFields[K]>) => {
    onChange({ ...value, [section]: { ...value[section], ...partial } });
  };

  const showInterveniencia = value.processo_contrato.tera_interveniencia === "sim";
  const showItbi = !!value.documentacao;
  const itbiEmitida = !!value.financeiro.guia_itbi_emitida;

  const dataItbi = value.financeiro.data_emissao_itbi
    ? new Date(value.financeiro.data_emissao_itbi) : null;

  return (
    <div className="space-y-5">
      {/* Partes Envolvidas */}
      <FormSection title="Partes Envolvidas" id="section-partes_envolvidas">
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
          <div />
          <div>
            <FieldLabel>E-mail comprador</FieldLabel>
            <Input type="email" value={value.partes_envolvidas.email_comprador ?? ""}
              onChange={(e) => set("partes_envolvidas", { email_comprador: e.target.value })} />
          </div>
          <div>
            <FieldLabel>E-mail vendedor</FieldLabel>
            <Input type="email" value={value.partes_envolvidas.email_vendedor ?? ""}
              onChange={(e) => set("partes_envolvidas", { email_vendedor: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Se houver mais de um comprador, informar</FieldLabel>
            <Textarea rows={2} value={value.partes_envolvidas.multiplos_compradores ?? ""}
              onChange={(e) => set("partes_envolvidas", { multiplos_compradores: e.target.value })} />
          </div>
        </div>
      </FormSection>

      {/* Documentação */}
      <FormSection title="Documentação" id="section-documentacao">
        <div className="grid gap-3 md:grid-cols-2">
          {docItems.map((item) => {
            const checked = !!value.documentacao[item.key];
            return (
              <label key={item.key as string} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40">
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => set("documentacao", { [item.key]: !!v } as Partial<EscrituraFields["documentacao"]>)}
                />
                <span className="flex-1">{item.label}</span>
                {checked && <Check className="h-4 w-4 text-success" />}
              </label>
            );
          })}
        </div>
        <div className="mt-4">
          <FieldLabel>Observações sobre a documentação</FieldLabel>
          <Textarea rows={2} value={value.documentacao.observacoes ?? ""}
            onChange={(e) => set("documentacao", { observacoes: e.target.value })} />
        </div>
      </FormSection>

      {/* Imóvel */}
      <FormSection title="Imóvel" id="section-imovel">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <FieldLabel>Inscrição de IPTU</FieldLabel>
            <Input value={value.imovel.inscricao_iptu ?? ""}
              onChange={(e) => set("imovel", { inscricao_iptu: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Matrícula (cartório/ofício)</FieldLabel>
            <Input value={value.imovel.matricula ?? ""}
              onChange={(e) => set("imovel", { matricula: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Nº da matrícula</FieldLabel>
            <Input value={value.imovel.numero_matricula ?? ""}
              onChange={(e) => set("imovel", { numero_matricula: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <FieldLabel>Endereço completo do imóvel</FieldLabel>
            <Textarea rows={2} value={value.imovel.endereco ?? ""}
              onChange={(e) => set("imovel", { endereco: e.target.value })} />
          </div>
        </div>
      </FormSection>

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
                Guia de ITBI emitida
              </label>
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
