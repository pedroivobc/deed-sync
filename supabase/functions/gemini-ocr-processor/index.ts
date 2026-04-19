// gemini-ocr-processor: extração de dados via Gemini API (REST) usando GEMINI_API_KEY.
// Sem dependências externas pesadas — chamamos a REST API diretamente.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPromptByType } from "./prompts.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_MODEL = "gemini-2.0-flash-exp";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Custo aproximado (USD) — Gemini 2.0 Flash:
// $0.000075 / 1K input tokens, $0.0003 / 1K output tokens (preview pricing)
const USD_TO_BRL = 5.0;
const COST_INPUT_PER_1K = 0.000075;
const COST_OUTPUT_PER_1K = 0.0003;

// Limite simples de extrações por usuário/dia
const MAX_EXTRACTIONS_PER_DAY = 500;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function safeParseJSON(text: string): unknown {
  // Gemini às vezes envolve em ```json ... ```
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // tenta achar o primeiro objeto/array balanceado
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

async function callGemini(args: {
  prompt: string;
  fileBase64: string;
  mimeType: string;
}): Promise<{
  text: string;
  promptTokens: number;
  responseTokens: number;
}> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurado");

  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: args.prompt },
          {
            inline_data: {
              mime_type: args.mimeType,
              data: args.fileBase64,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json",
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const r = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!r.ok) {
      const txt = await r.text();
      throw new Error(`Gemini ${r.status}: ${txt.slice(0, 500)}`);
    }
    const json: any = await r.json();
    const text =
      json?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
    return {
      text,
      promptTokens: json?.usageMetadata?.promptTokenCount ?? 0,
      responseTokens: json?.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkDailyLimit(supabase: any, userId: string): Promise<number> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ocr_extraction_logs")
    .select("id", { count: "exact", head: true })
    .eq("created_by", userId)
    .gte("created_at", since.toISOString());
  return count ?? 0;
}

async function bumpUsage(
  supabase: any,
  documentType: string,
  promptTokens: number,
  responseTokens: number,
) {
  const month = new Date();
  month.setUTCDate(1);
  const monthKey = month.toISOString().slice(0, 10);
  const totalTokens = promptTokens + responseTokens;
  const costUsd =
    (promptTokens / 1000) * COST_INPUT_PER_1K +
    (responseTokens / 1000) * COST_OUTPUT_PER_1K;
  const costBrl = costUsd * USD_TO_BRL;

  const { data: existing } = await supabase
    .from("ocr_usage_stats")
    .select("*")
    .eq("month", monthKey)
    .maybeSingle();

  if (existing) {
    const byType = (existing.by_document_type ?? {}) as Record<string, number>;
    byType[documentType] = (byType[documentType] ?? 0) + 1;
    await supabase
      .from("ocr_usage_stats")
      .update({
        total_extractions: existing.total_extractions + 1,
        total_tokens_used: existing.total_tokens_used + totalTokens,
        estimated_cost_brl: Number(existing.estimated_cost_brl) + costBrl,
        by_document_type: byType,
      })
      .eq("month", monthKey);
  } else {
    await supabase.from("ocr_usage_stats").insert({
      month: monthKey,
      total_extractions: 1,
      total_tokens_used: totalTokens,
      estimated_cost_brl: costBrl,
      by_document_type: { [documentType]: 1 },
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id ?? null;

    const body = await req.json();
    const action = body?.action as string;
    const params = body?.params ?? {};

    if (action === "test_connection") {
      if (!Deno.env.get("GEMINI_API_KEY")) {
        return jsonResponse({ ok: false, error: "GEMINI_API_KEY não configurado" }, 200);
      }
      return jsonResponse({ ok: true, model: GEMINI_MODEL });
    }

    if (action === "test_extraction" || action === "extract_document") {
      if (!userId) return jsonResponse({ ok: false, error: "Não autenticado" }, 401);

      const fileBase64: string = params.file_base64;
      const mimeType: string = params.mime_type;
      const fileName: string = params.file_name ?? "documento";
      const fileSize: number = params.file_size ?? 0;
      const documentType: string = params.document_type ?? "outro";

      if (!fileBase64 || !mimeType) {
        return jsonResponse({ ok: false, error: "Arquivo ausente" }, 400);
      }
      if (fileSize > 10 * 1024 * 1024) {
        return jsonResponse({ ok: false, error: "Arquivo excede 10MB" }, 400);
      }
      if (!["application/pdf", "image/jpeg", "image/png", "image/jpg"].includes(mimeType)) {
        return jsonResponse({ ok: false, error: "Formato não suportado (use PDF, JPG ou PNG)" }, 400);
      }

      // Limite diário (apenas para extract real, não para test)
      if (action === "extract_document") {
        const used = await checkDailyLimit(supabase, userId);
        if (used >= MAX_EXTRACTIONS_PER_DAY) {
          return jsonResponse(
            { ok: false, error: "Limite diário de extrações atingido" },
            429,
          );
        }
      }

      const startedAt = Date.now();
      const prompt = getPromptByType(documentType);

      let extracted: any = null;
      let promptTokens = 0;
      let responseTokens = 0;
      let status: "completed" | "partial" | "failed" = "completed";
      let errorMessage: string | null = null;

      try {
        const r = await callGemini({ prompt, fileBase64, mimeType });
        promptTokens = r.promptTokens;
        responseTokens = r.responseTokens;
        const parsed = safeParseJSON(r.text);
        if (parsed && (parsed as any)._parse_error) {
          status = "partial";
          errorMessage = "Resposta da IA não é JSON válido";
        }
        extracted = parsed;
      } catch (e) {
        status = "failed";
        errorMessage = e instanceof Error ? e.message : String(e);
      }

      const elapsed = Date.now() - startedAt;

      // Não persiste nada em test_extraction
      if (action === "test_extraction") {
        return jsonResponse({
          ok: status !== "failed",
          status,
          error: errorMessage,
          extracted,
          confidence_scores: extracted?.confidence_scores ?? {},
          processing_time_ms: elapsed,
          tokens: { prompt: promptTokens, response: responseTokens },
        });
      }

      // extract_document: salva log + estatísticas
      const { data: logRow, error: logErr } = await supabase
        .from("ocr_extraction_logs")
        .insert({
          service_id: params.service_id ?? null,
          client_id: params.client_id ?? null,
          party_id: params.party_id ?? null,
          drive_file_id: params.drive_file_id ?? null,
          document_type: documentType,
          file_name: fileName,
          mime_type: mimeType,
          file_size: fileSize,
          extracted_data: extracted ?? {},
          confidence_scores: extracted?.confidence_scores ?? {},
          gemini_model_used: GEMINI_MODEL,
          prompt_tokens_used: promptTokens,
          response_tokens_used: responseTokens,
          processing_time_ms: elapsed,
          status,
          error_message: errorMessage,
          created_by: userId,
        })
        .select("id")
        .single();

      if (logErr) {
        console.error("[ocr] insert log failed", logErr);
      }

      if (status !== "failed") {
        try {
          await bumpUsage(supabase, documentType, promptTokens, responseTokens);
        } catch (e) {
          console.error("[ocr] bumpUsage failed", e);
        }
      }

      return jsonResponse({
        ok: status !== "failed",
        log_id: logRow?.id ?? null,
        status,
        error: errorMessage,
        extracted,
        confidence_scores: extracted?.confidence_scores ?? {},
        processing_time_ms: elapsed,
        tokens: { prompt: promptTokens, response: responseTokens },
      });
    }

    if (action === "validate_extraction") {
      if (!userId) return jsonResponse({ ok: false, error: "Não autenticado" }, 401);
      const logId = params.log_id;
      const accepted = !!params.user_accepted;
      const corrected = params.user_corrected_fields ?? null;
      if (!logId) return jsonResponse({ ok: false, error: "log_id obrigatório" }, 400);

      const { error } = await supabase
        .from("ocr_extraction_logs")
        .update({ user_accepted: accepted, user_corrected_fields: corrected })
        .eq("id", logId);
      if (error) return jsonResponse({ ok: false, error: error.message }, 500);
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: `Ação desconhecida: ${action}` }, 400);
  } catch (e) {
    console.error("[gemini-ocr-processor] fatal", e);
    return jsonResponse(
      { ok: false, error: e instanceof Error ? e.message : "Erro desconhecido" },
      500,
    );
  }
});
