import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Phone, MessageCircle, Pencil, CalendarIcon } from "lucide-react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  STATUS_LABEL, STATUS_BADGE, CATEGORY_LABEL, CHANNEL_LABEL, getInitials,
  type ContactChannel,
} from "@/lib/clientUi";
import type { Database } from "@/integrations/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type FinanceRow = Database["public"]["Tables"]["finance_entries"]["Row"];
type ContactRow = Database["public"]["Tables"]["client_contacts"]["Row"];

const STAGE_LABEL: Record<string, string> = {
  entrada: "Entrada", documentacao: "Documentação", analise: "Em Análise",
  execucao: "Em Execução", revisao: "Revisão", concluido: "Concluído",
};
const STAGE_BG: Record<string, string> = {
  entrada: "bg-[hsl(var(--stage-entrada))/0.15] text-foreground",
  documentacao: "bg-[hsl(var(--stage-documentacao))/0.15] text-[hsl(var(--stage-documentacao))]",
  analise: "bg-[hsl(var(--stage-analise))/0.15] text-[hsl(var(--stage-analise))]",
  execucao: "bg-accent/15 text-foreground",
  revisao: "bg-[hsl(var(--stage-revisao))/0.15] text-[hsl(var(--stage-revisao))]",
  concluido: "bg-[hsl(var(--stage-concluido))/0.15] text-[hsl(var(--stage-concluido))]",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRow | null;
  onEdit: (c: ClientRow) => void;
  onChanged?: () => void;
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ClientDetailsDialog({ open, onOpenChange, client, onEdit, onChanged }: Props) {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [finance, setFinance] = useState<FinanceRow[]>([]);
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(false);

  // register-contact mini form
  const [showAdd, setShowAdd] = useState(false);
  const [cDate, setCDate] = useState<Date>(new Date());
  const [cChannel, setCChannel] = useState<ContactChannel>("whatsapp");
  const [cDesc, setCDesc] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !client) return;
    setLoading(true);
    Promise.all([
      supabase.from("services").select("*").eq("client_id", client.id).order("created_at", { ascending: false }),
      supabase.from("finance_entries").select("*").eq("client_id", client.id).order("date", { ascending: false }),
      supabase.from("client_contacts").select("*").eq("client_id", client.id).order("contact_date", { ascending: false }),
    ]).then(([s, f, c]) => {
      setServices((s.data ?? []) as ServiceRow[]);
      setFinance((f.data ?? []) as FinanceRow[]);
      setContacts((c.data ?? []) as ContactRow[]);
      setLoading(false);
    });
  }, [open, client]);

  if (!client) return null;

  const totalReceita = finance
    .filter((f) => f.type === "receita" && f.status === "pago")
    .reduce((acc, f) => acc + Number(f.amount), 0);

  const phoneDigits = (client.phone ?? "").replace(/\D/g, "");
  const waDigits = (client.whatsapp ?? "").replace(/\D/g, "");

  const submitContact = async () => {
    if (!cDesc.trim()) return toast.error("Descreva o contato.");
    setSaving(true);
    const { error } = await supabase.from("client_contacts").insert({
      client_id: client.id,
      contact_date: cDate.toISOString(),
      channel: cChannel,
      description: cDesc.trim(),
      created_by: user?.id ?? null,
    });
    if (!error) {
      // Update last_contact on client
      await supabase
        .from("clients")
        .update({ last_contact: format(cDate, "yyyy-MM-dd") })
        .eq("id", client.id);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Contato registrado.");
    setShowAdd(false);
    setCDesc("");
    // reload
    const { data } = await supabase
      .from("client_contacts").select("*").eq("client_id", client.id)
      .order("contact_date", { ascending: false });
    setContacts((data ?? []) as ContactRow[]);
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Detalhes do cliente</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-3">
          {/* LEFT */}
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent text-accent-foreground font-display text-3xl font-bold">
                {getInitials(client.name)}
              </div>
              <h3 className="mt-3 font-display text-2xl font-semibold">{client.name}</h3>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <Badge className={STATUS_BADGE[client.status]}>{STATUS_LABEL[client.status]}</Badge>
                <Badge variant="outline">{CATEGORY_LABEL[client.category]}</Badge>
                <Badge variant="outline">{client.type}</Badge>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
              {client.cpf_cnpj && (
                <div>
                  <div className="text-xs text-muted-foreground">{client.type === "PF" ? "CPF" : "CNPJ"}</div>
                  <div className="font-medium">{client.cpf_cnpj}</div>
                </div>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-foreground hover:text-accent">
                  <Mail className="h-4 w-4" /> {client.email}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${phoneDigits}`} className="flex items-center gap-2 text-foreground hover:text-accent">
                  <Phone className="h-4 w-4" /> {client.phone}
                </a>
              )}
              {client.whatsapp && (
                <a href={`https://wa.me/55${waDigits}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-foreground hover:text-accent">
                  <MessageCircle className="h-4 w-4" /> {client.whatsapp}
                </a>
              )}
              {client.address && (
                <div>
                  <div className="text-xs text-muted-foreground">Endereço</div>
                  <div>{client.address}</div>
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground">Cliente desde</div>
                <div>{format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
              </div>
            </div>

            <Button className="w-full gap-2" onClick={() => onEdit(client)}>
              <Pencil className="h-4 w-4" /> Editar cliente
            </Button>
          </div>

          {/* RIGHT */}
          <div className="md:col-span-2">
            <Tabs defaultValue="servicos">
              <TabsList>
                <TabsTrigger value="servicos">Serviços ({services.length})</TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro ({finance.length})</TabsTrigger>
                <TabsTrigger value="timeline">Timeline ({contacts.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="servicos" className="mt-4 space-y-2">
                {loading ? <p className="text-sm text-muted-foreground">Carregando...</p>
                  : services.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum serviço vinculado.</p>
                  ) : services.map((s) => (
                    <div key={s.id} className="flex items-start justify-between rounded-xl border border-border p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{s.type}</Badge>
                          <Badge className={cn("capitalize", STAGE_BG[s.stage])}>{STAGE_LABEL[s.stage]}</Badge>
                        </div>
                        <div className="mt-1 truncate font-medium">{s.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          Entrada: {format(new Date(s.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  ))}
              </TabsContent>

              <TabsContent value="financeiro" className="mt-4 space-y-2">
                {loading ? <p className="text-sm text-muted-foreground">Carregando...</p>
                  : finance.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum lançamento.</p>
                  ) : (
                    <>
                      {finance.map((f) => (
                        <div key={f.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{f.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(f.date), "dd/MM/yyyy", { locale: ptBR })} • {f.status}
                            </div>
                          </div>
                          <div className={cn("font-semibold", f.type === "receita" ? "text-success" : "text-destructive")}>
                            {f.type === "despesa" ? "-" : ""}{fmtBRL(Number(f.amount))}
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-xl bg-accent/10 p-3 text-sm font-semibold">
                        <span>Receita já recebida deste cliente</span>
                        <span className="text-success">{fmtBRL(totalReceita)}</span>
                      </div>
                    </>
                  )}
              </TabsContent>

              <TabsContent value="timeline" className="mt-4 space-y-3">
                {loading ? <p className="text-sm text-muted-foreground">Carregando...</p>
                  : contacts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum contato registrado ainda.</p>
                  ) : (
                    <ol className="space-y-2">
                      {contacts.map((c) => (
                        <li key={c.id} className="rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">{CHANNEL_LABEL[c.channel]}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(c.contact_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {c.description && <p className="mt-2 text-sm">{c.description}</p>}
                        </li>
                      ))}
                    </ol>
                  )}

                {!showAdd ? (
                  <Button variant="outline" onClick={() => setShowAdd(true)}>Registrar contato</Button>
                ) : (
                  <div className="space-y-3 rounded-xl border border-border p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Data</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start font-normal">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {format(cDate, "dd/MM/yyyy", { locale: ptBR })}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={cDate} onSelect={(d) => d && setCDate(d)} className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Canal</label>
                        <Select value={cChannel} onValueChange={(v) => setCChannel(v as ContactChannel)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Descrição</label>
                      <Textarea rows={3} value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="Resumo da conversa..." />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setShowAdd(false)} disabled={saving}>Cancelar</Button>
                      <Button onClick={submitContact} disabled={saving}>
                        {saving ? "Salvando..." : "Salvar contato"}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
