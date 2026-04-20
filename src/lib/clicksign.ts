import { supabase } from "@/integrations/supabase/client";

export type EnvelopeType = "procuracao_itbi" | "contrato_assessoria" | "declaracao" | "outro";
export type EnvelopeStatus = "draft" | "running" | "signed" | "cancelled" | "refused" | "expired" | "error";

export interface ClickSignTestResult {
  ok: boolean;
  configured: boolean;
  environment: string;
  api_base?: string;
  message: string;
  status?: number;
}

export interface ClickSignSignerInput {
  name: string;
  email: string;
  cpf_cnpj?: string;
  phone?: string;
  party_id?: string | null;
}

export interface CreateEnvelopeInput {
  service_id: string | null;
  party_id: string | null;
  client_id: string | null;
  envelope_type: EnvelopeType;
  document_name: string;
  pdf_base64: string;
  template_id?: string | null;
  template_name?: string | null;
  custom_variables?: Record<string, unknown>;
  signers: ClickSignSignerInput[];
  deadline_days?: number;
  auto_send?: boolean;
}

export interface CreateEnvelopeResult {
  success: boolean;
  envelope_id: string;
  clicksign_envelope_id: string;
  clicksign_document_id: string;
  status: EnvelopeStatus;
  signers_count: number;
}

async function callClickSign<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<{ ok: boolean; result?: T; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke("clicksign-manager", {
      body: { action, params },
    });
    if (error) return { ok: false, error: error.message };
    if (data && typeof data === "object" && "ok" in data) {
      const d = data as { ok: boolean; result?: T; error?: string };
      return d;
    }
    return { ok: true, result: data as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function testClickSignConnection() {
  return callClickSign<ClickSignTestResult>("test_connection");
}

export async function createEnvelopeFromPdf(input: CreateEnvelopeInput) {
  return callClickSign<CreateEnvelopeResult>("create_envelope_from_pdf", input as unknown as Record<string, unknown>);
}

export async function getEnvelopeStatus(clicksign_envelope_id: string) {
  return callClickSign<{ success: boolean; status: string }>("get_envelope_status", {
    clicksign_envelope_id,
  });
}

export async function cancelEnvelope(envelope_id: string) {
  return callClickSign<{ success: boolean }>("cancel_envelope", { envelope_id });
}

export async function resendNotification(clicksign_envelope_id: string, clicksign_signer_id: string) {
  return callClickSign<{ success: boolean }>("resend_notification", {
    clicksign_envelope_id,
    clicksign_signer_id,
  });
}

export async function downloadSignedDocument(envelope_id: string) {
  return callClickSign<{ success: boolean; drive_file_id?: string; error?: string }>(
    "download_signed_document",
    { envelope_id },
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Template variable rendering
// ───────────────────────────────────────────────────────────────────────────────

export function renderTemplate(html: string, variables: Record<string, unknown>): string {
  return html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const value = variables[key];
    if (value === undefined || value === null || value === "") return `_______`;
    return String(value);
  });
}

// ───────────────────────────────────────────────────────────────────────────────
// PDF generation (frontend) — uses jsPDF + html2canvas
// ───────────────────────────────────────────────────────────────────────────────

export async function htmlToPdfBase64(html: string): Promise<string> {
  // Lazy import to keep main bundle small
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  // Render in an off-screen iframe-like container
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px"; // A4 width @ 96dpi
  container.style.background = "#ffffff";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const arrayBuffer = pdf.output("arraybuffer");
    let binary = "";
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  } finally {
    document.body.removeChild(container);
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Status helpers
// ───────────────────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<EnvelopeStatus, string> = {
  draft: "Rascunho",
  running: "Aguardando assinatura",
  signed: "Assinado",
  cancelled: "Cancelado",
  refused: "Recusado",
  expired: "Expirado",
  error: "Erro",
};

export const STATUS_COLOR: Record<EnvelopeStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  running: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  signed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-muted text-muted-foreground line-through",
  refused: "bg-destructive/15 text-destructive",
  expired: "bg-destructive/15 text-destructive",
  error: "bg-destructive/15 text-destructive",
};
