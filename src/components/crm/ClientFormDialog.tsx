import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  isValidCPF, isValidCNPJ, maskCpfCnpj, maskPhoneBR, maskCEP, onlyDigits,
} from "@/lib/masks";
import {
  ORIGIN_LABEL, STATUS_LABEL, CATEGORY_LABEL, CONTACT_PREF_LABEL, CHANNEL_LABEL,
  type ClientStatus, type ClientCategory, type ClientOrigin, type ContactPref, type ContactChannel,
} from "@/lib/clientUi";
import type { Database } from "@/integrations/supabase/types";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];

const schema = z.object({
  type: z.enum(["PF", "PJ"]),
  cpf_cnpj: z.string().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Informe o nome").max(150),
  // PF
  profession: z.string().max(120).optional().or(z.literal("")),
  birthday: z.date().optional().nullable(),
  // PJ
  company: z.string().max(150).optional().or(z.literal("")),
  contact_person: z.string().max(150).optional().or(z.literal("")),
  // contato
  email: z.string().email("E-mail inválido").max(255).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  whatsapp: z.string().max(20).optional().or(z.literal("")),
  preferred_contact: z.enum(["whatsapp", "telefone", "email", "presencial"]).optional(),
  street: z.string().max(150).optional().or(z.literal("")),
  number: z.string().max(20).optional().or(z.literal("")),
  complement: z.string().max(80).optional().or(z.literal("")),
  district: z.string().max(80).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  uf: z.string().max(2).optional().or(z.literal("")),
  cep: z.string().max(10).optional().or(z.literal("")),
  // relacionamento
  origin: z.enum([
    "indicacao","corretor_parceiro","imobiliaria","organico","site","recorrente","cartorio_parceiro","outros",
  ]),
  referred_by: z.string().max(150).optional().or(z.literal("")),
  status: z.enum(["ativo", "inativo", "vip", "risco"]),
  category: z.enum(["regular", "recorrente", "premium", "unico"]),
  preferred_cartorio: z.string().max(150).optional().or(z.literal("")),
  satisfaction_nps: z.number().min(0).max(10).optional().nullable(),
  // pos venda
  last_contact: z.date().optional().nullable(),
  next_followup: z.date().optional().nullable(),
  last_contact_channel: z.enum(["whatsapp","telefone","email","presencial","outros"]).optional(),
  notes: z.string().max(2000).optional().or(z.literal("")),
  internal_notes: z.string().max(2000).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.cpf_cnpj && data.cpf_cnpj.trim() !== "") {
    if (data.type === "PF" && !isValidCPF(data.cpf_cnpj)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cpf_cnpj"], message: "CPF inválido" });
    }
    if (data.type === "PJ" && !isValidCNPJ(data.cpf_cnpj)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["cpf_cnpj"], message: "CNPJ inválido" });
    }
  }
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRow | null;
  onSaved: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-5">
      <h4 className="section-title mb-4">{title}</h4>
      {children}
    </div>
  );
}

function parseAddress(addr?: string | null) {
  // best-effort: stored as a single text. Initial ed. starts empty if not parseable.
  return { street: "", number: "", complement: "", district: "", city: "", uf: "", cep: "", raw: addr ?? "" };
}

function joinAddress(v: FormValues): string | null {
  const parts = [
    [v.street, v.number].filter(Boolean).join(", "),
    v.complement,
    v.district,
    [v.city, v.uf].filter(Boolean).join(" - "),
    v.cep ? `CEP ${v.cep}` : "",
  ].filter((p) => p && p.trim() !== "");
  return parts.length ? parts.join(" • ") : null;
}

