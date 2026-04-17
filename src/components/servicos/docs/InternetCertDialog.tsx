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
import {
  INTERNET_CERT_DEFAULTS, INTERNET_STATUS_LABEL, BR_STATES,
  type InternetCertificate, type InternetCertificateType, type InternetCertificateStatus,
  type ServiceParty,
} from "@/lib/serviceDocs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  cert: InternetCertificate | null;
  defaultType?: InternetCertificateType | null;
  vendorParties: ServiceParty[];
  onSaved: () => void;
}

const ALL_TYPES: InternetCertificateType[] = [
  "tjmg_civel", "trf6_fisico", "trf6_eproc", "tst", "trt3", "receita_federal", "outra",
];

export function InternetCertDialog({
  open, onOpenChange, serviceId, cert, defaultType, vendorParties, onSaved,
}: Props) {
  const isEdit = !!cert;
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<InternetCertificateType>("tjmg_civel");
  const [customName, setCustomName] = useState("");
  const [partyId, setPartyId] = useState<string>("none");
  const [comarca, setComarca] = useState("");
  const [state, setState] = useState("MG");
  const [requestDate, setRequestDate] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [status, setStatus] = useState<InternetCertificateStatus>("pendente");
  const [protocol, setProtocol] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (cert) {
      setType(cert.certificate_type);
      setCustomName(cert.custom_name ?? "");
      setPartyId(cert.party_id ?? "none");
      setComarca(cert.comarca ?? "");
      setState(cert.state ?? "MG");
      setRequestDate(cert.request_date ?? "");
      setIssuedDate(cert.issued_date ?? "");
      setStatus(cert.status);
      setProtocol(cert.protocol_number ?? "");
      setNotes(cert.notes ?? "");
    } else {
      setType(defaultType ?? "tjmg_civel");
      setCustomName(""); setPartyId("none"); setComarca(""); setState("MG");
      setRequestDate(""); setIssuedDate(""); setStatus("pendente");
      setProtocol(""); setNotes("");
    }
  }, [open, cert, defaultType]);

  const onSubmit = async () => {
    if (type === "outra" && !customName.trim()) {
      return toast.error("Informe o nome da certidão customizada.");
    }
    setSubmitting(true);
    const payload = {
      service_id: serviceId,
      party_id: partyId === "none" ? null : partyId,
      certificate_type: type,
      custom_name: type === "outra" ? customName.trim() : null,
      comarca: comarca || null,
      state: state || null,
      request_date: requestDate || null,
      issued_date: issuedDate || null,
      status,
      protocol_number: protocol || null,
      notes: notes || null,
    };
    const result = isEdit && cert
      ? await supabase.from("service_internet_certificates").update(payload).eq("id", cert.id)
      : await supabase.from("service_internet_certificates").insert(payload);
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
          <DialogTitle>{isEdit ? "Editar certidão de internet" : "Nova certidão de internet"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as InternetCertificateType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_TYPES.map((t) => {
                    const def = INTERNET_CERT_DEFAULTS.find((d) => d.type === t);
                    const label = t === "outra" ? "Outra (customizada)" : def?.label ?? t;
                    return <SelectItem key={t} value={t}>{label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            {type === "outra" && (
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Nome customizado *</Label>
                <Input value={customName} onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ex: TJSP Cível, TRF3..." />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Comarca</Label>
              <Input value={comarca} onChange={(e) => setComarca(e.target.value)} placeholder="Ex: Juiz de Fora/MG" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">UF</Label>
              <Select value={state} onValueChange={setState}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Em nome de qual parte vendedora</Label>
              <Select value={partyId} onValueChange={setPartyId}>
                <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Nenhuma —</SelectItem>
                  {vendorParties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data do pedido</Label>
              <Input type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as InternetCertificateStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTERNET_STATUS_LABEL) as InternetCertificateStatus[]).map((s) =>
                    <SelectItem key={s} value={s}>{INTERNET_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data de emissão</Label>
              <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nº do protocolo</Label>
              <Input value={protocol} onChange={(e) => setProtocol(e.target.value)} />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs">Observações</Label>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            ℹ️ Validade automática de 30 dias a partir da data do pedido.
          </p>
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
