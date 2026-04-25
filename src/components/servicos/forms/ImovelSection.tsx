import { Input } from "@/components/ui/input";
import { FormSection, FieldLabel } from "../FormSection";
import type { ImovelFields } from "@/lib/serviceFields";

interface Props {
  value: ImovelFields;
  onChange: (partial: Partial<ImovelFields>) => void;
  /** Title shown in the section header. */
  title?: string;
}

/**
 * Seção padronizada de "Dados do Imóvel".
 * Layout (responsivo, 6 colunas em md+):
 *   L1: Inscrição IPTU (2) | Matrícula (2) | Ofício (2)
 *   L2: Comarca/Estado (4) | CEP (2)
 *   L3: Endereço (logradouro) (6)
 *   L4: Número (2) | Complemento (4)
 *   L5: Bairro (3) | Cidade (2) | Estado (1)
 */
export function ImovelSection({ value, onChange, title = "Dados do Imóvel" }: Props) {
  return (
    <FormSection title={title} id="section-imovel">
      <div className="grid gap-4 md:grid-cols-6">
        {/* Linha 1 — Identificação */}
        <div className="md:col-span-2">
          <FieldLabel>Inscrição de IPTU</FieldLabel>
          <Input
            value={value.inscricao_iptu ?? ""}
            onChange={(e) => onChange({ inscricao_iptu: e.target.value })}
            placeholder="Ex.: 01.02.030.0040.001"
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel required>Matrícula do Imóvel</FieldLabel>
          <Input
            value={value.matricula ?? ""}
            onChange={(e) => onChange({ matricula: e.target.value })}
            placeholder="Nº da matrícula"
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel required>Ofício</FieldLabel>
          <Input
            value={value.oficio ?? ""}
            onChange={(e) => onChange({ oficio: e.target.value })}
            placeholder="Ex.: 1º Ofício de Registro de Imóveis"
          />
        </div>

        {/* Linha 2 — Localização cartorial */}
        <div className="md:col-span-4">
          <FieldLabel required>Comarca / Estado</FieldLabel>
          <Input
            value={value.comarca_estado ?? ""}
            onChange={(e) => onChange({ comarca_estado: e.target.value })}
            placeholder="Ex.: Juiz de Fora / MG"
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel>CEP</FieldLabel>
          <Input
            value={value.cep ?? ""}
            onChange={(e) => onChange({ cep: e.target.value })}
            placeholder="00000-000"
          />
        </div>

        {/* Linha 3 — Endereço */}
        <div className="md:col-span-6">
          <FieldLabel required>Endereço (rua / avenida)</FieldLabel>
          <Input
            value={value.endereco_logradouro ?? ""}
            onChange={(e) => onChange({ endereco_logradouro: e.target.value })}
            placeholder="Ex.: Rua Halfeld"
          />
        </div>

        {/* Linha 4 — Número e complemento */}
        <div className="md:col-span-2">
          <FieldLabel required>Número</FieldLabel>
          <Input
            value={value.numero ?? ""}
            onChange={(e) => onChange({ numero: e.target.value })}
            placeholder="Ex.: 1234"
          />
        </div>
        <div className="md:col-span-4">
          <FieldLabel>Complemento</FieldLabel>
          <Input
            value={value.complemento ?? ""}
            onChange={(e) => onChange({ complemento: e.target.value })}
            placeholder="Ex.: Apto 302, Bloco B"
          />
        </div>

        {/* Linha 5 — Bairro / Cidade / Estado */}
        <div className="md:col-span-3">
          <FieldLabel required>Bairro</FieldLabel>
          <Input
            value={value.bairro ?? ""}
            onChange={(e) => onChange({ bairro: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <FieldLabel required>Cidade</FieldLabel>
          <Input
            value={value.cidade ?? ""}
            onChange={(e) => onChange({ cidade: e.target.value })}
          />
        </div>
        <div className="md:col-span-1">
          <FieldLabel required>Estado</FieldLabel>
          <Input
            value={value.estado ?? ""}
            onChange={(e) =>
              onChange({ estado: e.target.value.toUpperCase().slice(0, 2) })
            }
            placeholder="UF"
            maxLength={2}
          />
        </div>
      </div>
    </FormSection>
  );
}