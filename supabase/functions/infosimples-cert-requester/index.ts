// infosimples-cert-requester
// Centraliza chamadas à API Infosimples para emissão automática de certidões.
// Faz upload do PDF retornado para o Google Drive (via google-drive-manager),
// classifica resultado, atualiza service_internet_certificates, registra
// auditoria em infosimples_requests e dispara validação Gemini em background.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const INFOSIMPLES_API_TOKEN = Deno.env.get("INFOSIMPLES_API_TOKEN");

const INFOSIMPLES_API_BASE = "https://api.infosimples.com/api/v2";

type ConsultationType =
  | "trf6_certidao"
  | "tst_cndt"
  | "trt3_ceat"
  | "receita_federal_pgfn"
  | "receita_federal_situacao";

const ENDPOINTS: Record<ConsultationType, string> = {
  trf6_certidao: "consultas/tribunal-trf6-certidao",
  tst_cndt: "consultas/tribunal-tst-cndt",
  trt3_ceat: "consultas/tribunal-trt3-ceat",
  receita_federal_pgfn: "consultas/receita-federal-pgfn",
  receita_federal_situacao: "consultas/receita-federal-situacao",
};

const PRICES_BRL: Record<ConsultationType, number> = {
  trf6_certidao: 3.5,
  tst_cndt: 2.0,
  trt3_ceat: 2.5,
  receita_federal_pgfn: 2.5,
  receita_federal_situacao: 2.0,
};

// Mapeamento consultation_type -> internet_certificate_type
const CONSULT_TO_CERT_TYPE: Record<ConsultationType, string> = {
  trf6_certidao: "trf6_fisico", // mesmo PDF vale para físico e eproc
  tst_cndt: "tst",
  trt3_ceat: "trt3",
  receita_federal_pgfn: "receita_federal",
  receita_federal_situacao: "receita_federal",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface CallResult {
  ok: boolean;
  status: number;
  body: any;
  error?: string;
}

async function callInfosimples(
  consultationType: ConsultationType,
  params: Record<string, unknown>,
): Promise<CallResult> {
  if (!INFOSIMPLES_API_TOKEN) {
    return { ok: false, status: 0, body: null, error: "INFOSIMPLES_API_TOKEN não configurado" };
  }
  const endpoint = ENDPOINTS[consultationType];
  const url = `${INFOSIMPLES_API_BASE}/${endpoint}`;
  const body = { token: INFOSIMPLES_API_TOKEN, timeout: 600, ...params };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8 * 60 * 1000); // 8min hard cap

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const json = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, body: json };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: null,
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
  }
}

function classifyResult(data: any): string {
  if (!data) return "inconclusiva";
  const text = JSON.stringify(data).toLowerCase();
  if (
    text.includes("nada consta") ||
    text.includes("não consta") ||
    text.includes("nao consta") ||
    /["']?status["']?\s*:\s*["']?negativa/i.test(text) ||
    /resultado["']?\s*:\s*["']?negativa/i.test(text)
  ) {
    return "negativa";
  }
  if (text.includes("positiva com efeito") || text.includes("efeito de negativa")) {
    return "positiva_com_efeito_negativa";
  }
  if (
    text.includes("positiva") ||
    text.includes("constam débitos") ||
    text.includes("constam debitos")
  ) {
    return "positiva";
  }
  return "inconclusiva";
}

function extractProtocol(data: any): string | null {
  if (!data) return null;
  return (
    data.numero_protocolo ||
    data.protocolo ||
    data.numero_certidao ||
    data.numero ||
    null
  );
}

function extractPdfBase64(body: any): string | null {
  if (!body) return null;
  const candidates = [
    body?.data?.[0]?.site_receipt,
    body?.site_receipts?.[0],
    body?.site_receipt,
    body?.data?.[0]?.pdf,
    body?.pdf,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 100 && !c.startsWith("http")) {
      // base64 puro
      return c.replace(/^data:[^,]+,/, "");
    }
  }
  // alguns retornos vêm como URL — baixa
  const urls: string[] = [];
  if (typeof body?.data?.[0]?.site_receipt === "string" && body.data[0].site_receipt.startsWith("http")) {
    urls.push(body.data[0].site_receipt);
  }
  if (Array.isArray(body?.site_receipts)) {
    for (const u of body.site_receipts) {
      if (typeof u === "string" && u.startsWith("http")) urls.push(u);
    }
  }
  // sinaliza para o caller fazer download
  if (urls.length > 0) {
    return `__URL__${urls[0]}`;
  }
  return null;
}

