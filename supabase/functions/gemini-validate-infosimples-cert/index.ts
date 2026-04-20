// gemini-validate-infosimples-cert
// Auditor cruzado: baixa o PDF emitido pela Infosimples do Drive,
// envia ao Gemini com prompt de validação e compara com o resultado declarado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const VALIDATION_PROMPT = `
Você é um auditor especialista em certidões jurídicas brasileiras.

Esta certidão foi emitida automaticamente por um serviço de automação (Infosimples).
Preciso que você valide cruzadamente os dados e o resultado.

Analise o documento PDF anexado e retorne **APENAS** um JSON válido com a seguinte estrutura:

{
  "tipo_certidao_detectado": "string descritiva (ex: TRF6 Cível e Criminal)",
  "orgao_emissor": "string",
  "nome_certificado": "string ou null",
  "cpf_cnpj_certificado": "string apenas dígitos ou null",
  "data_emissao": "YYYY-MM-DD ou null",
  "numero_protocolo": "string ou null",
  "resultado_detectado": "NEGATIVA | POSITIVA | POSITIVA_COM_EFEITO_NEGATIVA | INCONCLUSIVA",
  "justificativa_resultado": "string explicando por quê",
  "processos_encontrados_count": 0,
  "processos_detalhe": [],
  "documento_legitimo": true,
  "alertas_auditoria": [],
  "confianca_analise": "high | medium | low"
}

REGRAS:
1. Verifique se é um documento oficial: brasão da República, assinatura digital, QR Code, código de validação.
2. Em "documento_legitimo": true APENAS se houver elementos claros de autenticidade.
3. Seja rigoroso: prefira "INCONCLUSIVA" a chutar.
4. Em alertas_auditoria, liste qualquer suspeita: PDF não-oficial, dados ilegíveis, certidão expirada, etc.
5. Retorne APENAS o JSON, sem markdown, sem comentários.
`.trim();

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeParseJSON(text: string): any {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return { _raw: cleaned, _parse_error: true };
      }
    }
    return { _raw: cleaned, _parse_error: true };
  }
}

async function downloadDriveFile(driveFileId: string, authHeader: string) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/google-drive-manager`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "download_file",
      params: { drive_file_id: driveFileId },
    }),
  });
  if (!r.ok) throw new Error(`Drive download falhou: ${r.status}`);
  const json = await r.json();
  if (!json?.ok || !json?.result?.base64) throw new Error("PDF não baixado");
  return json.result as { base64: string; mime_type: string; file_name: string };
}

async function callGemini(base64: string, mimeType: string) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurado");
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: VALIDATION_PROMPT },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
  };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const r = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Gemini ${r.status}: ${txt.slice(0, 300)}`);
    }
    const json: any = await r.json();
    const text =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    return safeParseJSON(text);
  } finally {
    clearTimeout(timer);
  }
}

function expectedToGemini(expected: string): string {
  switch (expected) {
    case "negativa":
      return "NEGATIVA";
    case "positiva":
      return "POSITIVA";
    case "positiva_com_efeito_negativa":
      return "POSITIVA_COM_EFEITO_NEGATIVA";
    default:
      return "INCONCLUSIVA";
  }
}

async function notifyMismatch(
  sa: ReturnType<typeof createClient>,
  certificateId: string,
  expected: string,
  detected: string,
) {
  // Notifica admins
  const { data: admins } = await sa
    .from("user_roles")
    .select("user_id")
    .eq("role", "administrador");
  if (!admins) return;
  const rows = admins.map((a: any) => ({
    user_id: a.user_id,
    type: "warning" as const,
    title: "Divergência na validação Gemini de certidão",
    description: `Infosimples retornou ${expected.toUpperCase()}, Gemini detectou ${detected}. Revisão manual recomendada.`,
    link: "/servicos",
    related_entity_type: "internet_certificate",
    related_entity_id: certificateId,
  }));
  if (rows.length > 0) {
    await sa.from("notifications").insert(rows);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const sa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const certificateId: string = body.certificate_id;
    const driveFileId: string = body.drive_file_id;
    const expectedResult: string = body.expected_result ?? "inconclusiva";

    if (!certificateId || !driveFileId) {
      return jsonResponse({ ok: false, error: "certificate_id e drive_file_id obrigatórios" }, 400);
    }

    // baixa PDF
    const file = await downloadDriveFile(driveFileId, authHeader);

    // chama Gemini
    let geminiResult: any;
    try {
      geminiResult = await callGemini(file.base64, file.mime_type);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sa
        .from("service_internet_certificates")
        .update({
          gemini_validation_result: { error: msg },
          validation_status: "error",
        })
        .eq("id", certificateId);
      return jsonResponse({ ok: false, error: msg });
    }

    const detected = String(geminiResult?.resultado_detectado ?? "").toUpperCase();
    const expectedG = expectedToGemini(expectedResult);
    const isMismatch =
      detected &&
      expectedG &&
      detected !== expectedG &&
      detected !== "INCONCLUSIVA";

    const validationStatus = isMismatch
      ? "mismatch"
      : geminiResult?._parse_error
      ? "error"
      : "validated";

    await sa
      .from("service_internet_certificates")
      .update({
        gemini_validation_result: geminiResult,
        validation_status: validationStatus,
      })
      .eq("id", certificateId);

    if (isMismatch) {
      await notifyMismatch(sa, certificateId, expectedResult, detected);
    }

    return jsonResponse({
      ok: true,
      validation_status: validationStatus,
      detected,
      expected: expectedG,
      gemini_result: geminiResult,
    });
  } catch (e) {
    console.error("[gemini-validate-infosimples-cert] fatal", e);
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      500,
    );
  }
});
