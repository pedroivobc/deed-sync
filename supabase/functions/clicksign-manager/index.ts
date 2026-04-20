// Edge Function: clicksign-manager
// Operations against ClickSign API v3 (Envelopes).
//
// Actions:
//   - test_connection
//   - create_envelope_from_pdf  (preferred — frontend generates PDF via jsPDF)
//   - send_envelope             (transitions draft -> running)
//   - get_envelope_status
//   - cancel_envelope
//   - resend_notification
//   - download_signed_document  (downloads signed PDF and stores in Drive)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CLICKSIGN_TOKEN = Deno.env.get("CLICKSIGN_API_TOKEN") ?? "";
const CLICKSIGN_ENV = (Deno.env.get("CLICKSIGN_ENVIRONMENT") ?? "sandbox").toLowerCase();
const CLICKSIGN_API_BASE = CLICKSIGN_ENV === "production"
  ? "https://app.clicksign.com/api/v3"
  : "https://sandbox.clicksign.com/api/v3";

// ───────────────────────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────────────────────

interface Ctx {
  supabase: ReturnType<typeof createClient>;
  userId: string | null;
}

interface SignerInput {
  name: string;
  email: string;
  cpf_cnpj?: string;
  phone?: string;
  party_id?: string | null;
}

// ───────────────────────────────────────────────────────────────────────────────
// ClickSign HTTP helper
// ───────────────────────────────────────────────────────────────────────────────

