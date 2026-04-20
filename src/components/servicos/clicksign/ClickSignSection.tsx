import { useEffect, useMemo, useState } from "react";
import {
  FileSignature, Loader2, RefreshCw, Send, Ban, ExternalLink, Download, Mail,
  CheckCircle2, Clock, XCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelEnvelope, downloadSignedDocument, resendNotification,
  STATUS_LABEL, STATUS_COLOR, type EnvelopeStatus,
} from "@/lib/clicksign";
import { usePermissions } from "@/hooks/usePermissions";
import { NewEnvelopeDialog } from "./NewEnvelopeDialog";
import type { ServiceParty } from "@/lib/serviceDocs";
import type { EscrituraFields } from "@/lib/serviceFields";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Props {
  serviceId: string;
  parties: ServiceParty[];
  imovel: EscrituraFields["imovel"];
  onChanged?: () => void;
}

interface EnvelopeRow {
  id: string;
  envelope_type: string;
  clicksign_envelope_id: string;
  status: EnvelopeStatus;
  document_name: string;
  signed_document_drive_id: string | null;
  deadline_at: string | null;
  sent_at: string | null;
  signed_at: string | null;
  created_at: string;
  custom_variables: Record<string, unknown>;
}

interface SignerRow {
  id: string;
  envelope_id: string;
  clicksign_signer_id: string;
  signer_name: string;
  signer_email: string;
  status: "pending" | "signed" | "refused";
  signed_at: string | null;
}