async function downloadAsBase64(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      bin += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    return btoa(bin);
  } catch {
    return null;
  }
}

interface UploadDriveResult {
  drive_file_id: string;
  web_view_link: string | null;
  file_size: number;
}

async function uploadPdfToDrive(args: {
  serviceId: string;
  certificateId: string;
  fileName: string;
  base64: string;
  authHeader: string;
}): Promise<UploadDriveResult> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/google-drive-manager`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: args.authHeader,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      action: "upload_file",
      params: {
        entity_type: "service",
        entity_id: args.serviceId,
        subfolder_type: "certidoes_internet",
        file_base64: args.base64,
        file_name: args.fileName,
        mime_type: "application/pdf",
        file_size: Math.floor((args.base64.length * 3) / 4),
        related_entity_type: "internet_certificate",
        related_entity_id: args.certificateId,
      },
    }),
  });
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Drive upload falhou: ${r.status} ${txt.slice(0, 200)}`);
  }
  const json = await r.json();
  if (!json?.ok || !json?.result?.drive_file_id) {
    throw new Error(`Drive upload sem id: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return {
    drive_file_id: json.result.drive_file_id,
    web_view_link: json.result.web_view_link ?? null,
    file_size: json.result.file_size ?? 0,
  };
}

async function bumpUsage(
  supabase: ReturnType<typeof createClient>,
  consultationType: ConsultationType,
  success: boolean,
) {
  const month = new Date();
  month.setUTCDate(1);
  const monthKey = month.toISOString().slice(0, 10);
  const cost = PRICES_BRL[consultationType];

  const { data: existing } = await supabase
    .from("infosimples_usage_stats")
    .select("*")
    .eq("month", monthKey)
    .maybeSingle();

  if (existing) {
    const byType = (existing.by_consultation_type ?? {}) as Record<string, number>;
    byType[consultationType] = (byType[consultationType] ?? 0) + 1;
    await supabase
      .from("infosimples_usage_stats")
      .update({
        total_requests: existing.total_requests + 1,
        successful_requests: existing.successful_requests + (success ? 1 : 0),
        failed_requests: existing.failed_requests + (success ? 0 : 1),
        estimated_cost_brl: Number(existing.estimated_cost_brl) + cost,
        by_consultation_type: byType,
      })
      .eq("month", monthKey);
  } else {
    await supabase.from("infosimples_usage_stats").insert({
      month: monthKey,
      total_requests: 1,
      successful_requests: success ? 1 : 0,
      failed_requests: success ? 0 : 1,
      estimated_cost_brl: cost,
      by_consultation_type: { [consultationType]: 1 },
    });
  }
}

async function triggerGeminiValidation(args: {
  certificateId: string;
  driveFileId: string;
  expectedResult: string;
  authHeader: string;
}) {
  // fire-and-forget
  fetch(`${SUPABASE_URL}/functions/v1/gemini-validate-infosimples-cert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: args.authHeader,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      certificate_id: args.certificateId,
      drive_file_id: args.driveFileId,
      expected_result: args.expectedResult,
    }),
  }).catch((e) => console.error("[gemini-validate] dispatch error", e));
}

interface ProcessParams {
  consultation_type: ConsultationType;
  cpf_cnpj: string;
  service_id: string;
  party_id: string | null;
  person_type?: "PF" | "PJ";
  user_id: string | null;
  auth_header: string;
}

