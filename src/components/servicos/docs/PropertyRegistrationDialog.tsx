import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MoneyInput } from "../MoneyInput";
import {
  PROP_REG_TYPE_LABEL, PROP_REG_STATUS_LABEL, computeValidity,
  type PropertyRegistration, type PropertyRegistrationType, type PropertyRegistrationStatus,
} from "@/lib/serviceDocs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  registration: PropertyRegistration | null;
  onSaved: () => void;
}

export function PropertyRegistrationDialog({
  open, onOpenChange, serviceId, registration, onSaved,
}: Props) {
  const isEdit = !!registration;
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<PropertyRegistrationType>("inteiro_teor");
  const [requestDate, setRequestDate] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [onrProtocol, setOnrProtocol] = useState("");
  const [isReleased, setIsReleased] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number | null>(null);
  const [status, setStatus] = useState<PropertyRegistrationStatus>("pendente");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (registration) {
      setType(registration.registration_type);
      setRequestDate(registration.request_date ?? "");
      setIssuedDate(registration.issued_date ?? "");
      setOnrProtocol(registration.onr_protocol ?? "");
      setIsReleased(registration.is_released);
      setAmountPaid(registration.amount_paid != null ? Number(registration.amount_paid) : null);
      setStatus(registration.status);
      setNotes(registration.notes ?? "");
    } else {
      setType("inteiro_teor");
      setRequestDate(""); setIssuedDate(""); setOnrProtocol("");
      setIsReleased(false); setAmountPaid(null);
      setStatus("pendente"); setNotes("");
    }
  }, [open, registration]);

  const protocolWarning = onrProtocol && !onrProtocol.toUpperCase().startsWith("P");
  const previewExp = issuedDate ? (() => {
    const d = new Date(issuedDate); d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  })() : null;
  const validity = computeValidity(previewExp);

  const onSubmit = async () => {
    setSubmitting(true);
    const payload = {
      service_id: serviceId,
      registration_type: type,
      request_date: requestDate || null,
      issued_date: issuedDate || null,
      onr_protocol: onrProtocol || null,
      is_released: isReleased,
      amount_paid: amountPaid,
      status,
      notes: notes || null,
    };
    const result = isEdit && registration
      ? await supabase.from("service_property_registration").update(payload).eq("id", registration.id)
      : await supabase.from("service_property_registration").insert(payload);
    setSubmitting(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(isEdit ? "Matrícula atualizada." : "Matrícula cadastrada.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar matrícula" : "Nova matrícula do imóvel"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Tipo de certidão *</Label>
              <Select value={type} onValueChange={(v) => setType(v as PropertyRegistrationType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROP_REG_TYPE_LABEL) as PropertyRegistrationType[]).map((t) =>
                    <SelectItem key={t} value={t}>{PROP_REG_TYPE_LABEL[t]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data da requisição</Label>
              <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data da emissão</Label>
              <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Protocolo ONR</Label>
              <Input value={onrProtocol} onChange={(e) => setOnrProtocol(e.target.value)} placeholder="P2026-..." />
              {protocolWarning && (
                <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Protocolo ONR geralmente começa com "P". Confirme se está correto.
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Valor pago</Label>
              <MoneyInput value={amountPaid} onChange={setAmountPaid} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PropertyRegistrationStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROP_REG_STATUS_LABEL) as PropertyRegistrationStatus[]).map((s) =>
                    <SelectItem key={s} value={s}>{PROP_REG_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <Checkbox checked={isReleased} onCheckedChange={(v) => setIsReleased(!!v)} />
                Liberação confirmada
              </label>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Validade (emissão + 30 dias)</Label>
              <div className="flex h-10 items-center gap-2 rounded-md border border-input bg-muted/30 px-3 text-sm">
                {previewExp ? new Date(previewExp).toLocaleDateString("pt-BR") : "—"}
                {previewExp && <Badge className={validity.badgeClass}>{validity.label}</Badge>}
              </div>
            </div>

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
