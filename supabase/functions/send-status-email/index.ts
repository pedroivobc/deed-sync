import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

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

const TRACKING_BASE_URL = "https://deed-sync.lovable.app/acompanhar";

function encodeBase64Url(input: string): string {
  // UTF-8 safe base64url encoding
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function buildRawEmail(to: string, subject: string, htmlBody: string, textBody: string): string {
  const boundary = "clm_" + Math.random().toString(36).slice(2);
  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    textBody,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
    "",
    htmlBody,
    "",
    `--${boundary}--`,
  ].join("\r\n");
  return encodeBase64Url(message);
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GMAIL_API_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");
    if (!GMAIL_API_KEY) throw new Error("GOOGLE_MAIL_API_KEY não configurada");
    if (!SUPABASE_URL || !SERVICE_ROLE) throw new Error("Supabase env não configurado");

    const { service_id, history_id } = await req.json();
    if (!service_id) {
      return new Response(JSON.stringify({ error: "service_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch service
    const { data: service, error: svcErr } = await admin
      .from("services")
      .select("id, subject, type, stage, protocolo, codigo_verificador, solicitante_nome, solicitante_email, created_at")
      .eq("id", service_id)
      .maybeSingle();
    if (svcErr) throw svcErr;
    if (!service) throw new Error("Serviço não encontrado");
    if (!service.solicitante_email) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Solicitante sem e-mail cadastrado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!service.protocolo) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "Serviço sem protocolo (concluído ou legado)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch history
    const { data: history } = await admin
      .from("service_status_history")
      .select("stage, descricao, data_alteracao")
      .eq("service_id", service_id)
      .order("data_alteracao", { ascending: true });

    const historyList = history ?? [];
    const lastEntry = historyList[historyList.length - 1];
    const stageLabel = STAGE_LABELS[service.stage] ?? service.stage;
    const typeLabel = TYPE_LABELS[service.type] ?? service.type;
    const solicitante = service.solicitante_nome || "Cliente";
    const trackingUrl = TRACKING_BASE_URL;

    const historyTextLines = historyList
      .map((h) => `• ${fmtDate(h.data_alteracao)} — ${STAGE_LABELS[h.stage] ?? h.stage}${h.descricao ? ` (${h.descricao})` : ""}`)
      .join("\n");

    const historyHtmlRows = historyList
      .map(
        (h) => `
          <tr>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#475569;font-size:13px;white-space:nowrap;">${fmtDate(h.data_alteracao)}</td>
            <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#0f172a;font-size:13px;">${STAGE_LABELS[h.stage] ?? h.stage}${h.descricao ? `<br/><span style="color:#64748b;font-size:12px;">${h.descricao}</span>` : ""}</td>
          </tr>`,
      )
      .join("");

    const subject = `Atualização de Status — Protocolo ${service.protocolo}`;
    const textBody = `Olá ${solicitante},

Esta é a confirmação de alteração de status de sua solicitação na Clemente Assessoria.

Protocolo: ${service.protocolo}
Código Verificador: ${service.codigo_verificador}
Tipo de Serviço: ${typeLabel}
Data de Solicitação: ${fmtDate(service.created_at)}
Último Status: ${stageLabel}
Data de Alteração: ${fmtDate(lastEntry?.data_alteracao ?? null)}

ANDAMENTOS
${historyTextLines}

Para acompanhar o protocolo, acesse:
${trackingUrl}

Obs: As informações de andamento são atualizadas manualmente por nossa equipe e podem não refletir, em tempo real, o estágio exato do serviço.

Clemente Assessoria
Rua Santa Rita, 454, Sala 203, Centro, Juiz de Fora/MG`;

    const htmlBody = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 24px;">
    <div style="border-bottom:3px solid #0f172a;padding-bottom:16px;margin-bottom:24px;">
      <h1 style="margin:0;color:#0f172a;font-size:22px;font-weight:600;">Clemente Assessoria</h1>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;">Atualização de Protocolo</p>
    </div>

    <p style="color:#0f172a;font-size:15px;line-height:1.6;margin:0 0 16px;">Olá <strong>${solicitante}</strong>,</p>
    <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Esta é a confirmação de alteração de status de sua solicitação.
    </p>

    <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;margin-bottom:24px;">
      <tr>
        <td style="padding:12px 16px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Protocolo</td>
        <td style="padding:12px 16px;color:#0f172a;font-size:15px;font-weight:600;font-family:monospace;text-align:right;">${service.protocolo}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #e2e8f0;">Código Verificador</td>
        <td style="padding:12px 16px;color:#0f172a;font-size:15px;font-weight:600;font-family:monospace;text-align:right;border-top:1px solid #e2e8f0;">${service.codigo_verificador}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #e2e8f0;">Tipo de Serviço</td>
        <td style="padding:12px 16px;color:#0f172a;font-size:14px;text-align:right;border-top:1px solid #e2e8f0;">${typeLabel}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #e2e8f0;">Data de Solicitação</td>
        <td style="padding:12px 16px;color:#0f172a;font-size:14px;text-align:right;border-top:1px solid #e2e8f0;">${fmtDate(service.created_at)}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #e2e8f0;">Último Status</td>
        <td style="padding:12px 16px;color:#0f172a;font-size:14px;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;">${stageLabel}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;border-top:1px solid #e2e8f0;">Data de Alteração</td>
        <td style="padding:12px 16px;color:#0f172a;font-size:14px;text-align:right;border-top:1px solid #e2e8f0;">${fmtDate(lastEntry?.data_alteracao ?? null)}</td>
      </tr>
    </table>

    <h3 style="color:#0f172a;font-size:15px;margin:24px 0 12px;">Andamentos</h3>
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
      ${historyHtmlRows}
    </table>

    <div style="text-align:center;margin:32px 0;">
      <a href="${trackingUrl}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:14px;">Acompanhar Protocolo</a>
    </div>

    <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:24px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">
      <strong>Observação:</strong> As informações de andamento são atualizadas manualmente por nossa equipe e podem não refletir, em tempo real, o estágio exato do serviço.
    </p>

    <p style="color:#64748b;font-size:12px;margin:16px 0 0;text-align:center;">
      Clemente Assessoria<br/>
      Rua Santa Rita, 454, Sala 203, Centro, Juiz de Fora/MG
    </p>
  </div>
</body></html>`;

    const raw = buildRawEmail(service.solicitante_email, subject, htmlBody, textBody);

    const gmailRes = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GMAIL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    });

    const gmailBody = await gmailRes.text();
    if (!gmailRes.ok) {
      const errMsg = `Gmail API ${gmailRes.status}: ${gmailBody}`;
      if (history_id) {
        await admin.from("service_status_history").update({
          email_sent: false,
          email_error: errMsg.slice(0, 500),
        }).eq("id", history_id);
      }
      throw new Error(errMsg);
    }

    if (history_id) {
      await admin.from("service_status_history").update({
        email_sent: true,
        email_sent_at: new Date().toISOString(),
        email_error: null,
      }).eq("id", history_id);
    }

    return new Response(JSON.stringify({ success: true, to: service.solicitante_email }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[send-status-email] erro:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});