import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  PROCESS_STEPS, SERVICE_TYPE_BADGE, SERVICE_TYPE_LABEL, STAGE_BADGE_CLASS,
  STAGE_LABEL, STAGE_ORDER, TASK_STEPS, type ServiceStage, type ServiceType,
} from "@/lib/serviceUi";
import {
  computeProgress, emptyForType, overallProgress,
  type AnyCustomFields, type AvulsoFields, type EscrituraFields, type RegularizacaoFields,
} from "@/lib/serviceFields";
import { NewServiceTypeStep } from "./NewServiceTypeStep";
import { ClientPicker, type PickedClient } from "./ClientPicker";
import { FormSection } from "./FormSection";
import { EscrituraForm } from "./forms/EscrituraForm";
import { AvulsoForm } from "./forms/AvulsoForm";
import { RegularizacaoForm } from "./forms/RegularizacaoForm";
import { ProgressPanel } from "./ProgressPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { CompleteConfirmDialog } from "./CompleteConfirmDialog";
import { DriveFolderButton } from "@/components/DriveFolderButton";
import { callDrive } from "@/lib/drive";
import type { Database, Json } from "@/integrations/supabase/types";

type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: ServiceRow | null;
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

  // General fields
  const [subject, setSubject] = useState("");
  const [taskStep, setTaskStep] = useState<string>("Aguardando início");
  const [processStep, setProcessStep] = useState<string>("");
  const [stage, setStage] = useState<ServiceStage>("entrada");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [pastaFisica, setPastaFisica] = useState(false);

  // Custom fields
  const [customFields, setCustomFields] = useState<AnyCustomFields>(emptyForType("escritura"));

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [pendingStageOnComplete, setPendingStageOnComplete] = useState<ServiceStage | null>(null);
  const [logRefresh, setLogRefresh] = useState(0);

  // Initialize on open / service change
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
      // parse custom_fields — fallback to empty for type
      const base = emptyForType(service.type);
      const parsed = service.custom_fields && typeof service.custom_fields === "object"
        ? (service.custom_fields as unknown as Record<string, unknown>) : {};
      setCustomFields({ ...base, ...parsed } as AnyCustomFields);
      // Load linked client
      if (service.client_id) {
        supabase.from("clients").select("id, name, cpf_cnpj, email, phone")
          .eq("id", service.client_id).maybeSingle()
          .then(({ data }) => setClient((data as PickedClient) ?? null));
      } else setClient(null);
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
      setCustomFields(emptyForType("escritura"));
    }
  }, [open, service, user?.id]);

  useEffect(() => {
    if (!open) return;
    supabase.from("profiles").select("id, name, email").order("name")
      .then(({ data }) => setUsers((data ?? []) as UserOption[]));
  }, [open]);

  const processOptions = useMemo(() => (type ? PROCESS_STEPS[type] : []), [type]);
  const sections = useMemo(
    () => (type ? computeProgress(type, customFields) : []),
    [type, customFields]
  );
  const overall = useMemo(() => overallProgress(sections), [sections]);

  const handleSelectType = (t: ServiceType) => {
    setType(t);
    setProcessStep(PROCESS_STEPS[t][0] ?? "");
    setCustomFields(emptyForType(t));
    setStep(2);
  };

  const handleStageChange = (next: ServiceStage) => {
    if (next === "concluido" && stage !== "concluido") {
      setPendingStageOnComplete(next);
      setCompleteOpen(true);
      return;
    }
    setStage(next);
  };

  const onConfirmComplete = (data: { docs_delivered: boolean; final_notes: string; create_revenue: boolean }) => {
    if (pendingStageOnComplete) {
      setStage(pendingStageOnComplete);
      setPendingStageOnComplete(null);
    }
    setCompleteOpen(false);
    // Stash flag in customFields — saved on submit + log entry on save
    (customFields as unknown as Record<string, unknown>)._pending_completion = data;
    setCustomFields({ ...customFields });
    toast.success("Conclusão preparada — clique em Salvar para confirmar.");
  };

  // Suggested revenue (Escritura): valor de compra
  const suggestedRevenue =
    type === "escritura"
      ? (((customFields as EscrituraFields)?.financeiro?.valor_compra ?? null) as number | null)
      : null;

  const logChange = async (
    serviceId: string,
    action: string,
    payload: Record<string, unknown>
  ) => {
    await supabase.from("service_activity_log").insert({
      service_id: serviceId, user_id: user?.id ?? null,
      action, payload: payload as unknown as Json,
    });
  };

  const onSubmit = async () => {
    if (!type) return toast.error("Selecione o tipo de serviço.");
    if (!client) return toast.error("Selecione ou cadastre um cliente.");
    if (!subject.trim()) return toast.error("Informe o assunto do serviço.");

    setSubmitting(true);

    // Detach pending completion
    const cf = { ...customFields } as Record<string, unknown>;
    const pendingCompletion = cf._pending_completion as
      | { docs_delivered: boolean; final_notes: string } | undefined;
    delete cf._pending_completion;

    const previous = service;
    const completed_at =
      stage === "concluido"
        ? service?.completed_at ?? new Date().toISOString()
        : null;

    const payload = {
      type, client_id: client.id, subject: subject.trim(),
      etapa_tarefa: taskStep, etapa_processo: processStep || null,
      stage, due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
      assigned_to: assignedTo || null, pasta_fisica: pastaFisica,
      completed_at, custom_fields: cf as unknown as Json,
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

    const serviceId = result.data?.id ?? service?.id;
    if (serviceId) {
      if (!isEdit) {
        await logChange(serviceId, "created", { type, stage, subject: payload.subject });
        // Fire-and-forget: create Google Drive folder structure
        const matricula = type === "escritura"
          ? ((cf.imovel as Record<string, unknown> | undefined)?.matricula_numero as string | undefined)
          : undefined;
        callDrive("create_service_folder", {
          service_id: serviceId,
          type,
          client_name: client.name,
          subject: payload.subject,
          matricula,
        }).then((res) => {
          if (!res.ok) {
            console.warn("Drive folder creation failed:", res.error);
          }
        });
      } else if (previous) {
        if (previous.stage !== stage) {
          await logChange(serviceId, "stage_changed", { from: previous.stage, to: stage });
        }
        if ((previous.etapa_tarefa ?? "") !== taskStep) {
          await logChange(serviceId, "task_step_changed", { from: previous.etapa_tarefa, to: taskStep });
        }
        if ((previous.etapa_processo ?? "") !== processStep) {
          await logChange(serviceId, "process_step_changed", { from: previous.etapa_processo, to: processStep });
        }
        // Financial diff (escritura only)
        if (type === "escritura") {
          const prevFin = ((previous.custom_fields as Record<string, unknown>)?.financeiro ?? {}) as Record<string, unknown>;
          const nextFin = (cf.financeiro ?? {}) as Record<string, unknown>;
          if (JSON.stringify(prevFin) !== JSON.stringify(nextFin)) {
            await logChange(serviceId, "financial_changed", { changed: true });
          }
        }
      }
      if (pendingCompletion) {
        await logChange(serviceId, "completed", pendingCompletion as unknown as Record<string, unknown>);

        // Auto-create revenue entry for Escritura when requested
        if (
          (pendingCompletion as { create_revenue?: boolean }).create_revenue &&
          type === "escritura"
        ) {
          const valor = (cf.financeiro as Record<string, unknown> | undefined)?.valor_compra as number | undefined;
          if (valor && valor > 0) {
            const today = new Date().toISOString().slice(0, 10);
            const { error: finErr } = await supabase.from("finance_entries").insert({
              type: "receita",
              status: "pago",
              amount: valor,
              description: `Escritura — ${subject.trim()}`,
              category: "Escritura",
              date: today,
              service_id: serviceId,
              client_id: client.id,
              created_by: user?.id ?? null,
            });
            if (finErr) {
              toast.error("Serviço concluído, mas falhou ao criar receita: " + finErr.message);
            } else {
              toast.success("Receita vinculada criada no Financeiro.");
            }
          }
        }
      }
    }

    setSubmitting(false);
    toast.success(isEdit ? "Serviço atualizado." : "Serviço criado.");
    onOpenChange(false);
    onSaved();
  };

  const jumpTo = (key: string) => {
    document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-[92vh] max-w-5xl flex-col gap-0 overflow-hidden p-0">
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {step === 2 && type && !isEdit && (
                <Button variant="ghost" size="icon" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="min-w-0">
                <h2 className="truncate font-display text-xl">
                  {step === 1
                    ? "Novo serviço"
                    : isEdit
                      ? client?.name ?? "Carregando cliente..."
                      : "Novo serviço"}
                </h2>
                {type && step === 2 && (
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Badge className={cn("text-[10px] uppercase", SERVICE_TYPE_BADGE[type])}>
                      {SERVICE_TYPE_LABEL[type]}
                    </Badge>
                    <Badge className={cn("text-xs", STAGE_BADGE_CLASS[stage])}>
                      {STAGE_LABEL[stage]}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isEdit && service && type && (
                <DriveFolderButton
                  entityType="service"
                  entityId={service.id}
                  serviceType={type}
                  clientName={client?.name ?? null}
                  subject={subject}
                  matricula={
                    type === "escritura"
                      ? ((customFields as EscrituraFields)?.imovel?.numero_matricula as string | undefined) ?? null
                      : null
                  }
                />
              )}
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 1 ? (
              <NewServiceTypeStep onSelect={handleSelectType} />
            ) : (
              <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                <div className="min-w-0 space-y-5">
                  {/* Cliente */}
                  <FormSection title="Cliente" id="section-cliente">
                    <ClientPicker value={client} onChange={setClient} />
                  </FormSection>

                  {/* Informações gerais */}
                  <FormSection title="Informações gerais" id="section-gerais">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-xs">Assunto *</Label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ex: Escritura — Apto 201" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Etapa da Tarefa</Label>
                        <Select value={taskStep} onValueChange={setTaskStep}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {TASK_STEPS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Etapa do Processo</Label>
                        <Select value={processStep} onValueChange={setProcessStep}>
                          <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                          <SelectContent>
                            {processOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Status no Kanban</Label>
                        <Select value={stage} onValueChange={(v) => handleStageChange(v as ServiceStage)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STAGE_ORDER.map((s) => <SelectItem key={s} value={s}>{STAGE_LABEL[s]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Prazo</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start font-normal", !dueDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dueDate ? format(dueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={dueDate ?? undefined}
                              onSelect={(d) => setDueDate(d ?? null)}
                              className="pointer-events-auto p-3" />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Responsável</Label>
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
                        <Label className="text-xs">Existe pasta física?</Label>
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
                  </FormSection>

                  {/* Tipo-specific forms */}
                  {type === "escritura" && (
                    <div id="section-escritura-wrapper">
                      <SectionsWrapper>
                        <EscrituraForm
                          value={customFields as EscrituraFields}
                          onChange={(v) => setCustomFields(v)}
                          serviceId={service?.id ?? null}
                        />
                      </SectionsWrapper>
                    </div>
                  )}
                  {type === "avulso" && (
                    <SectionsWrapper>
                      <AvulsoForm
                        value={customFields as AvulsoFields}
                        onChange={(v) => setCustomFields(v)}
                      />
                    </SectionsWrapper>
                  )}
                  {type === "regularizacao" && (
                    <SectionsWrapper>
                      <RegularizacaoForm
                        value={customFields as RegularizacaoFields}
                        onChange={(v) => setCustomFields(v)}
                      />
                    </SectionsWrapper>
                  )}

                  {/* Activity timeline only when editing */}
                  {isEdit && service && (
                    <FormSection title="Histórico de atividades" id="section-historico">
                      <ActivityTimeline serviceId={service.id} refreshKey={logRefresh} />
                    </FormSection>
                  )}
                </div>

                {/* Right column: Progress panel */}
                <div className="space-y-4 lg:sticky lg:top-2 lg:h-fit">
                  <ProgressPanel
                    sections={sections}
                    overall={overall}
                    onJump={jumpTo}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky Footer */}
          {step === 2 && (
            <div className="sticky bottom-0 z-20 flex items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={onSubmit} disabled={submitting}>
                {submitting ? "Salvando..." : isEdit ? "Salvar alterações" : "Criar serviço"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CompleteConfirmDialog
        open={completeOpen}
        onOpenChange={(o) => {
          setCompleteOpen(o);
          if (!o) setPendingStageOnComplete(null);
        }}
        onConfirm={onConfirmComplete}
        suggestedRevenue={suggestedRevenue}
      />
    </>
  );
}

// Utility wrapper to give an anchor id for the type-specific form sections
function SectionsWrapper({ children }: { children: React.ReactNode }) {
  // Wraps with id-able anchors: each FormSection inside already has `id` attribute when provided.
  return <div className="space-y-5">{children}</div>;
}
