import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MoneyInput } from "@/components/servicos/MoneyInput";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  RECEITA_CATEGORIES, DESPESA_CATEGORIES, PAYMENT_METHODS,
  type FinanceEntry, type FinanceType, type FinanceStatus,
} from "@/lib/finance";

interface ServiceLite { id: string; subject: string; }
interface ClientLite { id: string; name: string; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: FinanceEntry | null;
  onSaved: () => void;
  /** Pré-preenchimento (ex: vindo da conclusão de uma Escritura) */
  prefill?: Partial<{
    type: FinanceType;
    description: string;
    amount: number;
    category: string;
    service_id: string;
    client_id: string;
  }>;
}

export function FinanceFormDialog({ open, onOpenChange, entry, onSaved, prefill }: Props) {
  const { user } = useAuth();
  const isEdit = !!entry;

  const [type, setType] = useState<FinanceType>("receita");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<FinanceStatus>("pago");
  const [serviceId, setServiceId] = useState<string>("");
  const [clientId, setClientId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);

  const [services, setServices] = useState<ServiceLite[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);

  useEffect(() => {
    if (!open) return;
    supabase.from("services").select("id, subject").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setServices((data ?? []) as ServiceLite[]));
    supabase.from("clients").select("id, name").order("name").limit(500)
      .then(({ data }) => setClients((data ?? []) as ClientLite[]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (entry) {
      setType(entry.type);
      setDescription(entry.description);
      setAmount(Number(entry.amount));
      setDate(new Date(entry.date + "T00:00:00"));
      setDueDate(entry.due_date ? new Date(entry.due_date + "T00:00:00") : null);
      setCategory(entry.category ?? "");
      setStatus(entry.status);
      setServiceId(entry.service_id ?? "");
      setClientId(entry.client_id ?? "");
      setPaymentMethod(entry.payment_method ?? "");
      setDocumentNumber(entry.document_number ?? "");
      setNotes(entry.notes ?? "");
    } else {
      const t = (prefill?.type ?? "receita") as FinanceType;
      setType(t);
      setDescription(prefill?.description ?? "");
      setAmount(prefill?.amount ?? null);
      setDate(new Date());
      setDueDate(null);
      setCategory(prefill?.category ?? "");
      setStatus(t === "receita" ? "pago" : "pago");
      setServiceId(prefill?.service_id ?? "");
      setClientId(prefill?.client_id ?? "");
      setPaymentMethod("");
      setDocumentNumber("");
      setNotes("");
    }
    setExtraOpen(false);
    // Refocus description shortly after open
    setTimeout(() => {
      const el = document.getElementById("fin-description");
      el?.focus();
    }, 100);
  }, [open, entry, prefill]);

  const categoryOptions = type === "receita" ? RECEITA_CATEGORIES : DESPESA_CATEGORIES;

  const onSubmit = async () => {
    if (!description.trim()) return toast.error("Informe uma descrição.");
    if (!amount || amount <= 0) return toast.error("Valor deve ser maior que zero.");
    if (status === "pendente" && !dueDate) return toast.error("Para lançamentos pendentes, informe o vencimento.");
    setSubmitting(true);

    const payload = {
      type, description: description.trim(), amount,
      date: format(date, "yyyy-MM-dd"),
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      category: category || null,
      status,
      service_id: serviceId || null,
      client_id: clientId || null,
      payment_method: paymentMethod || null,
      document_number: documentNumber || null,
      notes: notes || null,
    };

    let error;
    if (isEdit && entry) {
      ({ error } = await supabase.from("finance_entries").update(payload).eq("id", entry.id));
    } else {
      ({ error } = await supabase.from("finance_entries").insert({ ...payload, created_by: user?.id ?? null }));
    }

    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Lançamento atualizado." : "Lançamento criado.");
    onSaved();
    onOpenChange(false);
  };

  const typeBtnCls = (val: FinanceType, active: boolean) => cn(
    "flex-1 rounded-lg border-2 py-3 text-sm font-semibold transition",
    active
      ? val === "receita"
        ? "border-success bg-success text-success-foreground"
        : "border-destructive bg-destructive text-destructive-foreground"
      : "border-border bg-card hover:bg-muted/40"
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? "Editar lançamento" : "Novo lançamento"}
          </DialogTitle>
        </DialogHeader>

        {/* Tipo */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setType("receita")} className={typeBtnCls("receita", type === "receita")}>
            Receita
          </button>
          <button type="button" onClick={() => setType("despesa")} className={typeBtnCls("despesa", type === "despesa")}>
            Despesa
          </button>
        </div>

        {/* Dados principais */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="fin-description" className="text-xs">Descrição *</Label>
            <Input id="fin-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Escritura - Cliente X" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Valor *</Label>
              <MoneyInput value={amount} onChange={setAmount} />
            </div>
            <div>
              <Label className="text-xs">Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="pointer-events-auto p-3" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FinanceStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">{type === "receita" ? "Recebido" : "Pago"}</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === "pendente" && (
            <div>
              <Label className="text-xs">Vencimento *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start font-normal", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate ?? undefined} onSelect={(d) => setDueDate(d ?? null)} className="pointer-events-auto p-3" />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label className="text-xs">Vincular a serviço</Label>
              <Select value={serviceId || "none"} onValueChange={(v) => setServiceId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vincular a cliente</Label>
              <Select value={clientId || "none"} onValueChange={(v) => setClientId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="px-0 text-muted-foreground">
                <ChevronDown className={cn("mr-1 h-4 w-4 transition-transform", extraOpen && "rotate-180")} />
                Detalhes adicionais
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Forma de pagamento</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Nº do documento</Label>
                  <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="NFS-e, boleto..." />
                </div>
              </div>
              <div>
                <Label className="text-xs">Observações</Label>
                <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar lançamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