async function callClickSign(
  endpoint: string,
  method: string,
  body?: unknown,
): Promise<{ status: number; data: any; raw: string }> {
  const url = `${CLICKSIGN_API_BASE}/${endpoint.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/vnd.api+json",
      "Accept": "application/vnd.api+json",
      "Authorization": CLICKSIGN_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  let data: any = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { raw };
  }
  return { status: res.status, data, raw };
}

function ensureToken() {
  if (!CLICKSIGN_TOKEN) {
    throw new Error(
      "CLICKSIGN_API_TOKEN não configurado. Adicione o secret na configuração do projeto.",
    );
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Action: test_connection
// ───────────────────────────────────────────────────────────────────────────────

async function actionTestConnection() {
  if (!CLICKSIGN_TOKEN) {
    return {
      ok: false,
      configured: false,
      environment: CLICKSIGN_ENV,
      message: "CLICKSIGN_API_TOKEN não configurado",
    };
  }

  // Lightweight call — list envelopes (page 1)
  const { status, data, raw } = await callClickSign("envelopes?page[size]=1", "GET");
  if (status >= 200 && status < 300) {
    return {
      ok: true,
      configured: true,
      environment: CLICKSIGN_ENV,
      api_base: CLICKSIGN_API_BASE,
      message: "Conexão OK",
    };
  }
  return {
    ok: false,
    configured: true,
    environment: CLICKSIGN_ENV,
    api_base: CLICKSIGN_API_BASE,
    status,
    message: data?.errors?.[0]?.detail ?? data?.errors?.[0]?.title ?? raw.slice(0, 300),
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// Action: create_envelope_from_pdf
// ───────────────────────────────────────────────────────────────────────────────

async function actionCreateEnvelope(
  ctx: Ctx,
  params: {
    service_id: string | null;
    party_id: string | null;
    client_id: string | null;
    envelope_type: string;
    document_name: string;
    pdf_base64: string;        // raw base64 (no data: prefix)
    template_id?: string | null;
    template_name?: string | null;
    custom_variables?: Record<string, unknown>;
    signers: SignerInput[];
    deadline_days?: number;    // default 14
    auto_send?: boolean;       // default true (send after creation)
  },
) {
  ensureToken();

  const deadlineDays = Math.max(1, Math.min(90, params.deadline_days ?? 14));
  const deadlineAt = new Date(Date.now() + deadlineDays * 86400 * 1000);

  // 1. Create envelope (draft)
  const envelopeRes = await callClickSign("envelopes", "POST", {
    data: {
      type: "envelopes",
      attributes: {
        name: params.document_name,
        locale: "pt-BR",
        auto_close: true,
        remind_interval: 2,
        deadline_at: deadlineAt.toISOString(),
      },
    },
  });
  if (envelopeRes.status < 200 || envelopeRes.status >= 300) {
    throw new Error(
      `Falha ao criar envelope: ${envelopeRes.data?.errors?.[0]?.detail ?? envelopeRes.raw.slice(0, 200)}`,
    );
  }
  const envelopeId = envelopeRes.data?.data?.id as string;

  // 2. Add document
  const filename = `${params.document_name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
  const documentRes = await callClickSign(`envelopes/${envelopeId}/documents`, "POST", {
    data: {
      type: "documents",
      attributes: {
        filename,
        content_base64: `data:application/pdf;base64,${params.pdf_base64}`,
      },
    },
  });
  if (documentRes.status < 200 || documentRes.status >= 300) {
    throw new Error(
      `Falha ao anexar documento: ${documentRes.data?.errors?.[0]?.detail ?? documentRes.raw.slice(0, 200)}`,
    );
  }
  const documentId = documentRes.data?.data?.id as string;

  // 3. Add signers + requirements
  const signerRecords: Array<{
    clicksign_signer_id: string;
    input: SignerInput;
    sign_url?: string;
  }> = [];

  for (const signer of params.signers) {
    const signerRes = await callClickSign(`envelopes/${envelopeId}/signers`, "POST", {
      data: {
        type: "signers",
        attributes: {
          name: signer.name,
          email: signer.email,
          has_documentation: !!signer.cpf_cnpj,
          documentation: signer.cpf_cnpj ?? "",
          phone_number: signer.phone ?? null,
          communicate_events: {
            document_signed: "email",
            signature_request: "email",
            signature_reminder: "email",
          },
        },
      },
    });
    if (signerRes.status < 200 || signerRes.status >= 300) {
      throw new Error(
        `Falha ao adicionar signatário ${signer.email}: ${signerRes.data?.errors?.[0]?.detail ?? signerRes.raw.slice(0, 200)}`,
      );
    }
    const signerId = signerRes.data?.data?.id as string;

    // Requirement: signature
    await callClickSign(`envelopes/${envelopeId}/requirements`, "POST", {
      data: {
        type: "requirements",
        attributes: { action: "sign", role: "sign" },
        relationships: {
          document: { data: { type: "documents", id: documentId } },
          signer: { data: { type: "signers", id: signerId } },
        },
      },
    });
    // Requirement: auth via email
    await callClickSign(`envelopes/${envelopeId}/requirements`, "POST", {
      data: {
        type: "requirements",
        attributes: { action: "provide_evidence", auth: "email" },
        relationships: {
          signer: { data: { type: "signers", id: signerId } },
        },
      },
    });

    signerRecords.push({ clicksign_signer_id: signerId, input: signer });
  }

  // 4. Optionally activate envelope (status running)
  let finalStatus: "draft" | "running" = "draft";
  if (params.auto_send !== false) {
    const sendRes = await callClickSign(`envelopes/${envelopeId}`, "PATCH", {
      data: {
        id: envelopeId,
        type: "envelopes",
        attributes: { status: "running" },
      },
    });
    if (sendRes.status < 200 || sendRes.status >= 300) {
      console.warn("Envelope criado mas falhou ao ativar:", sendRes.raw.slice(0, 200));
    } else {
      finalStatus = "running";
    }
  }

  // 5. Persist envelope record
  const { data: envelopeRow, error: envInsErr } = await ctx.supabase
    .from("clicksign_envelopes")
    .insert({
      service_id: params.service_id,
      party_id: params.party_id,
      client_id: params.client_id,
      envelope_type: params.envelope_type as any,
      clicksign_envelope_id: envelopeId,
      clicksign_document_id: documentId,
      status: finalStatus,
      document_name: params.document_name,
      template_used: params.template_name ?? null,
      custom_variables: params.custom_variables ?? {},
      deadline_at: deadlineAt.toISOString(),
      sent_at: new Date().toISOString(),
      created_by: ctx.userId,
    })
    .select("*")
    .single();
  if (envInsErr) throw new Error(`Falha ao salvar envelope: ${envInsErr.message}`);

  // 6. Persist signers
  for (let i = 0; i < signerRecords.length; i++) {
    const r = signerRecords[i];
    await ctx.supabase.from("clicksign_signers").insert({
      envelope_id: envelopeRow.id,
      clicksign_signer_id: r.clicksign_signer_id,
      signer_name: r.input.name,
      signer_email: r.input.email,
      signer_cpf_cnpj: r.input.cpf_cnpj ?? null,
      signer_phone: r.input.phone ?? null,
      signer_role: "signatario",
      signer_order: i + 1,
      authentication_methods: ["email"],
      status: "pending",
      sign_url: r.sign_url ?? null,
    });
  }

  // 7. Activity log
  if (params.service_id) {
    await ctx.supabase.from("service_activity_log").insert({
      service_id: params.service_id,
      action: "clicksign_envelope_created",
      payload: {
        envelope_id: envelopeRow.id,
        clicksign_envelope_id: envelopeId,
        document_name: params.document_name,
        signers_count: signerRecords.length,
        status: finalStatus,
      },
      user_id: ctx.userId,
    });
  }

  return {
    success: true,
    envelope_id: envelopeRow.id,
    clicksign_envelope_id: envelopeId,
    clicksign_document_id: documentId,
    status: finalStatus,
    signers_count: signerRecords.length,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// Action: get_envelope_status
// ───────────────────────────────────────────────────────────────────────────────

async function actionGetStatus(_ctx: Ctx, params: { clicksign_envelope_id: string }) {
  ensureToken();
  const { status, data, raw } = await callClickSign(
    `envelopes/${params.clicksign_envelope_id}`,
    "GET",
  );
  if (status < 200 || status >= 300) {
    throw new Error(`Falha ao consultar envelope: ${raw.slice(0, 200)}`);
  }
  return {
    success: true,
    status: data?.data?.attributes?.status,
    raw: data,
  };
}

// ───────────────────────────────────────────────────────────────────────────────
// Action: cancel_envelope
// ───────────────────────────────────────────────────────────────────────────────

async function actionCancel(ctx: Ctx, params: { envelope_id: string }) {
  ensureToken();
  const { data: envelope, error } = await ctx.supabase
    .from("clicksign_envelopes")
    .select("*")
    .eq("id", params.envelope_id)
    .maybeSingle();
  if (error || !envelope) throw new Error("Envelope não encontrado");

  const cs = await callClickSign(`envelopes/${envelope.clicksign_envelope_id}`, "PATCH", {
    data: {
      id: envelope.clicksign_envelope_id,
      type: "envelopes",
      attributes: { status: "cancelled" },
    },
  });
  if (cs.status < 200 || cs.status >= 300) {
    throw new Error(`Falha ao cancelar: ${cs.raw.slice(0, 200)}`);
  }

  await ctx.supabase
    .from("clicksign_envelopes")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", envelope.id);

  if (envelope.service_id) {
    await ctx.supabase.from("service_activity_log").insert({
      service_id: envelope.service_id,
      action: "clicksign_envelope_cancelled",
      payload: { envelope_id: envelope.id },
      user_id: ctx.userId,
    });
  }

  return { success: true };
}

// ───────────────────────────────────────────────────────────────────────────────
// Action: resend_notification
// ───────────────────────────────────────────────────────────────────────────────

async function actionResend(_ctx: Ctx, params: { clicksign_envelope_id: string; clicksign_signer_id: string }) {
  ensureToken();
  const cs = await callClickSign(
    `envelopes/${params.clicksign_envelope_id}/signers/${params.clicksign_signer_id}/notifications`,
    "POST",
    {
      data: {
        type: "notifications",
        attributes: { message: "Lembrete: você possui um documento aguardando assinatura." },
      },
    },
  );
  if (cs.status < 200 || cs.status >= 300) {
    throw new Error(`Falha ao reenviar: ${cs.raw.slice(0, 200)}`);
  }
  return { success: true };
}

// ───────────────────────────────────────────────────────────────────────────────
// Action: download_signed_document
// ───────────────────────────────────────────────────────────────────────────────

async function actionDownloadSigned(ctx: Ctx, params: { envelope_id: string }) {
  ensureToken();
  const { data: envelope } = await ctx.supabase
    .from("clicksign_envelopes")
    .select("*")
    .eq("id", params.envelope_id)
    .maybeSingle();
  if (!envelope) throw new Error("Envelope não encontrado");

  // Get document download URL
  const docs = await callClickSign(`envelopes/${envelope.clicksign_envelope_id}/documents`, "GET");
  if (docs.status < 200 || docs.status >= 300) {
    throw new Error(`Falha ao listar documentos: ${docs.raw.slice(0, 200)}`);
  }
  const document = docs.data?.data?.[0];
  const downloadUrl: string | undefined = document?.attributes?.url
    ?? document?.attributes?.download_url
    ?? document?.attributes?.signed_url;

  if (!downloadUrl) {
    return {
      success: false,
      error: "URL de download não disponível ainda. Tente novamente em alguns segundos.",
    };
  }

  const pdfRes = await fetch(downloadUrl);
  if (!pdfRes.ok) throw new Error(`Falha ao baixar PDF: ${pdfRes.status}`);
  const pdfBuf = new Uint8Array(await pdfRes.arrayBuffer());
  let binary = "";
  for (let i = 0; i < pdfBuf.length; i++) binary += String.fromCharCode(pdfBuf[i]);
  const pdfBase64 = btoa(binary);

  // Upload to Drive (entrega_final subfolder of the service)
  if (envelope.service_id) {
    const uploadRes = await ctx.supabase.functions.invoke("google-drive-manager", {
      body: {
        action: "upload_file",
        params: {
          entity_type: "service",
          entity_id: envelope.service_id,
          subfolder_type: "entrega_final",
          file_base64: pdfBase64,
          file_name: `${envelope.document_name}_ASSINADO.pdf`,
          mime_type: "application/pdf",
          file_size: pdfBuf.length,
          related_entity_type: "clicksign_envelope",
          related_entity_id: envelope.id,
        },
      },
    });
    const uploaded = (uploadRes.data as any)?.result;
    if (uploaded?.drive_file_id) {
      await ctx.supabase
        .from("clicksign_envelopes")
        .update({
          signed_document_drive_id: uploaded.drive_file_id,
          status: "signed",
          signed_at: envelope.signed_at ?? new Date().toISOString(),
        })
        .eq("id", envelope.id);
    }
    return { success: true, drive_file_id: uploaded?.drive_file_id };
  }

  return { success: true, pdf_base64: pdfBase64 };
}

// ───────────────────────────────────────────────────────────────────────────────
// Server
// ───────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(
        SUPABASE_URL,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const body = await req.json();
    const { action, params = {} } = body as { action: string; params?: any };
    const ctx: Ctx = { supabase, userId };

    let result: unknown;
    switch (action) {
      case "test_connection":
        result = await actionTestConnection();
        break;
      case "create_envelope_from_pdf":
        result = await actionCreateEnvelope(ctx, params);
        break;
      case "get_envelope_status":
        result = await actionGetStatus(ctx, params);
        break;
      case "cancel_envelope":
        result = await actionCancel(ctx, params);
        break;
      case "resend_notification":
        result = await actionResend(ctx, params);
        break;
      case "download_signed_document":
        result = await actionDownloadSigned(ctx, params);
        break;
      default:
        return new Response(JSON.stringify({ ok: false, error: `Ação desconhecida: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("clicksign-manager error:", message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
