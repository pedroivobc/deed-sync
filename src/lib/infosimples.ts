import { supabase } from "@/integrations/supabase/client";

export type InfosimplesConsultationType =
  | "trf6_certidao"
  | "tst_cndt"
  | "trt3_ceat"
  | "receita_federal_pgfn"
  | "receita_federal_situacao";

export const INFOSIMPLES_PRICES_BRL: Record<InfosimplesConsultationType, number> = {
  trf6_certidao: 3.5,
  tst_cndt: 2.0,
  trt3_ceat: 2.5,
  receita_federal_pgfn: 2.5,
  receita_federal_situacao: 2.0,
};

export const INFOSIMPLES_LABELS: Record<InfosimplesConsultationType, string> = {
  trf6_certidao: "TRF6 — Cível/Criminal (Federal)",
  tst_cndt: "TST — CNDT (Trabalhistas)",
  trt3_ceat: "TRT3 — CEAT (MG)",
  receita_federal_pgfn: "Receita Federal — PGFN",
  receita_federal_situacao: "Receita Federal — Situação Fiscal",
};

export const ALL_AUTO_TYPES: InfosimplesConsultationType[] = [
  "trf6_certidao",
  "tst_cndt",
  "trt3_ceat",
  "receita_federal_pgfn",
  "receita_federal_situacao",
];

export interface InfosimplesResultItem {
  success: boolean;
  consultation_type: InfosimplesConsultationType;
  certificate_id?: string;
  classification?: "negativa" | "positiva" | "positiva_com_efeito_negativa" | "inconclusiva";
  protocol?: string | null;
  drive_file_id?: string;
  drive_url?: string | null;
  error?: string;
  api_code?: number;
}

export interface BatchResponse {
  ok: boolean;
  results: InfosimplesResultItem[];
  summary: {
    total: number;
    success: number;
    failed: number;
    positive_count: number;
  };
}

export interface SingleResponse {
  ok: boolean;
  result: InfosimplesResultItem;
  error?: string;
}

export async function requestSingleCertificate(params: {
  consultation_type: InfosimplesConsultationType;
  cpf_cnpj: string;
  service_id: string;
  party_id: string | null;
  person_type?: "PF" | "PJ";
}): Promise<SingleResponse> {
  const { data, error } = await supabase.functions.invoke("infosimples-cert-requester", {
    body: { action: "request_single_certificate", params },
  });
  if (error) return { ok: false, result: { success: false, consultation_type: params.consultation_type, error: error.message }, error: error.message };
  return data as SingleResponse;
}

export async function requestAllForParty(params: {
  service_id: string;
  party_id: string | null;
  cpf_cnpj: string;
  person_type: "PF" | "PJ";
  consultation_types?: InfosimplesConsultationType[];
}): Promise<BatchResponse> {
  const { data, error } = await supabase.functions.invoke("infosimples-cert-requester", {
    body: { action: "request_all_for_party", params },
  });
  if (error) {
    return {
      ok: false,
      results: [],
      summary: { total: 0, success: 0, failed: 0, positive_count: 0 },
    };
  }
  return data as BatchResponse;
}

export async function testInfosimplesConnection(): Promise<{ ok: boolean; account?: any; error?: string }> {
  const { data, error } = await supabase.functions.invoke("infosimples-cert-requester", {
    body: { action: "test_connection" },
  });
  if (error) return { ok: false, error: error.message };
  return data as { ok: boolean; account?: any; error?: string };
}

export function totalCost(types: InfosimplesConsultationType[]): number {
  return types.reduce((sum, t) => sum + (INFOSIMPLES_PRICES_BRL[t] ?? 0), 0);
}
