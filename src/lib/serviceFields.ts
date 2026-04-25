// Definitions of custom-field schema and helpers per service type.
import type { ServiceType } from "@/lib/serviceUi";

// All custom fields are stored under custom_fields jsonb, grouped by section.

export interface EscrituraFields {
  partes_envolvidas: {
    compradora?: string;
    vendedora?: string;
    corretor?: string;
    contato_corretor?: string;
    telefone_vendedor?: string;
    email_comprador?: string;
    email_vendedor?: string;
    multiplos_compradores?: string;
  };
  documentacao: {
    certidoes_estado_civil?: boolean;
    certidoes_internet?: boolean;
    cndi?: boolean;
    docs_compradora?: boolean;
    docs_vendedora?: boolean;
    docs_imovel?: boolean;
    observacoes?: string;
  };
  imovel: ImovelFields;
  processo_contrato: {
    contrato_compra_venda?: boolean;
    tera_contrato_declarado?: "sim" | "nao" | "";
    tera_interveniencia?: "sim" | "nao" | "";
    valor_interveniencia?: number | null;
  };
  escritura: {
    cartorio_notas?: string;
    tipo_escritura?: string;
    observacoes?: string;
  };
  financeiro: {
    valor_compra?: number | null;
    guia_itbi_emitida?: boolean;
    valor_itbi?: number | null;
    data_emissao_itbi?: string | null;
    valor_emolumentos?: number | null;
  };
  sistemas_controle: {
    imobiliaria?: string;
    link_drive?: string;
    protocolo_saec?: string;
  };
}

export interface AvulsoFields {
  partes_envolvidas: {
    proprietario?: string;
    solicitante?: string;
    email_proprietario?: string;
    email_solicitante?: string;
    telefone_solicitante?: string;
  };
  imovel: ImovelFields;
  descricao_servico: {
    o_que_precisa?: string;
    documentos_disponiveis?: string;
  };
}

export interface RegularizacaoFields {
  partes_envolvidas: {
    proprietario?: string;
    solicitante?: string;
    email_proprietario?: string;
    email_solicitante?: string;
    telefone_solicitante?: string;
  };
  imovel: ImovelFields;
  situacao_pendencias: {
    situacao_atual?: string;
    pendencias?: string;
    orgaos_envolvidos?: string[];
  };
}

export type AnyCustomFields = EscrituraFields | AvulsoFields | RegularizacaoFields;

/** Estrutura padronizada de dados do imóvel.
 *  - matricula / oficio / comarca_estado: identificação cartorial
 *  - endereço dividido em campos para validação e integração futura
 *  - campos legados (endereco / numero_matricula) mantidos opcionais apenas
 *    para retrocompatibilidade de leitura; não são mais escritos pela UI.
 */
export interface ImovelFields {
  // Identificação
  inscricao_iptu?: string;
  matricula?: string;
  oficio?: string;
  comarca_estado?: string;
  // Endereço estruturado
  cep?: string;
  endereco_logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  // Legado (somente leitura, não mais editado)
  endereco?: string;
  numero_matricula?: string;
}

export const TIPO_ESCRITURA_OPTIONS = [
  "Compra e Venda",
  "Compra e Venda com financiamento",
  "Compra e Venda com alienação fiduciária",
  "Doação",
  "Doação com usufruto",
  "Permuta",
  "Dação em pagamento",
  "Inventário / Partilha",
  "Divórcio / Separação",
  "Outros",
] as const;

export const ORGAOS_REGULARIZACAO = [
  "Prefeitura Municipal",
  "Cartório de Registro de Imóveis",
  "Receita Federal",
  "CRECI",
  "INSS",
  "Corpo de Bombeiros",
  "Meio Ambiente",
  "Outros",
] as const;

// ---------- Defaults ----------
export function emptyEscritura(): EscrituraFields {
  return {
    partes_envolvidas: {},
    documentacao: {},
    imovel: {},
    processo_contrato: { tera_contrato_declarado: "", tera_interveniencia: "" },
    escritura: {},
    financeiro: {},
    sistemas_controle: {},
  };
}
export function emptyAvulso(): AvulsoFields {
  return { partes_envolvidas: {}, imovel: {}, descricao_servico: {} };
}
export function emptyRegularizacao(): RegularizacaoFields {
  return {
    partes_envolvidas: {},
    imovel: {},
    situacao_pendencias: { orgaos_envolvidos: [] },
  };
}

export function emptyForType(type: ServiceType): AnyCustomFields {
  if (type === "escritura") return emptyEscritura();
  if (type === "avulso") return emptyAvulso();
  return emptyRegularizacao();
}

// ---------- Completeness ----------
// Each section returns ratio (0-1) of "filled" fields.
function ratio(values: unknown[]): number {
  const filled = values.filter((v) => {
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "boolean") return v === true;
    if (typeof v === "number") return !Number.isNaN(v);
    if (Array.isArray(v)) return v.length > 0;
    return true;
  }).length;
  return values.length === 0 ? 0 : filled / values.length;
}

