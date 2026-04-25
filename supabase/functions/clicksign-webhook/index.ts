// Edge Function: clicksign-webhook
// Public endpoint (no JWT). Validates HMAC-SHA256 signature using
// CLICKSIGN_WEBHOOK_SECRET, logs the event, and updates envelope status.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("CLICKSIGN_WEBHOOK_SECRET") ?? "";

// ───────────────────────────────────────────────────────────────────────────────
// HMAC-SHA256 validation
// ───────────────────────────────────────────────────────────────────────────────

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function validateSignature(headerSig: string | null, body: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return false; // strict: secret must be configured
  if (!headerSig) return false;
  // ClickSign sends "sha256=<hex>" or just "<hex>"
  const provided = headerSig.replace(/^sha256=/i, "").trim();
  const expected = await hmacSha256Hex(WEBHOOK_SECRET, body);
  return constantTimeEqual(provided, expected);
}

// ───────────────────────────────────────────────────────────────────────────────
// Event handlers
// ───────────────────────────────────────────────────────────────────────────────

function extractEnvelopeId(payload: any): string | null {
  return (
    payload?.event?.data?.envelope?.id ??
    payload?.envelope?.id ??
    payload?.data?.envelope?.id ??
    payload?.document?.envelope_id ??
    null
  );
}

function extractEventName(payload: any): string {
  return (
    payload?.event?.name ??
    payload?.event_name ??
    payload?.type ??
    "unknown"
  );
}

async function notifyCreator(
  supabase: ReturnType<typeof createClient>,
  envelope: any,
  type: "success" | "info" | "warning" | "critical",
  title: string,
  description: string,
) {
  if (!envelope?.created_by) return;
  await supabase.from("notifications").insert({
    user_id: envelope.created_by,
    type,
    title,
    description,
    link: envelope.service_id ? `/servicos` : null,
    related_entity_type: "clicksign_envelope",
    related_entity_id: envelope.id,
  });
}

async function logServiceActivity(
  supabase: ReturnType<typeof createClient>,
  envelope: any,
  action: string,
  payload: Record<string, unknown>,
) {
  if (!envelope?.service_id) return;
  await supabase.from("service_activity_log").insert({
    service_id: envelope.service_id,
    action,
    payload,
  });
}

async function handleSignerSigned(
  supabase: any,
  envelope: any,
  payload: any,
) {
  const signerId = payload?.event?.data?.signer?.id ?? payload?.signer?.id;
  if (!signerId) return;
  await supabase
    .from("clicksign_signers")
    .update({ status: "signed", signed_at: new Date().toISOString() })
    .eq("envelope_id", envelope.id)
    .eq("clicksign_signer_id", signerId);
}

async function handleEnvelopeClosed(
  supabase: any,
  envelope: any,
) {
  await supabase
    .from("clicksign_envelopes")
    .update({ status: "signed", signed_at: new Date().toISOString() })
    .eq("id", envelope.id);

  await notifyCreator(
    supabase,
    envelope,
    "success",
    "Documento assinado!",
    `${envelope.document_name} foi assinado por todos os signatários.`,
  );
  await logServiceActivity(supabase, envelope, "clicksign_envelope_signed", {
    envelope_id: envelope.id,
  });

  // Trigger async download to Drive
  try {
    await supabase.functions.invoke("clicksign-manager", {
      body: { action: "download_signed_document", params: { envelope_id: envelope.id } },
    });
  } catch (e) {
    console.warn("Falha ao baixar documento assinado:", e);
  }
}

async function handleEnvelopeRefused(
  supabase: any,
  envelope: any,
) {
  await supabase.from("clicksign_envelopes").update({ status: "refused" }).eq("id", envelope.id);
  await notifyCreator(
    supabase,
    envelope,
    "warning",
    "Assinatura recusada",
    `${envelope.document_name} foi recusado por um signatário.`,
  );
}

async function handleEnvelopeCancelled(
  supabase: any,
  envelope: any,
) {
  await supabase
    .from("clicksign_envelopes")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", envelope.id);
}

async function handleEnvelopeExpired(
  supabase: any,
  envelope: any,
) {
  await supabase.from("clicksign_envelopes").update({ status: "expired" }).eq("id", envelope.id);
  await notifyCreator(
    supabase,
    envelope,
    "warning",
    "Prazo de assinatura expirado",
    `${envelope.document_name} expirou sem assinatura.`,
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Server
// ───────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const body = await req.text();
  const sigHeader = req.headers.get("content-hmac")
    ?? req.headers.get("Content-Hmac")
    ?? req.headers.get("x-clicksign-signature")
    ?? null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let payload: any = {};
  try {
    payload = JSON.parse(body);
  } catch {
    payload = { raw: body };
  }

  const eventType = extractEventName(payload);
  const csEnvelopeId = extractEnvelopeId(payload);

  // Validate HMAC signature
  const signatureValid = await validateSignature(sigHeader, body);

  // Lookup envelope record
  let envelope: any = null;
  if (csEnvelopeId) {
    const { data } = await supabase
      .from("clicksign_envelopes")
      .select("*")
      .eq("clicksign_envelope_id", csEnvelopeId)
      .maybeSingle();
    envelope = data;
  }

  // Always log the webhook (even invalid) for auditing
  await supabase.from("clicksign_webhooks_log").insert({
    envelope_id: envelope?.id ?? null,
    clicksign_envelope_id: csEnvelopeId,
    event_type: eventType,
    payload,
    signature_valid: signatureValid,
    processed: false,
  });

  if (!signatureValid) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!envelope) {
    return new Response(JSON.stringify({ ok: true, ignored: "envelope not found" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let processingError: string | null = null;
  try {
    switch (eventType) {
      case "sign":
      case "document.signed":
        await handleSignerSigned(supabase, envelope, payload);
        break;
      case "close":
      case "auto_close":
      case "envelope.closed":
        await handleEnvelopeClosed(supabase, envelope);
        break;
      case "refuse":
      case "envelope.refused":
        await handleEnvelopeRefused(supabase, envelope);
        break;
      case "cancel":
      case "envelope.cancelled":
        await handleEnvelopeCancelled(supabase, envelope);
        break;
      case "deadline":
      case "envelope.expired":
        await handleEnvelopeExpired(supabase, envelope);
        break;
      default:
        // unhandled event — already logged
        break;
    }
  } catch (e) {
    processingError = e instanceof Error ? e.message : String(e);
    console.error("Webhook processing error:", processingError);
  }

  await supabase
    .from("clicksign_webhooks_log")
    .update({ processed: !processingError, processing_error: processingError })
    .eq("envelope_id", envelope.id)
    .eq("event_type", eventType)
    .order("received_at", { ascending: false })
    .limit(1);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
