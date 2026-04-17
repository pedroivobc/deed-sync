import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "../MoneyInput";
import {
  CIVIL_CERT_LABEL, CIVIL_CERT_FOR_PF, CIVIL_CERT_FOR_PJ, CIVIL_STATUS_LABEL,
  computeValidity,
  type ServiceParty, type CivilCertificate, type CivilCertificateType, type CivilCertificateStatus,
} from "@/lib/serviceDocs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  party: ServiceParty;
  cert: CivilCertificate | null;
  onSaved: () => void;
}

export function CivilCertDialog({ open, onOpenChange, serviceId, party, cert, onSaved }: Props) {
  const isEdit = !!cert;
  const [submitting, setSubmitting] = useState(false);

  const allowed = party.person_type === "PF" ? CIVIL_CERT_FOR_PF : CIVIL_CERT_FOR_PJ;

  const [type, setType] = useState<CivilCertificateType>(allowed[0]);
  const [status, setStatus] = useState<CivilCertificateStatus>("pendente");
  const [requestDate, setRequestDate] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [initialPayment, setInitialPayment] = useState<number | null>(null);
  const [complementaryPayment, setComplementaryPayment] = useState<number | null>(null);
  const [isIssued, setIsIssued] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (cert) {
      setType(cert.certificate_type);
      setStatus(cert.status);
      setRequestDate(cert.request_date ?? "");
      setIssuedDate(cert.issued_date ?? "");
      setInitialPayment(cert.initial_payment != null ? Number(cert.initial_payment) : null);
      setComplementaryPayment(cert.complementary_payment != null ? Number(cert.complementary_payment) : null);
      setIsIssued(cert.is_issued);
      setNotes(cert.notes ?? "");
    } else {
      setType(allowed[0]);
      setStatus("pendente");
      setRequestDate(""); setIssuedDate("");
      setInitialPayment(null); setComplementaryPayment(null);
      setIsIssued(false); setNotes("");
    }
  }, [open, cert, allowed]);

  const totalPaid = (initialPayment ?? 0) + (complementaryPayment ?? 0);
  const validityDays = type === "estado_civil" ? 90 : 30;
  const previewExpiration = issuedDate ? (() => {
    const d = new Date(issuedDate); d.setDate(d.getDate() + validityDays);
    return d.toISOString().slice(0, 10);
  })() : null;
  const validity = computeValidity(previewExpiration);

  const onSubmit = async () => {
    if (isIssued && !issuedDate) return toast.error("Informe a data de emissão.");

    setSubmitting(true);
    const payload = {
      service_id: serviceId,
      party_id: party.id,
      certificate_type: type,
      status,
      request_date: requestDate || null,
      issued_date: issuedDate || null,
      initial_payment: initialPayment,
      complementary_payment: complementaryPayment,
      is_issued: isIssued,
      notes: notes || null,
    };
    const result = isEdit && cert
      ? await supabase.from("service_civil_certificates").update(payload).eq("id", cert.id)
      : await supabase.from("service_civil_certificates").insert(payload);
    setSubmitting(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(isEdit ? "Certidão atualizada." : "Certidão cadastrada.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar certidão" : "Adicionar certidão"} — {party.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Tipo de certidão *</Label>
              <Select value={type} onValueChange={(v) => setType(v as CivilCertificateType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allowed.map((t) => <SelectItem key={t} value={t}>{CIVIL_CERT_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data do pedido</Label>
              <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as CivilCertificateStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CIVIL_STATUS_LABEL) as CivilCertificateStatus[]).map((s) =>
                    <SelectItem key={s} value={s}>{CIVIL_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Pagamento inicial</Label>
              <MoneyInput value={initialPayment} onChange={setInitialPayment} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Complemento</Label>
              <MoneyInput value={complementaryPayment} onChange={setComplementaryPayment} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Total pago</Label>
              <Input value={`R$ ${totalPaid.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} disabled />
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-2.5">
                <Switch checked={isIssued} onCheckedChange={setIsIssued} />
                <span className="text-sm font-medium">Confirmar emissão</span>
              </label>
            </div>

            {isIssued && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de emissão *</Label>
                  <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Validade ({validityDays} dias)</Label>
                  <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-muted/30 px-3 text-sm">
                    {previewExpiration ? new Date(previewExpiration).toLocaleDateString("pt-BR") : "—"}
                    {previewExpiration && (
                      <Badge className={validity.badgeClass}>{validity.label}</Badge>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Salvando..." : isEdit ? "Salvar" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
