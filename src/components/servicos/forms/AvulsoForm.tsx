import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { maskPhoneBR } from "@/lib/masks";
import { FormSection, FieldLabel } from "../FormSection";
import type { AvulsoFields } from "@/lib/serviceFields";

interface Props {
  value: AvulsoFields;
  onChange: (v: AvulsoFields) => void;
}

export function AvulsoForm({ value, onChange }: Props) {
  const set = <K extends keyof AvulsoFields>(section: K, partial: Partial<AvulsoFields[K]>) =>
    onChange({ ...value, [section]: { ...value[section], ...partial } });

  return (
    <div className="space-y-5">
      <FormSection title="Partes Envolvidas">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Proprietário</FieldLabel>
            <Input value={value.partes_envolvidas.proprietario ?? ""}
              onChange={(e) => set("partes_envolvidas", { proprietario: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Solicitante</FieldLabel>
            <Input value={value.partes_envolvidas.solicitante ?? ""}
              onChange={(e) => set("partes_envolvidas", { solicitante: e.target.value })}
              placeholder="Quem solicitou (se diferente do proprietário)" />
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

      <FormSection title="Imóvel">
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <FieldLabel>Inscrição de IPTU</FieldLabel>
            <Input value={value.imovel.inscricao_iptu ?? ""}
              onChange={(e) => set("imovel", { inscricao_iptu: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Matrícula</FieldLabel>
            <Input value={value.imovel.matricula ?? ""}
              onChange={(e) => set("imovel", { matricula: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Nº da matrícula</FieldLabel>
            <Input value={value.imovel.numero_matricula ?? ""}
              onChange={(e) => set("imovel", { numero_matricula: e.target.value })} />
          </div>
          <div className="md:col-span-3">
            <FieldLabel>Endereço do imóvel</FieldLabel>
            <Textarea rows={2} value={value.imovel.endereco ?? ""}
              onChange={(e) => set("imovel", { endereco: e.target.value })} />
          </div>
        </div>
      </FormSection>

      <FormSection title="Descrição do Serviço">
        <div className="grid gap-4">
          <div>
            <FieldLabel required>O que precisa ser feito?</FieldLabel>
            <Textarea rows={4} value={value.descricao_servico.o_que_precisa ?? ""}
              onChange={(e) => set("descricao_servico", { o_que_precisa: e.target.value })} />
          </div>
          <div>
            <FieldLabel>Documentos já disponíveis?</FieldLabel>
            <Textarea rows={3} value={value.descricao_servico.documentos_disponiveis ?? ""}
              onChange={(e) => set("descricao_servico", { documentos_disponiveis: e.target.value })} />
          </div>
        </div>
      </FormSection>
    </div>
  );
}