export interface SectionProgress {
  key: string;
  label: string;
  ratio: number; // 0-1
}

export function computeProgress(type: ServiceType, cf: AnyCustomFields): SectionProgress[] {
  if (type === "escritura") {
    const f = cf as EscrituraFields;
    return [
      {
        key: "partes_envolvidas", label: "Partes Envolvidas",
        ratio: ratio([
          f.partes_envolvidas.compradora, f.partes_envolvidas.vendedora,
          f.partes_envolvidas.corretor, f.partes_envolvidas.contato_corretor,
          f.partes_envolvidas.telefone_vendedor, f.partes_envolvidas.email_comprador,
          f.partes_envolvidas.email_vendedor,
        ]),
      },
      {
        key: "documentacao", label: "Documentação",
        ratio: ratio([
          f.documentacao.certidoes_estado_civil, f.documentacao.certidoes_internet,
          f.documentacao.cndi, f.documentacao.docs_compradora,
          f.documentacao.docs_vendedora, f.documentacao.docs_imovel,
        ]),
      },
      {
        key: "imovel", label: "Imóvel",
        ratio: ratio([
          f.imovel.inscricao_iptu, f.imovel.matricula, f.imovel.oficio,
          f.imovel.comarca_estado, f.imovel.endereco_logradouro,
          f.imovel.numero, f.imovel.bairro, f.imovel.cidade, f.imovel.estado,
        ]),
      },
      {
        key: "processo_contrato", label: "Processo e Contrato",
        ratio: ratio([
          f.processo_contrato.contrato_compra_venda,
          f.processo_contrato.tera_contrato_declarado,
          f.processo_contrato.tera_interveniencia,
        ]),
      },
      {
        key: "escritura", label: "Escritura",
        ratio: ratio([f.escritura.cartorio_notas, f.escritura.tipo_escritura]),
      },
      {
        key: "financeiro", label: "Financeiro",
        ratio: ratio([
          f.financeiro.valor_compra, f.financeiro.guia_itbi_emitida,
          f.financeiro.valor_emolumentos,
        ]),
      },
      {
        key: "sistemas_controle", label: "Sistemas e Controle",
        ratio: ratio([
          f.sistemas_controle.imobiliaria, f.sistemas_controle.link_drive,
          f.sistemas_controle.protocolo_saec,
        ]),
      },
    ];
  }
  if (type === "avulso") {
    const f = cf as AvulsoFields;
    return [
      {
        key: "partes_envolvidas", label: "Partes Envolvidas",
        ratio: ratio([
          f.partes_envolvidas.proprietario, f.partes_envolvidas.solicitante,
          f.partes_envolvidas.email_proprietario, f.partes_envolvidas.email_solicitante,
          f.partes_envolvidas.telefone_solicitante,
        ]),
      },
      {
        key: "imovel", label: "Imóvel",
        ratio: ratio([
          f.imovel.inscricao_iptu, f.imovel.matricula, f.imovel.oficio,
          f.imovel.comarca_estado, f.imovel.endereco_logradouro,
          f.imovel.numero, f.imovel.bairro, f.imovel.cidade, f.imovel.estado,
        ]),
      },
      {
        key: "descricao_servico", label: "Descrição do Serviço",
        ratio: ratio([f.descricao_servico.o_que_precisa, f.descricao_servico.documentos_disponiveis]),
      },
    ];
  }
  // regularizacao
  const f = cf as RegularizacaoFields;
  return [
    {
      key: "partes_envolvidas", label: "Partes Envolvidas",
      ratio: ratio([
        f.partes_envolvidas.proprietario, f.partes_envolvidas.solicitante,
        f.partes_envolvidas.email_proprietario, f.partes_envolvidas.email_solicitante,
        f.partes_envolvidas.telefone_solicitante,
      ]),
    },
    {
      key: "imovel", label: "Imóvel",
      ratio: ratio([
        f.imovel.inscricao_iptu, f.imovel.matricula, f.imovel.oficio,
        f.imovel.comarca_estado, f.imovel.endereco_logradouro,
        f.imovel.numero, f.imovel.bairro, f.imovel.cidade, f.imovel.estado,
      ]),
    },
    {
      key: "situacao_pendencias", label: "Situação e Pendências",
      ratio: ratio([
        f.situacao_pendencias.situacao_atual,
        f.situacao_pendencias.pendencias,
        f.situacao_pendencias.orgaos_envolvidos,
      ]),
    },
  ];
}

export function overallProgress(sections: SectionProgress[]): number {
  if (!sections.length) return 0;
  const sum = sections.reduce((a, s) => a + s.ratio, 0);
  return Math.round((sum / sections.length) * 100);
}
