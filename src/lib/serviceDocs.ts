// Constants and helpers for the new detailed Escritura documentation system.
import type { Database } from "@/integrations/supabase/types";

export type PartyRole = Database["public"]["Enums"]["party_role"];
export type PartyPersonType = Database["public"]["Enums"]["party_person_type"];
export type SignatureMode = Database["public"]["Enums"]["signature_mode"];
export type CivilCertificateType = Database["public"]["Enums"]["civil_certificate_type"];
export type CivilCertificateStatus = Database["public"]["Enums"]["civil_certificate_status"];
export type InternetCertificateType = Database["public"]["Enums"]["internet_certificate_type"];
export type InternetCertificateStatus = Database["public"]["Enums"]["internet_certificate_status"];
export type ItbiStatus = Database["public"]["Enums"]["itbi_status"];
export type PropertyRegistrationType = Database["public"]["Enums"]["property_registration_type"];
export type PropertyRegistrationStatus = Database["public"]["Enums"]["property_registration_status"];

export type ServiceParty = Database["public"]["Tables"]["service_parties"]["Row"];
export type CivilCertificate = Database["public"]["Tables"]["service_civil_certificates"]["Row"];
export type InternetCertificate = Database["public"]["Tables"]["service_internet_certificates"]["Row"];
export type PropertyItbi = Database["public"]["Tables"]["service_property_itbi"]["Row"];
export type PropertyRegistration = Database["public"]["Tables"]["service_property_registration"]["Row"];

// ---------- Labels ----------
export const PARTY_ROLE_LABEL: Record<PartyRole, string> = {
  comprador: "Comprador",
  vendedor: "Vendedor",
  socio_comprador: "Sócio Comprador",
  socio_vendedor: "Sócio Vendedor",
  outorgante: "Outorgante",
  outorgado: "Outorgado",
  interveniente: "Interveniente",
  outros: "Outros",
};

export const PARTY_ROLE_BADGE: Record<PartyRole, string> = {
  comprador: "bg-success/15 text-success",
  vendedor: "bg-warning/15 text-warning",
  socio_comprador: "bg-success/10 text-success/90",
  socio_vendedor: "bg-warning/10 text-warning/90",
  outorgante: "bg-accent/15 text-foreground",
  outorgado: "bg-accent/15 text-foreground",
  interveniente: "bg-muted text-foreground",
  outros: "bg-muted text-muted-foreground",
};

export const SIGNATURE_MODE_LABEL: Record<SignatureMode, string> = {
  online: "Online",
  presencial: "Presencial",
  hibrida: "Híbrida",
};

export const MARITAL_STATUS_OPTIONS = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União estável",
  "Separado(a)",
] as const;

export const BR_STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR",
  "PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
] as const;

// ---------- Civil certificates ----------
export const CIVIL_CERT_LABEL: Record<CivilCertificateType, string> = {
  estado_civil: "Certidão de Estado Civil",
  simplificada_junta: "Certidão Simplificada da Junta",
  contrato_social: "Contrato Social",
  alteracao_consolidada: "Alteração Consolidada",
  ultima_alteracao: "Última Alteração Contratual",
};

export const CIVIL_CERT_FOR_PF: CivilCertificateType[] = ["estado_civil"];
export const CIVIL_CERT_FOR_PJ: CivilCertificateType[] = [
  "simplificada_junta",
  "contrato_social",
  "alteracao_consolidada",
  "ultima_alteracao",
];

