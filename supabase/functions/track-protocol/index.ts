import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STAGE_LABELS: Record<string, string> = {
  entrada: "Entrada",
  documentacao: "Documentação",
  analise: "Análise",
  execucao: "Execução",
  revisao: "Revisão",
  concluido: "Concluído",
};

const TYPE_LABELS: Record<string, string> = {
  escritura: "Escritura",
  avulso: "Serviço Avulso",
  regularizacao: "Regularização de Imóvel",
};

// Simple in-memory rate limit (per cold-start instance)
const recentAttempts = new Map<string, { count: number; firstAt: number }>();
const RL_WINDOW_MS = 60_000;
const RL_MAX = 10;

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = recentAttempts.get(ip);
  if (!entry || now - entry.firstAt > RL_WINDOW_MS) {
    recentAttempts.set(ip, { count: 1, firstAt: now });
    return true;
  }
  if (entry.count >= RL_MAX) return false;
  entry.count += 1;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env não configurado");

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRate(ip)) {
      return new Response(
        JSON.stringify({ error: "Muitas tentativas. Aguarde um minuto e tente novamente." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const protocoloRaw = String(body?.protocolo ?? "").trim().toUpperCase();
    const codigoRaw = String(body?.codigo_verificador ?? "").trim().toUpperCase();

    if (!protocoloRaw || !codigoRaw) {
      return new Response(
        JSON.stringify({ error: "Protocolo e código verificador são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Basic format validation
    if (!/^CLM-\d{4}-\d{6}$/.test(protocoloRaw) || !/^[A-Z0-9]{8}$/.test(codigoRaw)) {
      return new Response(
        JSON.stringify({ error: "Protocolo ou código verificador inválido." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: service, error } = await admin
      .from("services")
      .select("id, subject, type, stage, protocolo, codigo_verificador, solicitante_nome, created_at")
      .eq("protocolo", protocoloRaw)
      .eq("codigo_verificador", codigoRaw)
      .maybeSingle();

    if (error) throw error;
    if (!service) {
      return new Response(
        JSON.stringify({ error: "Protocolo não encontrado ou código verificador incorreto." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: history } = await admin
      .from("service_status_history")
      .select("stage, descricao, data_alteracao")
      .eq("service_id", service.id)
      .order("data_alteracao", { ascending: false });

    return new Response(
      JSON.stringify({
        protocolo: service.protocolo,
        codigo_verificador: service.codigo_verificador,
        solicitante: service.solicitante_nome ?? "—",
        tipo_servico: TYPE_LABELS[service.type] ?? service.type,
        tipo_servico_raw: service.type,
        assunto: service.subject,
        data_solicitacao: service.created_at,
        status_atual: STAGE_LABELS[service.stage] ?? service.stage,
        status_atual_raw: service.stage,
        andamentos: (history ?? []).map((h) => ({
          data: h.data_alteracao,
          status: STAGE_LABELS[h.stage] ?? h.stage,
          stage_raw: h.stage,
          descricao: h.descricao,
        })),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[track-protocol] erro:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});