export function ClientFormDialog({ open, onOpenChange, client, onSaved }: Props) {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canSeeInternalNotes = can("view_internal_notes");
  const [submitting, setSubmitting] = useState(false);

  const defaults = useMemo<FormValues>(() => {
    const a = parseAddress(client?.address);
    return {
      type: (client?.type as "PF" | "PJ") ?? "PF",
      cpf_cnpj: client?.cpf_cnpj ?? "",
      name: client?.name ?? "",
      profession: client?.profession ?? "",
      birthday: client?.birthday ? new Date(client.birthday) : null,
      company: client?.company ?? "",
      contact_person: "",
      email: client?.email ?? "",
      phone: client?.phone ?? "",
      whatsapp: client?.whatsapp ?? "",
      preferred_contact: (client?.preferred_contact as ContactPref) ?? undefined,
      street: a.street, number: a.number, complement: a.complement,
      district: a.district, city: a.city, uf: a.uf, cep: a.cep,
      origin: (client?.origin as ClientOrigin) ?? "indicacao",
      referred_by: client?.referred_by ?? "",
      status: (client?.status as ClientStatus) ?? "ativo",
      category: (client?.category as ClientCategory) ?? "regular",
      preferred_cartorio: client?.preferred_cartorio ?? "",
      satisfaction_nps: client?.satisfaction_nps ?? 7,
      last_contact: client?.last_contact ? new Date(client.last_contact) : null,
      next_followup: client?.next_followup ? new Date(client.next_followup) : null,
      last_contact_channel: undefined,
      notes: client?.notes ?? "",
      internal_notes: client?.internal_notes ?? "",
    };
  }, [client]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  useEffect(() => {
    form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults, open]);

  const type = form.watch("type");
  const origin = form.watch("origin");
  const nps = form.watch("satisfaction_nps") ?? 7;

  const npsLabel =
    nps <= 6 ? { txt: "Detrator", cls: "text-destructive" }
    : nps <= 8 ? { txt: "Neutro", cls: "text-warning" }
    : { txt: "Promotor", cls: "text-success" };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const address = joinAddress(values);
    const payload: Database["public"]["Tables"]["clients"]["Insert"] = {
      type: values.type,
      name: values.name.trim(),
      cpf_cnpj: values.cpf_cnpj?.trim() || null,
      profession: values.type === "PF" ? values.profession?.trim() || null : null,
      birthday: values.type === "PF" && values.birthday ? format(values.birthday, "yyyy-MM-dd") : null,
      company: values.type === "PJ" ? values.company?.trim() || null : null,
      email: values.email?.trim() || null,
      phone: values.phone?.trim() || null,
      whatsapp: values.whatsapp?.trim() || null,
      preferred_contact: values.preferred_contact ?? null,
      address,
      origin: values.origin,
      referred_by: values.origin === "indicacao" ? values.referred_by?.trim() || null : null,
      status: values.status,
      category: values.category,
      preferred_cartorio: values.preferred_cartorio?.trim() || null,
      satisfaction_nps: values.satisfaction_nps ?? null,
      last_contact: values.last_contact ? format(values.last_contact, "yyyy-MM-dd") : null,
      next_followup: values.next_followup ? format(values.next_followup, "yyyy-MM-dd") : null,
      notes: values.notes?.trim() || null,
      internal_notes: values.internal_notes?.trim() || null,
    };

    let error;
    if (client) {
      ({ error } = await supabase.from("clients").update(payload).eq("id", client.id));
    } else {
      ({ error } = await supabase.from("clients").insert({ ...payload, created_by: user?.id ?? null }));
    }

    // Optionally log first contact when creating with last_contact set
    if (!error && !client && values.last_contact && values.last_contact_channel) {
      // we need the new client id to log; skipping if not available
    }

    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(client ? "Cliente atualizado." : "Cliente cadastrado.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {client ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
          <DialogDescription>
            Mantenha os dados atualizados — quanto mais completo o cadastro, melhor o pós-venda.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* SEÇÃO 1: IDENTIFICAÇÃO */}
          <Section title="Identificação">
            <div className="space-y-4">
              <Controller
                control={form.control} name="type"
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    {(["PF", "PJ"] as const).map((opt) => (
                      <button
                        key={opt} type="button"
                        onClick={() => field.onChange(opt)}
                        className={cn(
                          "rounded-xl border-2 p-4 text-center transition-all",
                          field.value === opt
                            ? "border-accent bg-accent/10 font-semibold"
                            : "border-border hover:border-accent/50"
                        )}
                      >
                        <div className="font-display text-xl">{opt === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</div>
                        <div className="text-xs text-muted-foreground">{opt === "PF" ? "CPF" : "CNPJ"}</div>
                      </button>
                    ))}
                  </div>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{type === "PF" ? "CPF" : "CNPJ"}</Label>
                  <Controller
                    control={form.control} name="cpf_cnpj"
                    render={({ field }) => (
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(maskCpfCnpj(e.target.value, type))}
                        placeholder={type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                      />
                    )}
                  />
                  {form.formState.errors.cpf_cnpj && (
                    <p className="text-xs text-destructive">{form.formState.errors.cpf_cnpj.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{type === "PF" ? "Nome completo *" : "Razão social *"}</Label>
                  <Input {...form.register("name")} />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
              </div>

              {type === "PF" ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Profissão</Label>
                    <Input {...form.register("profession")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Aniversário</Label>
                    <Controller
                      control={form.control} name="birthday"
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start font-normal", !field.value && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={field.onChange}
                              captionLayout="dropdown"
                              fromYear={1920} toYear={new Date().getFullYear()}
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Nome fantasia</Label>
                    <Input {...form.register("company")} />
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável / Contato principal</Label>
                    <Input {...form.register("contact_person")} placeholder="Nome do responsável" />
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* SEÇÃO 2: CONTATO */}
          <Section title="Contato">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Controller
                  control={form.control} name="phone"
                  render={({ field }) => (
                    <Input value={field.value ?? ""} onChange={(e) => field.onChange(maskPhoneBR(e.target.value))} placeholder="(00) 00000-0000" />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Controller
                  control={form.control} name="whatsapp"
                  render={({ field }) => (
                    <Input value={field.value ?? ""} onChange={(e) => field.onChange(maskPhoneBR(e.target.value))} placeholder="(00) 00000-0000" />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Canal preferido</Label>
                <Controller
                  control={form.control} name="preferred_contact"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CONTACT_PREF_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-12">
              <div className="space-y-2 md:col-span-7"><Label>Rua</Label><Input {...form.register("street")} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Número</Label><Input {...form.register("number")} /></div>
              <div className="space-y-2 md:col-span-3"><Label>Complemento</Label><Input {...form.register("complement")} /></div>
              <div className="space-y-2 md:col-span-4"><Label>Bairro</Label><Input {...form.register("district")} /></div>
              <div className="space-y-2 md:col-span-4"><Label>Cidade</Label><Input {...form.register("city")} /></div>
              <div className="space-y-2 md:col-span-1"><Label>UF</Label><Input maxLength={2} {...form.register("uf")} /></div>
              <div className="space-y-2 md:col-span-3">
                <Label>CEP</Label>
                <Controller
                  control={form.control} name="cep"
                  render={({ field }) => (
                    <Input value={field.value ?? ""} onChange={(e) => field.onChange(maskCEP(e.target.value))} placeholder="00000-000" />
                  )}
                />
              </div>
            </div>
          </Section>

          {/* SEÇÃO 3: RELACIONAMENTO E VENDAS */}
          <Section title="Relacionamento e Vendas">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Origem do cliente *</Label>
                <Controller
                  control={form.control} name="origin"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ORIGIN_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              {origin === "indicacao" && (
                <div className="space-y-2">
                  <Label>Indicado por</Label>
                  <Input {...form.register("referred_by")} placeholder="Nome de quem indicou" />
                </div>
              )}
            </div>

            <div className="mt-4 space-y-2">
              <Label>Status</Label>
              <Controller
                control={form.control} name="status"
                render={({ field }) => (
                  <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {(Object.keys(STATUS_LABEL) as ClientStatus[]).map((s) => {
                      const colorMap: Record<ClientStatus, string> = {
                        ativo: "data-[state=checked]:border-success data-[state=checked]:bg-success/10",
                        inativo: "data-[state=checked]:border-muted-foreground data-[state=checked]:bg-muted",
                        vip: "data-[state=checked]:border-accent data-[state=checked]:bg-accent/15",
                        risco: "data-[state=checked]:border-destructive data-[state=checked]:bg-destructive/10",
                      };
                      const checked = field.value === s;
                      return (
                        <label
                          key={s}
                          data-state={checked ? "checked" : "unchecked"}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2.5 transition-all",
                            "border-border",
                            colorMap[s]
                          )}
                        >
                          <RadioGroupItem value={s} className="sr-only" />
                          <span className="text-sm font-medium">{STATUS_LABEL[s]}</span>
                        </label>
                      );
                    })}
                  </RadioGroup>
                )}
              />
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Controller
                  control={form.control} name="category"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Cartório de preferência</Label>
                <Input {...form.register("preferred_cartorio")} />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label>Satisfação NPS</Label>
                <span className={cn("text-sm font-semibold", npsLabel.cls)}>
                  {nps} — {npsLabel.txt}
                </span>
              </div>
              <Controller
                control={form.control} name="satisfaction_nps"
                render={({ field }) => (
                  <Slider
                    min={0} max={10} step={1}
                    value={[field.value ?? 7]}
                    onValueChange={(v) => field.onChange(v[0])}
                  />
                )}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 Detrator</span><span>7 Neutro</span><span>10 Promotor</span>
              </div>
            </div>
          </Section>

          {/* SEÇÃO 4: ACOMPANHAMENTO PÓS-VENDA */}
          <Section title="Acompanhamento Pós-Venda">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Último contato</Label>
                <Controller
                  control={form.control} name="last_contact"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start font-normal", !field.value && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Próximo follow-up</Label>
                <Controller
                  control={form.control} name="next_followup"
                  render={({ field }) => (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start font-normal", !field.value && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Meio do último contato</Label>
                <Controller
                  control={form.control} name="last_contact_channel"
                  render={({ field }) => (
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(CHANNEL_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Label>Observações do cliente</Label>
              <p className="text-xs text-muted-foreground">Informações que podem ser compartilhadas com o cliente.</p>
              <Textarea rows={3} {...form.register("notes")} />
            </div>

            <div className="mt-4 space-y-2">
              <Label>Notas internas</Label>
              <p className="text-xs text-muted-foreground">Notas confidenciais da equipe (não compartilhar com cliente).</p>
              <Textarea
                rows={3}
                className="bg-accent/5 focus-visible:bg-accent/5"
                {...form.register("internal_notes")}
              />
            </div>
          </Section>

          <DialogFooter className="sticky bottom-0 -mx-6 border-t bg-background px-6 py-3">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvando..." : client ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