export const CIVIL_STATUS_LABEL: Record<CivilCertificateStatus, string> = {
  pendente: "Pendente",
  solicitada: "Solicitada",
  emitida: "Emitida",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

// ---------- Internet certificates ----------
export interface InternetCertConfig {
  type: InternetCertificateType;
  label: string;
  shortLabel: string;
  description: string;
  url: string;
}

export const INTERNET_CERT_DEFAULTS: InternetCertConfig[] = [
  {
    type: "tjmg_civel",
    label: "TJMG",
    shortLabel: "TJMG",
    description: "Ações Cíveis (Normal e JESP)",
    url: "https://rupe.tjmg.jus.br/rupe/justica/publico/certidoes/criarSolicitacaoCertidao.rupe?solicitacaoPublica=true",
  },
  {
    type: "trf6_fisico",
    label: "TRF6 Físico",
    shortLabel: "TRF6 Físico",
    description: "Ações Federais (Processo Físico)",
    url: "https://sistemas.trf6.jus.br/certidao/#/solicitacao",
  },
  {
    type: "trf6_eproc",
    label: "TRF6 eProc",
    shortLabel: "TRF6 eProc",
    description: "Ações Federais (eProc)",
    url: "https://portal.trf6.jus.br/certidao-online7/",
  },
  {
    type: "tst",
    label: "TST",
    shortLabel: "TST",
    description: "Ações Trabalhistas (Nacional)",
    url: "https://www.tst.jus.br/certidao1",
  },
  {
    type: "trt3",
    label: "TRT3",
    shortLabel: "TRT3",
    description: "Ações Trabalhistas (MG)",
    url: "https://certidao.trt3.jus.br/certidao/feitosTrabalhistas/aba1.emissao.htm",
  },
  {
    type: "receita_federal",
    label: "Receita Federal",
    shortLabel: "Receita Federal",
    description: "Débitos Conjuntos (RFB)",
    url: "https://servicos.receitafederal.gov.br/servico/certidoes/#/home",
  },
];

export const INTERNET_STATUS_LABEL: Record<InternetCertificateStatus, string> = {
  pendente: "Pendente",
  solicitada: "Solicitada",
  emitida: "Emitida",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

// ---------- ITBI ----------
export const ITBI_STATUS_LABEL: Record<ItbiStatus, string> = {
  nao_iniciado: "Não iniciado",
  protocolado: "Protocolado",
  pendente_doc: "Pendente de documento",
  emitido: "Emitido",
};

// ---------- Property registration ----------
export const PROP_REG_TYPE_LABEL: Record<PropertyRegistrationType, string> = {
  inteiro_teor: "Inteiro Teor",
  onus_reais: "Ônus Reais",
  transcricao: "Transcrição",
  somente_onus_reais: "Somente Ônus Reais",
};

export const PROP_REG_STATUS_LABEL: Record<PropertyRegistrationStatus, string> = {
  pendente: "Pendente",
  solicitada: "Solicitada",
  liberada: "Liberada",
  vencida: "Vencida",
};

// ---------- Validity helpers ----------
export interface ValidityInfo {
  daysRemaining: number | null;
  isExpired: boolean;
  level: "ok" | "warn" | "soon" | "expired" | "none";
  badgeClass: string;
  label: string;
}

export function computeValidity(expirationDate: string | null | undefined): ValidityInfo {
  if (!expirationDate) {
    return { daysRemaining: null, isExpired: false, level: "none", badgeClass: "bg-muted text-muted-foreground", label: "—" };
  }
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(expirationDate); exp.setHours(0, 0, 0, 0);
  const diff = Math.floor((exp.getTime() - today.getTime()) / 86400000);

  if (diff < 0) {
    return {
      daysRemaining: diff,
      isExpired: true,
      level: "expired",
      badgeClass: "bg-destructive/15 text-destructive border border-destructive/30",
      label: `Vencida há ${Math.abs(diff)} dia${Math.abs(diff) === 1 ? "" : "s"}`,
    };
  }
  if (diff <= 7) {
    return {
      daysRemaining: diff,
      isExpired: false,
      level: "soon",
      badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30",
      label: `Vence em ${diff} dia${diff === 1 ? "" : "s"}`,
    };
  }
  if (diff <= 30) {
    return {
      daysRemaining: diff,
      isExpired: false,
      level: "warn",
      badgeClass: "bg-warning/15 text-warning border border-warning/30",
      label: `${diff} dias restantes`,
    };
  }
  return {
    daysRemaining: diff,
    isExpired: false,
    level: "ok",
    badgeClass: "bg-success/15 text-success border border-success/30",
    label: `${diff} dias restantes`,
  };
}

// ---------- Doc progress aggregation ----------
export interface DocProgress {
  partiesCount: number;
  perPartyCivil: Array<{
    partyId: string;
    partyName: string;
    role: PartyRole;
    personType: PartyPersonType;
    issuedCount: number;
    totalNeeded: number; // baseline expectation = 1 for PF, 3 for PJ
    hasExpiringSoon: boolean;
    hasExpired: boolean;
  }>;
  internet: {
    issuedCount: number;
    totalConfigured: number;
    perCert: Array<{
      type: InternetCertificateType;
      label: string;
      hasRecord: boolean;
      status: InternetCertificateStatus | null;
      validity: ValidityInfo;
    }>;
  };
  itbi: {
    isIssued: boolean;
    status: ItbiStatus | null;
  };
  registration: {
    hasRecord: boolean;
    status: PropertyRegistrationStatus | null;
    validity: ValidityInfo;
  };
  overallPercent: number;
}

export function computeDocProgress(input: {
  parties: ServiceParty[];
  civilCerts: CivilCertificate[];
  internetCerts: InternetCertificate[];
  itbi: PropertyItbi | null;
  registration: PropertyRegistration | null;
}): DocProgress {
  const { parties, civilCerts, internetCerts, itbi, registration } = input;

  const perPartyCivil = parties.map((p) => {
    const partyCerts = civilCerts.filter((c) => c.party_id === p.id);
    const totalNeeded = p.person_type === "PF" ? 1 : 3;
    const issuedCount = partyCerts.filter((c) => c.status === "emitida").length;
    const hasExpiringSoon = partyCerts.some((c) => {
      const v = computeValidity(c.expiration_date);
      return v.level === "soon" || v.level === "warn";
    });
    const hasExpired = partyCerts.some((c) => c.status === "vencida" || computeValidity(c.expiration_date).isExpired);
    return {
      partyId: p.id,
      partyName: p.name,
      role: p.role,
      personType: p.person_type,
      issuedCount,
      totalNeeded,
      hasExpiringSoon,
      hasExpired,
    };
  });

  const perCert = INTERNET_CERT_DEFAULTS.map((cfg) => {
    const rec = internetCerts.find((c) => c.certificate_type === cfg.type);
    return {
      type: cfg.type,
      label: cfg.shortLabel,
      hasRecord: !!rec,
      status: rec?.status ?? null,
      validity: computeValidity(rec?.expected_validity_date ?? null),
    };
  });
  const internetIssued = perCert.filter((c) => c.status === "emitida").length;

  // Overall: parties present + each civil party complete + each internet cert + itbi + registration
  const buckets: number[] = [];
  buckets.push(parties.length > 0 ? 1 : 0);
  if (parties.length > 0) {
    perPartyCivil.forEach((p) => {
      buckets.push(Math.min(1, p.issuedCount / Math.max(1, p.totalNeeded)));
    });
  }
  perCert.forEach((c) => buckets.push(c.status === "emitida" ? 1 : 0));
  buckets.push(itbi?.is_issued ? 1 : 0);
  buckets.push(registration?.is_released ? 1 : 0);

  const sum = buckets.reduce((a, b) => a + b, 0);
  const overallPercent = buckets.length === 0 ? 0 : Math.round((sum / buckets.length) * 100);

  return {
    partiesCount: parties.length,
    perPartyCivil,
    internet: {
      issuedCount: internetIssued,
      totalConfigured: internetCerts.length,
      perCert,
    },
    itbi: { isIssued: !!itbi?.is_issued, status: itbi?.status ?? null },
    registration: {
      hasRecord: !!registration,
      status: registration?.status ?? null,
      validity: computeValidity(registration?.expiration_date ?? null),
    },
    overallPercent,
  };
}

// ---------- Card-level alerts (for Kanban/List) ----------
export interface DocAlerts {
  hasExpired: boolean;
  expiringSoon: boolean;
  incomplete: boolean;
  complete: boolean;
}
