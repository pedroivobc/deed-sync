import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { maskPhoneBR } from "@/lib/masks";
import { FormSection, FieldLabel } from "../FormSection";
import { ImovelSection } from "./ImovelSection";
import { type RegularizacaoFields, ORGAOS_REGULARIZACAO } from "@/lib/serviceFields";

interface Props {
  value: RegularizacaoFields;
  onChange: (v: RegularizacaoFields) => void;
}

export function RegularizacaoForm({ value, onChange }: Props) {
  const set = <K extends keyof RegularizacaoFields>(section: K, partial: Partial<RegularizacaoFields[K]>) =>
    onChange({ ...value, [section]: { ...value[section], ...partial } });

  const orgaos = value.situacao_pendencias.orgaos_envolvidos ?? [];
  const toggleOrgao = (o: string) => {
    const next = orgaos.includes(o) ? orgaos.filter((x) => x !== o) : [...orgaos, o];
    set("situacao_pendencias", { orgaos_envolvidos: next });
  };

  return (
    <div className="space-y-5">
      <FormSection title="Partes Envolvidas" id="section-partes_envolvidas">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Proprietário</FieldLabel>
            <Input value={value.partes_envolvidas.proprietario ?? ""}
              onChange={(e) => set("partes_envolvidas", { proprietario: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Solicitante</FieldLabel>
            <Input value={value.partes_envolvidas.solicitante ?? ""}
              onChange={(e) => set("partes_envolvidas", { solicitante: e.target.value })} />
          </div>
          <div>
            <FieldLabel>E-mail proprietário</FieldLabel>
            <Input type="email" value={value.partes_envolvidas.email_proprietario ?? ""}
              onChange={(e) => set("partes_envolvidas", { email_proprietario: e.target.value })} />
          </div>
          <div>
            <FieldLabel>E-mail solicitante</FieldLabel>
            <Input type="email" value={value.partes_envolvidas.email_solicitante ?? ""}
              onChange={(e) => set("partes_envolvidas", { email_solicitante: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <FieldLabel>Telefone do solicitante</FieldLabel>
            <Input value={value.partes_envolvidas.telefone_solicitante ?? ""}
              onChange={(e) => set("partes_envolvidas", { telefone_solicitante: maskPhoneBR(e.target.value) })}
              placeholder="(00) 00000-0000" />
          </div>
        </div>
      </FormSection>

      <ImovelSection
        value={value.imovel}
        onChange={(v) => set("imovel", v)}
      />

      <FormSection title="Situação Atual e Pendências" id="section-situacao_pendencias">
        <div className="grid gap-4">
          <div>
            <FieldLabel required>Descrição da situação atual do imóvel</FieldLabel>
            <Textarea rows={4} value={value.situacao_pendencias.situacao_atual ?? ""}
              onChange={(e) => set("situacao_pendencias", { situacao_atual: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Pendências identificadas</FieldLabel>
            <Textarea rows={3} value={value.situacao_pendencias.pendencias ?? ""}
              onChange={(e) => set("situacao_pendencias", { pendencias: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Órgãos envolvidos</FieldLabel>
            <div className="grid gap-2 md:grid-cols-2">
              {ORGAOS_REGULARIZACAO.map((o) => (
                <label key={o} className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted/40">
                  <Checkbox checked={orgaos.includes(o)} onCheckedChange={() => toggleOrgao(o)} />
                  <span>{o}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </FormSection>
    </div>
  );
}