async function processOneCertificate(params: ProcessParams) {
  const sa = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const startedAt = Date.now();

  // 1. Encontra/cria a certidão na tabela service_internet_certificates
  const certType = CONSULT_TO_CERT_TYPE[params.consultation_type];
  const today = new Date().toISOString().slice(0, 10);

  let certificateId: string;
  const { data: existingCert } = await sa
    .from("service_internet_certificates")
    .select("id")
    .eq("service_id", params.service_id)
    .eq("certificate_type", certType)
    .eq("party_id", params.party_id)
    .maybeSingle();

  if (existingCert) {
    certificateId = existingCert.id;
    await sa
      .from("service_internet_certificates")
      .update({ status: "solicitada", request_date: today, auto_emitted: true })
      .eq("id", certificateId);
  } else {
    const { data: newCert, error: certErr } = await sa
      .from("service_internet_certificates")
      .insert({
        service_id: params.service_id,
        party_id: params.party_id,
        certificate_type: certType,
        request_date: today,
        status: "solicitada",
        auto_emitted: true,
      })
      .select("id")
      .single();
    if (certErr || !newCert) {
      throw new Error(`Não foi possível criar registro de certidão: ${certErr?.message}`);
    }
    certificateId = newCert.id;
  }

  // 2. Cria log inicial
  const { data: logRow, error: logErr } = await sa
    .from("infosimples_requests")
    .insert({
      service_id: params.service_id,
      party_id: params.party_id,
      certificate_id: certificateId,
      consultation_type: params.consultation_type,
      request_params: { cpf_cnpj: params.cpf_cnpj, person_type: params.person_type },
      cost_estimated_brl: PRICES_BRL[params.consultation_type],
      status: "processing",
      created_by: params.user_id,
    })
    .select("id")
    .single();

  if (logErr || !logRow) {
    throw new Error(`Falha ao criar log: ${logErr?.message}`);
  }
  const logId = logRow.id;

  try {
    // 3. Chama Infosimples
    const cleanedDoc = params.cpf_cnpj.replace(/\D/g, "");
    const isCnpj = cleanedDoc.length === 14;
    const callParams: Record<string, unknown> = isCnpj
      ? { cnpj: cleanedDoc }
      : { cpf: cleanedDoc };

    const call = await callInfosimples(params.consultation_type, callParams);
    const apiCode = call.body?.code;

    if (!call.ok || (apiCode && apiCode !== 200)) {
      const msg = call.body?.code_message || call.error || `HTTP ${call.status}`;
      await sa
        .from("infosimples_requests")
        .update({
          status: "failed",
          response_status: call.status,
          response_body: call.body,
          error_message: msg,
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startedAt,
        })
        .eq("id", logId);
      await sa
        .from("service_internet_certificates")
        .update({ status: "pendente", infosimples_request_id: logId })
        .eq("id", certificateId);
      await bumpUsage(sa, params.consultation_type, false);
      return {
        success: false,
        consultation_type: params.consultation_type,
        certificate_id: certificateId,
        error: msg,
        api_code: apiCode,
      };
    }

    // 4. Extrai PDF
    let pdfBase64 = extractPdfBase64(call.body);
    if (pdfBase64 && pdfBase64.startsWith("__URL__")) {
      const url = pdfBase64.slice(7);
      pdfBase64 = await downloadAsBase64(url);
    }
    if (!pdfBase64) {
      const msg = "PDF não retornado pela Infosimples";
      await sa
        .from("infosimples_requests")
        .update({
          status: "failed",
          response_status: call.status,
          response_body: call.body,
          error_message: msg,
          completed_at: new Date().toISOString(),
          processing_time_ms: Date.now() - startedAt,
        })
        .eq("id", logId);
      await bumpUsage(sa, params.consultation_type, false);
      return {
        success: false,
        consultation_type: params.consultation_type,
        certificate_id: certificateId,
        error: msg,
      };
    }

    // 5. Upload no Drive
    const dataNode = call.body?.data?.[0] ?? {};
    const protocol = extractProtocol(dataNode);
    const fileName = `${params.consultation_type}_${cleanedDoc}_${Date.now()}.pdf`;
    const upload = await uploadPdfToDrive({
      serviceId: params.service_id,
      certificateId,
      fileName,
      base64: pdfBase64,
      authHeader: params.auth_header,
    });

    // 6. Classificação
    const classification = classifyResult(dataNode);

    // 7. Atualiza certificado
    const issuedDate = new Date();
    const validity = new Date();
    validity.setDate(validity.getDate() + 30);

    await sa
      .from("service_internet_certificates")
      .update({
        status: "emitida",
        issued_date: issuedDate.toISOString().slice(0, 10),
        expected_validity_date: validity.toISOString().slice(0, 10),
        protocol_number: protocol,
        classification,
        drive_file_id: upload.drive_file_id,
        file_url: upload.web_view_link,
        file_name: fileName,
        file_size: upload.file_size,
        file_uploaded_at: new Date().toISOString(),
        file_uploaded_by: params.user_id,
        infosimples_request_id: logId,
        auto_emitted: true,
        validation_status: "pending",
      })
      .eq("id", certificateId);

    // 8. Atualiza log
    await sa
      .from("infosimples_requests")
      .update({
        status: "completed",
        response_status: call.status,
        response_body: call.body,
        pdf_drive_file_id: upload.drive_file_id,
        pdf_drive_file_url: upload.web_view_link,
        certificate_result: classification,
        protocol_number: protocol,
        issued_date: issuedDate.toISOString(),
        validity_date: validity.toISOString().slice(0, 10),
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startedAt,
      })
      .eq("id", logId);

    await bumpUsage(sa, params.consultation_type, true);

    // 9. Dispara validação Gemini (background)
    triggerGeminiValidation({
      certificateId,
      driveFileId: upload.drive_file_id,
      expectedResult: classification,
      authHeader: params.auth_header,
    });

    return {
      success: true,
      consultation_type: params.consultation_type,
      certificate_id: certificateId,
      classification,
      protocol,
      drive_file_id: upload.drive_file_id,
      drive_url: upload.web_view_link,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await sa
      .from("infosimples_requests")
      .update({
        status: "failed",
        error_message: msg,
        completed_at: new Date().toISOString(),
        processing_time_ms: Date.now() - startedAt,
      })
      .eq("id", logId);
    await bumpUsage(sa, params.consultation_type, false);
    return {
      success: false,
      consultation_type: params.consultation_type,
      certificate_id: certificateId,
      error: msg,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const body = await req.json();
    const action: string = body?.action;
    const params: any = body?.params ?? {};

    if (action === "test_connection") {
      if (!INFOSIMPLES_API_TOKEN) {
        return jsonResponse({ ok: false, error: "INFOSIMPLES_API_TOKEN não configurado" });
      }
      // Endpoint oficial de saldo/info da conta Infosimples.
      // Aceita form-urlencoded; sucesso é indicado por code === 200 no JSON,
      // não pelo HTTP status (a API pode responder 200 com code de erro).
      try {
        const form = new URLSearchParams({ token: INFOSIMPLES_API_TOKEN });
        const r = await fetch(`${INFOSIMPLES_API_BASE}/account/info`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: form.toString(),
        });
        const j = await r.json().catch(() => ({}));
        const apiCode = j?.code;
        const ok = apiCode === 200;
        return jsonResponse({
          ok,
          status: r.status,
          api_code: apiCode,
          account: j?.data?.[0] ?? j,
          error: ok ? undefined : (j?.code_message || `code ${apiCode ?? r.status}`),
        });
      } catch (e) {
        return jsonResponse({
          ok: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    if (!userId) {
      return jsonResponse({ ok: false, error: "Não autenticado" }, 401);
    }

    if (action === "request_single_certificate") {
      const r = await processOneCertificate({
        consultation_type: params.consultation_type,
        cpf_cnpj: params.cpf_cnpj,
        service_id: params.service_id,
        party_id: params.party_id ?? null,
        person_type: params.person_type,
        user_id: userId,
        auth_header: authHeader,
      });
      return jsonResponse({ ok: r.success, result: r });
    }

    if (action === "request_all_for_party") {
      const types: ConsultationType[] = params.consultation_types ?? [
        "trf6_certidao",
        "tst_cndt",
        "trt3_ceat",
        "receita_federal_pgfn",
        "receita_federal_situacao",
      ];
      const results = await Promise.allSettled(
        types.map((t) =>
          processOneCertificate({
            consultation_type: t,
            cpf_cnpj: params.cpf_cnpj,
            service_id: params.service_id,
            party_id: params.party_id ?? null,
            person_type: params.person_type,
            user_id: userId,
            auth_header: authHeader,
          }),
        ),
      );
      const flat = results.map((r, i) =>
        r.status === "fulfilled"
          ? r.value
          : { success: false, consultation_type: types[i], error: String(r.reason) },
      );
      const summary = {
        total: flat.length,
        success: flat.filter((r) => r.success).length,
        failed: flat.filter((r) => !r.success).length,
        positive_count: flat.filter((r) => r.success && r.classification === "positiva").length,
      };
      return jsonResponse({ ok: true, results: flat, summary });
    }

    return jsonResponse({ ok: false, error: `Ação desconhecida: ${action}` }, 400);
  } catch (e) {
    console.error("[infosimples-cert-requester] fatal", e);
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      500,
    );
  }
});
