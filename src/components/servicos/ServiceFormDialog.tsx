import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PROCESS_STEPS, SERVICE_TYPE_LABEL, STAGE_LABEL, STAGE_ORDER, TASK_STEPS,
  type ServiceStage, type ServiceType,
} from "@/lib/serviceUi";
import { NewServiceTypeStep } from "./NewServiceTypeStep";
import { ClientPicker, type PickedClient } from "./ClientPicker";
import type { Database } from "@/integrations/supabase/types";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRow | null; // null = create
  onSaved: () => void;
}

interface UserOption { id: string; name: string | null; email: string | null; }

export function ServiceFormDialog({ open, onOpenChange, service, onSaved }: Props) {
  const { user } = useAuth();
  const isEdit = !!service;

  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);
  const [type, setType] = useState<ServiceType | null>(service?.type ?? null);
  const [client, setClient] = useState<PickedClient | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);

  // Form fields
  const [subject, setSubject] = useState("");
  const [taskStep, setTaskStep] = useState<string>("Aguardando início");
  const [processStep, setProcessStep] = useState<string>("");
  const [stage, setStage] = useState<ServiceStage>("entrada");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [pastaFisica, setPastaFisica] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset on open / service change
  useEffect(() => {
    if (!open) return;
    if (service) {
      setStep(2);
      setType(service.type);
      setSubject(service.subject);
      setTaskStep(service.etapa_tarefa ?? "Aguardando início");
      setProcessStep(service.etapa_processo ?? "");
      setStage(service.stage);
      setDueDate(service.due_date ? new Date(service.due_date) : null);
      setAssignedTo(service.assigned_to ?? user?.id ?? "");
      setPastaFisica(service.pasta_fisica);
      // Load linked client
      if (service.client_id) {
        supabase
          .from("clients")
          .select("id, name, cpf_cnpj, email, phone")
          .eq("id", service.client_id)
          .maybeSingle()
          .then(({ data }) => setClient((data as PickedClient) ?? null));
      } else {
        setClient(null);
      }
    } else {
      setStep(1);
      setType(null);
      setClient(null);
      setSubject("");
      setTaskStep("Aguardando início");
      setProcessStep("");
      setStage("entrada");
      setDueDate(null);
      setAssignedTo(user?.id ?? "");
      setPastaFisica(false);
    }
  }, [open, service, user?.id]);

  // Load users for assignment
  useEffect(() => {
    if (!open) return;
    supabase
      .from("profiles")
      .select("id, name, email")
      .order("name")
      .then(({ data }) => setUsers((data ?? []) as UserOption[]));
  }, [open]);

  const processOptions = useMemo(() => (type ? PROCESS_STEPS[type] : []), [type]);

  const handleSelectType = (t: ServiceType) => {
    setType(t);
    setProcessStep(PROCESS_STEPS[t][0] ?? "");
    setStep(2);
  };

  const onSubmit = async () => {
    if (!type) return toast.error("Selecione o tipo de serviço.");
    if (!client) return toast.error("Selecione ou cadastre um cliente.");
    if (!subject.trim()) return toast.error("Informe o assunto do serviço.");

    setSubmitting(true);
    const previousStage = service?.stage;
    const payload = {
      type,
      client_id: client.id,
      subject: subject.trim(),
      etapa_tarefa: taskStep,
      etapa_processo: processStep || null,
      stage,
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      assigned_to: assignedTo || null,
      pasta_fisica: pastaFisica,
      completed_at: stage === "concluido" ? (service?.completed_at ?? new Date().toISOString()) : null,
    };

    let result;
    if (isEdit && service) {
      result = await supabase.from("services").update(payload).eq("id", service.id).select("id").maybeSingle();
    } else {
      result = await supabase.from("services").insert(payload).select("id").maybeSingle();
    }

    if (result.error) {
      setSubmitting(false);
      return toast.error(result.error.message);
    }

    // Activity log
    const serviceId = result.data?.id ?? service?.id;
    if (serviceId) {
      if (!isEdit) {
        await supabase.from("service_activity_log").insert({
          service_id: serviceId,
          user_id: user?.id ?? null,
          action: "created",
          payload: { type, stage, subject: payload.subject } as never,
        });
      } else {
        const changes: Record<string, unknown> = {};
        if (previousStage !== stage) changes.stage = { from: previousStage, to: stage };
        await supabase.from("service_activity_log").insert({
          service_id: serviceId,
          user_id: user?.id ?? null,
          action: previousStage !== stage ? "stage_changed" : "updated",
          payload: changes as never,
        });
      }
    }

    setSubmitting(false);
    toast.success(isEdit ? "Serviço atualizado." : "Serviço criado.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? "Editar serviço" : "Novo serviço"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Escolha o tipo de serviço para começar."
              : type && (
                  <span className="inline-flex items-center gap-2 text-xs">
                    {!isEdit && (
                      <button
                        onClick={() => setStep(1)}
                        type="button"
                        className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-muted"
                      >
                        <ChevronLeft className="h-3 w-3" /> voltar
                      </button>
                    )}
                    <span className="font-medium text-foreground">{SERVICE_TYPE_LABEL[type]}</span>
                    <span>›</span>
                    <span>Dados do serviço</span>
                  </span>
                )}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <NewServiceTypeStep onSelect={handleSelectType} />
        ) : (
          <div className="space-y-5">
            <section className="rounded-2xl border border-border bg-card/50 p-5">
              <h4 className="section-title mb-4">Cliente</h4>
              <ClientPicker value={client} onChange={setClient} />
            </section>

            <section className="rounded-2xl border border-border bg-card/50 p-5">
              <h4 className="section-title mb-4">Informações gerais</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Assunto *</Label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Escritura de compra e venda — Apto 201" />
                </div>

                <div className="space-y-2">
                  <Label>Etapa da Tarefa</Label>
                  <Select value={taskStep} onValueChange={setTaskStep}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TASK_STEPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Etapa do Processo</Label>
                  <Select value={processStep} onValueChange={setProcessStep}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {processOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status no Kanban</Label>
                  <Select value={stage} onValueChange={(v) => setStage(v as ServiceStage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGE_ORDER.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start font-normal", !dueDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate ?? undefined}
                        onSelect={(d) => setDueDate(d ?? null)}
                        className="pointer-events-auto p-3"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Responsável</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                    <SelectContent>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.email ?? u.id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Existe pasta física?</Label>
                  <RadioGroup
                    value={pastaFisica ? "sim" : "nao"}
                    onValueChange={(v) => setPastaFisica(v === "sim")}
                    className="flex gap-6"
                  >
                    <label className="flex items-center gap-2"><RadioGroupItem value="sim" id="pf-sim" /> Sim</label>
                    <label className="flex items-center gap-2"><RadioGroupItem value="nao" id="pf-nao" /> Não</label>
                  </RadioGroup>
                </div>
              </div>
            </section>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="button" onClick={onSubmit} disabled={submitting}>
                {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar serviço"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
