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
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyInput } from "../MoneyInput";
import { ITBI_STATUS_LABEL, type PropertyItbi, type ItbiStatus } from "@/lib/serviceDocs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  itbi: PropertyItbi | null;
  onSaved: () => void;
}

export function ItbiDialog({ open, onOpenChange, serviceId, itbi, onSaved }: Props) {
  const isEdit = !!itbi;
  const [submitting, setSubmitting] = useState(false);

  const [prefectureUrl, setPrefectureUrl] = useState("");
  const [protocolNumber, setProtocolNumber] = useState("");
  const [protocolDate, setProtocolDate] = useState("");
  const [status, setStatus] = useState<ItbiStatus>("nao_iniciado");
  const [itbiValue, setItbiValue] = useState<number | null>(null);
  const [issuanceDate, setIssuanceDate] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [isIssued, setIsIssued] = useState(false);
  const [observations, setObservations] = useState("");

  useEffect(() => {
    if (!open) return;
    if (itbi) {
      setPrefectureUrl(itbi.prefecture_url ?? "");
      setProtocolNumber(itbi.protocol_number ?? "");
      setProtocolDate(itbi.protocol_date ?? "");
      setStatus(itbi.status);
      setItbiValue(itbi.itbi_value != null ? Number(itbi.itbi_value) : null);
      setIssuanceDate(itbi.issuance_date ?? "");
      setPaymentDate(itbi.payment_date ?? "");
      setIsIssued(itbi.is_issued);
      setObservations(itbi.observations ?? "");
    } else {
      setPrefectureUrl(""); setProtocolNumber(""); setProtocolDate("");
      setStatus("nao_iniciado"); setItbiValue(null);
      setIssuanceDate(""); setPaymentDate(""); setIsIssued(false); setObservations("");
    }
  }, [open, itbi]);

  const onSubmit = async () => {
    setSubmitting(true);
    const payload = {
      service_id: serviceId,
      prefecture_url: prefectureUrl || null,
      protocol_number: protocolNumber || null,
      protocol_date: protocolDate || null,
      status,
      itbi_value: itbiValue,
      issuance_date: issuanceDate || null,
      payment_date: paymentDate || null,
      is_issued: isIssued,
      observations: observations || null,
    };
    const result = isEdit && itbi
      ? await supabase.from("service_property_itbi").update(payload).eq("id", itbi.id)
      : await supabase.from("service_property_itbi").insert(payload);
    setSubmitting(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(isEdit ? "ITBI atualizado." : "ITBI cadastrado.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar guia de ITBI" : "Nova guia de ITBI"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Link do site da prefeitura</Label>
              <Input type="url" value={prefectureUrl} onChange={(e) => setPrefectureUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nº do protocolo</Label>
              <Input value={protocolNumber} onChange={(e) => setProtocolNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data do protocolo</Label>
              <Input type="date" value={protocolDate} onChange={(e) => setProtocolDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ItbiStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ITBI_STATUS_LABEL) as ItbiStatus[]).map((s) =>
                    <SelectItem key={s} value={s}>{ITBI_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor do ITBI</Label>
              <MoneyInput value={itbiValue} onChange={setItbiValue} />
            </div>

            <div className="md:col-span-2">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm">
                <Checkbox checked={isIssued} onCheckedChange={(v) => setIsIssued(!!v)} />
                Guia emitida (confirmação)
              </label>
            </div>

            {(status === "emitido" || isIssued) && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de emissão da guia</Label>
                  <Input type="date" value={issuanceDate} onChange={(e) => setIssuanceDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de pagamento</Label>
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
                </div>
              </>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} />
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
