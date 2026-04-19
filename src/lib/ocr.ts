import { supabase } from "@/integrations/supabase/client";

export type OcrDocumentType =
  | "rg" | "cpf" | "cnh" | "comprovante_residencia"
  | "contrato_social" | "certidao_junta" | "alteracao_contratual"
  | "certidao_tjmg" | "certidao_trf6_fisico" | "certidao_trf6_eproc"
  | "certidao_tst" | "certidao_trt3" | "certidao_receita_federal"
  | "certidao_estado_civil" | "matricula_imovel" | "guia_itbi" | "outro";

export type Confidence = "high" | "medium" | "low" | "none";

export interface OcrResult<T = Record<string, unknown>> {
  ok: boolean;
  log_id?: string | null;
  status?: "completed" | "partial" | "failed";
  error?: string | null;
  extracted?: T;
  confidence_scores?: Record<string, Confidence>;
  processing_time_ms?: number;
  tokens?: { prompt: number; response: number };
}

export const DOCUMENT_TYPE_LABELS: Record<OcrDocumentType, string> = {
  rg: "RG",
  cpf: "CPF",
  cnh: "CNH",
  comprovante_residencia: "Comprovante de residência",
  contrato_social: "Contrato social",
  alteracao_contratual: "Alteração contratual",
  certidao_junta: "Certidão da Junta Comercial",
  certidao_tjmg: "Certidão TJMG",
  certidao_trf6_fisico: "Certidão TRF6 (físico)",
  certidao_trf6_eproc: "Certidão TRF6 (e-Proc)",
  certidao_tst: "Certidão TST",
  certidao_trt3: "Certidão TRT3",
  certidao_receita_federal: "Certidão Receita Federal",
  certidao_estado_civil: "Certidão de estado civil",
  matricula_imovel: "Matrícula do imóvel",
  guia_itbi: "Guia ITBI",
  outro: "Outro",
};

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // remove "data:<mime>;base64,"
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function callOcr<T = Record<string, unknown>>(
  action: "test_connection" | "test_extraction" | "extract_document" | "validate_extraction",
  params: Record<string, unknown> = {},
): Promise<OcrResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke("gemini-ocr-processor", {
      body: { action, params },
    });
    if (error) return { ok: false, error: error.message };
    return data as OcrResult<T>;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro" };
  }
}

export function confidenceColor(c: Confidence): string {
  switch (c) {
    case "high": return "text-success";
    case "medium": return "text-warning";
    case "low": return "text-destructive";
    default: return "text-muted-foreground";
  }
}

export function confidenceLabel(c: Confidence): string {
  switch (c) {
    case "high": return "Alta confiança";
    case "medium": return "Média — verificar";
    case "low": return "Baixa — revisar";
    default: return "Não encontrado";
  }
}