export function ClickSignSection({ serviceId, parties, imovel, onChanged }: Props) {
  const { isAdminOrManager } = usePermissions();
  const [envelopes, setEnvelopes] = useState<EnvelopeRow[]>([]);
  const [signers, setSigners] = useState<SignerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<EnvelopeRow | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    const [envRes, sigRes] = await Promise.all([
      supabase
        .from("clicksign_envelopes")
        .select("*")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false }),
      supabase
        .from("clicksign_signers")
        .select("id,envelope_id,clicksign_signer_id,signer_name,signer_email,status,signed_at"),
    ]);
    setEnvelopes((envRes.data ?? []) as EnvelopeRow[]);
    setSigners((sigRes.data ?? []) as SignerRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (serviceId) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  const signersByEnv = useMemo(() => {
    const map: Record<string, SignerRow[]> = {};
    signers.forEach((s) => {
      (map[s.envelope_id] ??= []).push(s);
    });
    return map;
  }, [signers]);

  const handleResend = async (env: EnvelopeRow, signer: SignerRow) => {
    setWorking(`resend-${signer.id}`);
    const r = await resendNotification(env.clicksign_envelope_id, signer.clicksign_signer_id);
    setWorking(null);
    if (!r.ok) toast.error(`Falha ao reenviar: ${r.error}`);
    else toast.success(`Lembrete enviado para ${signer.signer_email}`);
  };

  const handleCancel = async (env: EnvelopeRow) => {
    setConfirmCancel(null);
    setWorking(`cancel-${env.id}`);
    const r = await cancelEnvelope(env.id);
    setWorking(null);
    if (!r.ok) toast.error(`Falha ao cancelar: ${r.error}`);
    else {
      toast.success("Envelope cancelado.");
      reload();
      onChanged?.();
    }
  };

  const handleDownload = async (env: EnvelopeRow) => {
    setWorking(`dl-${env.id}`);
    const r = await downloadSignedDocument(env.id);
    setWorking(null);
    if (!r.ok || !r.result?.success) {
      toast.error(`Falha: ${r.error ?? r.result?.error ?? "desconhecido"}`);
    } else {
      toast.success("PDF assinado salvo no Drive.");
      reload();
    }
  };

  const partiesWithCpf = parties.filter((p) => p.cpf_cnpj && p.email);

  return (
    <Card className="rounded-2xl border-border bg-card p-5 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-accent/10 p-2">
            <FileSignature className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="section-title">Assinaturas Digitais</h3>
            <p className="text-xs text-muted-foreground">
              Envie procurações e contratos para assinatura eletrônica via ClickSign.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={reload} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={partiesWithCpf.length === 0}
            className="gap-2"
            title={partiesWithCpf.length === 0 ? "Cadastre uma parte com CPF/CNPJ e e-mail antes" : ""}
          >
            <Send className="h-4 w-4" /> Nova Procuração ITBI
          </Button>
        </div>
      </div>

      {partiesWithCpf.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Cadastre ao menos uma parte com <strong>CPF/CNPJ e e-mail</strong> para emitir procurações.
        </div>
      ) : envelopes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
          Nenhum envelope enviado ainda. Clique em <strong>Nova Procuração ITBI</strong> para começar.
        </div>
      ) : (
        <div className="space-y-3">
          {envelopes.map((env) => {
            const envSigners = signersByEnv[env.id] ?? [];
            return (
              <div key={env.id} className="rounded-lg border border-border bg-background p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <FileSignature className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{env.document_name}</span>
                      <Badge className={STATUS_COLOR[env.status]}>
                        {env.status === "signed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        {env.status === "running" && <Clock className="mr-1 h-3 w-3" />}
                        {(env.status === "refused" || env.status === "expired" || env.status === "cancelled") &&
                          <XCircle className="mr-1 h-3 w-3" />}
                        {STATUS_LABEL[env.status]}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
                      {env.sent_at && (
                        <div>Enviado: {format(new Date(env.sent_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                      )}
                      {env.deadline_at && (
                        <div>Prazo: {format(new Date(env.deadline_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                      )}
                      {env.signed_at && (
                        <div>Assinado: {format(new Date(env.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                      )}
                    </div>

                    {envSigners.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {envSigners.map((s) => (
                          <div key={s.id} className="flex flex-wrap items-center gap-2 text-xs">
                            {s.status === "signed" ? (
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            ) : s.status === "refused" ? (
                              <XCircle className="h-3 w-3 text-destructive" />
                            ) : (
                              <Clock className="h-3 w-3 text-amber-600" />
                            )}
                            <span className="font-medium">{s.signer_name}</span>
                            <span className="text-muted-foreground">({s.signer_email})</span>
                            {env.status === "running" && s.status === "pending" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 gap-1 px-2 text-xs"
                                onClick={() => handleResend(env, s)}
                                disabled={working === `resend-${s.id}`}
                              >
                                {working === `resend-${s.id}`
                                  ? <Loader2 className="h-3 w-3 animate-spin" />
                                  : <Mail className="h-3 w-3" />}
                                Reenviar
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-3" />

                <div className="flex flex-wrap gap-2">
                  {env.status === "running" && isAdminOrManager && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => setConfirmCancel(env)}
                      disabled={working === `cancel-${env.id}`}
                    >
                      <Ban className="h-3 w-3" /> Cancelar envelope
                    </Button>
                  )}
                  {env.status === "signed" && !env.signed_document_drive_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleDownload(env)}
                      disabled={working === `dl-${env.id}`}
                    >
                      {working === `dl-${env.id}`
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Download className="h-3 w-3" />}
                      Baixar PDF assinado
                    </Button>
                  )}
                  {env.signed_document_drive_id && (
                    <Button size="sm" variant="ghost" className="gap-2" asChild>
                      <a
                        href={`https://drive.google.com/file/d/${env.signed_document_drive_id}/view`}
                        target="_blank"
                        rel="noopener"
                      >
                        <ExternalLink className="h-3 w-3" /> Ver no Drive
                      </a>
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="gap-2" asChild>
                    <a
                      href={`https://app.clicksign.com/envelopes/${env.clicksign_envelope_id}`}
                      target="_blank"
                      rel="noopener"
                    >
                      <ExternalLink className="h-3 w-3" /> Ver no ClickSign
                    </a>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NewEnvelopeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        serviceId={serviceId}
        parties={parties}
        imovel={imovel}
        onCreated={() => {
          reload();
          onChanged?.();
        }}
      />

      <ConfirmDialog
        open={!!confirmCancel}
        onOpenChange={(o) => !o && setConfirmCancel(null)}
        title="Cancelar envelope?"
        description={`Esta ação cancelará "${confirmCancel?.document_name}" no ClickSign. Os signatários receberão notificação. Esta ação não pode ser desfeita.`}
        confirmLabel="Cancelar envelope"
        variant="destructive"
        onConfirm={() => confirmCancel && handleCancel(confirmCancel)}
      />
    </Card>
  );
}
