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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { maskCpfCnpj, maskPhoneBR, isValidCPF, isValidCNPJ } from "@/lib/masks";
import {
  PARTY_ROLE_LABEL, MARITAL_STATUS_OPTIONS, BR_STATES, SIGNATURE_MODE_LABEL,
  type ServiceParty, type PartyRole, type PartyPersonType, type SignatureMode,
} from "@/lib/serviceDocs";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  serviceId: string;
  party: ServiceParty | null;
  onSaved: () => void;
}

const ROLES: PartyRole[] = [
  "comprador", "vendedor", "socio_comprador", "socio_vendedor",
  "outorgante", "outorgado", "interveniente", "outros",
];

export function PartyFormDialog({ open, onOpenChange, serviceId, party, onSaved }: Props) {
  const isEdit = !!party;
  const [submitting, setSubmitting] = useState(false);

  const [role, setRole] = useState<PartyRole>("comprador");
  const [personType, setPersonType] = useState<PartyPersonType>("PF");
  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [rg, setRg] = useState("");
  const [cnh, setCnh] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [profession, setProfession] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [nationality, setNationality] = useState("Brasileira");
  const [address, setAddress] = useState("");
  const [companyState, setCompanyState] = useState("MG");
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("presencial");
  const [hasDigitalCert, setHasDigitalCert] = useState<boolean | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    if (party) {
      setRole(party.role);
      setPersonType(party.person_type);
      setName(party.name ?? "");
      setCpfCnpj(party.cpf_cnpj ?? "");
      setRg(party.rg ?? "");
      setCnh(party.cnh ?? "");
      setEmail(party.email ?? "");
      setPhone(party.phone ?? "");
      setProfession(party.profession ?? "");
      setMaritalStatus(party.marital_status ?? "");
      setNationality(party.nationality ?? "Brasileira");
      setAddress(party.address ?? "");
      setCompanyState(party.company_state ?? "MG");
      setSignatureMode(party.signature_mode);
      setHasDigitalCert(party.has_digital_certificate);
      setNotes(party.notes ?? "");
    } else {
      setRole("comprador");
      setPersonType("PF");
      setName(""); setCpfCnpj(""); setRg(""); setCnh("");
      setEmail(""); setPhone(""); setProfession("");
      setMaritalStatus(""); setNationality("Brasileira");
      setAddress(""); setCompanyState("MG");
      setSignatureMode("presencial"); setHasDigitalCert(null); setNotes("");
    }
  }, [open, party]);

  const showDigitalCertQ = signatureMode === "online" || signatureMode === "hibrida";

  const onSubmit = async () => {
    if (!name.trim()) return toast.error("Informe o nome ou razão social.");
    if (cpfCnpj) {
      const valid = personType === "PF" ? isValidCPF(cpfCnpj) : isValidCNPJ(cpfCnpj);
      if (!valid) return toast.error(`${personType === "PF" ? "CPF" : "CNPJ"} inválido.`);
    }
    if (personType === "PF" && !rg.trim() && !cnh.trim()) {
      return toast.error("Informe RG ou CNH.");
    }

    setSubmitting(true);
    const payload = {
      service_id: serviceId,
      role, person_type: personType,
      name: name.trim(),
      cpf_cnpj: cpfCnpj || null,
      rg: personType === "PF" ? (rg || null) : null,
      cnh: personType === "PF" ? (cnh || null) : null,
      email: email || null,
      phone: phone || null,
      profession: profession || null,
      marital_status: personType === "PF" ? (maritalStatus || null) : null,
      nationality: personType === "PF" ? (nationality || "Brasileira") : null,
      address: address || null,
      company_state: personType === "PJ" ? (companyState || null) : null,
      signature_mode: signatureMode,
      has_digital_certificate: showDigitalCertQ ? hasDigitalCert : null,
      notes: notes || null,
    };

    const result = isEdit && party
      ? await supabase.from("service_parties").update(payload).eq("id", party.id)
      : await supabase.from("service_parties").insert(payload);

    setSubmitting(false);
    if (result.error) return toast.error(result.error.message);
    toast.success(isEdit ? "Parte atualizada." : "Parte cadastrada.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar parte" : "Adicionar parte"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* A) Papel */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Papel no processo</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Papel *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as PartyRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r}>{PARTY_ROLE_LABEL[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo</Label>
                <RadioGroup
                  value={personType}
                  onValueChange={(v) => setPersonType(v as PartyPersonType)}
                  className="flex h-10 items-center gap-6"
                >
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="PF" id="pt-pf" /> Pessoa Física</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="PJ" id="pt-pj" /> Pessoa Jurídica</label>
                </RadioGroup>
              </div>
            </div>
          </section>

          {/* B) Dados */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Dados principais</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">{personType === "PF" ? "Nome completo" : "Razão social"} *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{personType === "PF" ? "CPF" : "CNPJ"}</Label>
                <Input value={cpfCnpj} onChange={(e) => setCpfCnpj(maskCpfCnpj(e.target.value, personType))} />
              </div>
              {personType === "PF" ? (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Estado civil</Label>
                    <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUS_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">RG</Label>
                    <Input value={rg} onChange={(e) => setRg(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">CNH (alternativa ao RG)</Label>
                    <Input value={cnh} onChange={(e) => setCnh(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Profissão</Label>
                    <Input value={profession} onChange={(e) => setProfession(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nacionalidade</Label>
                    <Input value={nationality} onChange={(e) => setNationality(e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs">UF da empresa *</Label>
                    <Select value={companyState} onValueChange={setCompanyState}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(maskPhoneBR(e.target.value))} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs">Endereço completo</Label>
                <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            {personType === "PJ" && (
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                ℹ️ Após cadastrar a empresa, cadastre os sócios como partes adicionais com papel "Sócio Comprador" ou "Sócio Vendedor".
              </p>
            )}
          </section>

          {/* C) Assinatura */}
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-accent">Modelo de assinatura</h4>
            <RadioGroup
              value={signatureMode}
              onValueChange={(v) => setSignatureMode(v as SignatureMode)}
              className="grid gap-2 md:grid-cols-3"
            >
              {(["online", "presencial", "hibrida"] as SignatureMode[]).map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <RadioGroupItem value={m} /> {SIGNATURE_MODE_LABEL[m]}
                </label>
              ))}
            </RadioGroup>

            {showDigitalCertQ && (
              <div className="space-y-2">
                <Label className="text-xs">Possui certificado digital?</Label>
                <RadioGroup
                  value={hasDigitalCert === null ? "" : hasDigitalCert ? "sim" : "nao"}
                  onValueChange={(v) => setHasDigitalCert(v === "sim")}
                  className="flex gap-6"
                >
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="sim" /> Sim</label>
                  <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="nao" /> Não</label>
                </RadioGroup>
                {hasDigitalCert === false && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Cliente precisará emitir certificado digital antes da assinatura.</span>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-1.5">
            <Label className="text-xs">Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </section>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Cadastrar parte"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
