// deno-lint-ignore-file no-explicit-any
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function baseUrl(env: string) {
  return env === "production"
    ? "https://matls-clients.api.cora.com.br"
    : "https://matls-clients.api.stage.cora.com.br";
}

/**
 * Normaliza conteúdo PEM vindo de secret:
 * - converte "\n" literais em quebras reais
 * - normaliza CRLF -> LF
 * - remove aspas externas
 * - garante newline final
 */
function normalizePem(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  let s = raw.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  s = s.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  if (!s.endsWith("\n")) s += "\n";
  return s;
}

async function logCall(
  supabase: any,
  payload: {
    environment: string;
    endpoint: string;
    method: string;
    request_payload?: unknown;
    response_status?: number | null;
    response_body?: unknown;
    error_message?: string | null;
    duration_ms?: number | null;
  },
) {
  try {
    await supabase.from("cora_api_logs").insert({
      environment: payload.environment,
      endpoint: payload.endpoint,
      method: payload.method,
      request_payload: payload.request_payload ?? null,
      response_status: payload.response_status ?? null,
      response_body: payload.response_body ?? null,
      error_message: payload.error_message ?? null,
      duration_ms: payload.duration_ms ?? null,
    });
  } catch (e) {
    console.error("[cora-auth] failed to log call", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const env = (Deno.env.get("CORA_ENVIRONMENT") ?? "stage").toLowerCase();
  const clientId = Deno.env.get("CORA_CLIENT_ID")?.trim();
  const cert = normalizePem(Deno.env.get("CORA_CERTIFICATE"));
  const key = normalizePem(Deno.env.get("CORA_PRIVATE_KEY"));

  let force = false;
  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    force = !!body?.force;
  } catch {
    /* noop */
  }

  if (!clientId || !cert || !key) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: "Secrets ausentes: verifique CORA_CLIENT_ID, CORA_CERTIFICATE e CORA_PRIVATE_KEY.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // 1. Reaproveitar token vigente (margem de 5 min)
  if (!force) {
    const { data: existing } = await supabase
      .from("cora_auth_tokens")
      .select("*")
      .eq("environment", env)
      .maybeSingle();

    if (existing?.access_token && existing?.expires_at) {
      const expiresMs = new Date(existing.expires_at).getTime();
      if (expiresMs - Date.now() > 5 * 60 * 1000) {
        return new Response(
          JSON.stringify({
            ok: true,
            cached: true,
            access_token: existing.access_token,
            token_type: existing.token_type,
            expires_at: existing.expires_at,
            environment: env,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
  }

  // 2. Buscar novo token via mTLS
  const url = `${baseUrl(env)}/token`;
  const startedAt = Date.now();
  let httpClient: Deno.HttpClient | null = null;

  try {
    // @ts-ignore - createHttpClient ainda é unstable em alguns runtimes
    httpClient = (Deno as any).createHttpClient?.({ cert, key });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha ao montar cliente mTLS";
    await logCall(supabase, {
      environment: env,
      endpoint: "/token",
      method: "POST",
      error_message: `createHttpClient: ${msg}`,
      duration_ms: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({ ok: false, error: `Certificado inválido: ${msg}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
  });

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // @ts-ignore - opção client é específica do Deno
      client: httpClient,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro de rede";
    await logCall(supabase, {
      environment: env,
      endpoint: "/token",
      method: "POST",
      error_message: `fetch: ${msg}`,
      duration_ms: Date.now() - startedAt,
    });
    return new Response(
      JSON.stringify({ ok: false, error: `Falha na requisição mTLS: ${msg}` }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const text = await resp.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  const duration = Date.now() - startedAt;

  if (!resp.ok || !json?.access_token) {
    await logCall(supabase, {
      environment: env,
      endpoint: "/token",
      method: "POST",
      response_status: resp.status,
      response_body: json,
      error_message: json?.error_description ?? json?.error ?? `HTTP ${resp.status}`,
      duration_ms: duration,
    });
    return new Response(
      JSON.stringify({
        ok: false,
        status: resp.status,
        error: json?.error_description ?? json?.error ?? `HTTP ${resp.status}`,
        details: json,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const expiresInSec = Number(json.expires_in ?? 24 * 3600);
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  // 3. Upsert do token
  const { error: upsertErr } = await supabase
    .from("cora_auth_tokens")
    .upsert(
      {
        environment: env,
        access_token: json.access_token,
        token_type: json.token_type ?? "bearer",
        scope: json.scope ?? null,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "environment" },
    );

  if (upsertErr) {
    console.error("[cora-auth] upsert error", upsertErr);
  }

  await logCall(supabase, {
    environment: env,
    endpoint: "/token",
    method: "POST",
    response_status: resp.status,
    response_body: { token_type: json.token_type, expires_in: json.expires_in, scope: json.scope },
    duration_ms: duration,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      cached: false,
      access_token: json.access_token,
      token_type: json.token_type ?? "bearer",
      expires_at: expiresAt,
      scope: json.scope ?? null,
      environment: env,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});