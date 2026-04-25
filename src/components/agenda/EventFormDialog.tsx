import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify, humanizeBackendError } from "@/lib/notify";
import type { AgendaEventType } from "@/hooks/useAgendaEvents";

const TYPES: { value: AgendaEventType; label: string }[] = [
  { value: "reuniao", label: "Reunião" },
  { value: "atendimento_cliente", label: "Atendimento ao cliente" },
  { value: "assinatura_prevista", label: "Assinatura prevista" },
  { value: "assinatura_realizada", label: "Assinatura realizada" },
  { value: "prazo_servico", label: "Prazo de serviço" },
  { value: "outro", label: "Outro" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** yyyy-mm-dd to prefill the date */
  defaultDate?: string;
  onSaved: () => void;
}

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventFormDialog({ open, onOpenChange, defaultDate, onSaved }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<AgendaEventType>("reuniao");
  const [allDay, setAllDay] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = defaultDate ? new Date(`${defaultDate}T09:00:00`) : new Date();
    setTitle("");
    setDescription("");
    setEventType("reuniao");
    setAllDay(false);
    setStartAt(toLocalInput(base));
    const end = new Date(base.getTime() + 60 * 60 * 1000);
    setEndAt(toLocalInput(end));
    setLocation("");
  }, [open, defaultDate]);

  const submit = async () => {
    if (!title.trim()) {
      notify.error("Informe o título do evento.");
      return;
    }
    if (!startAt) {
      notify.error("Informe a data/hora de início.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("calendar_events").insert({
      title: title.trim(),
      description: description.trim() || null,
      event_type: eventType,
      all_day: allDay,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      location: location.trim() || null,
      source: "manual",
      created_by: user?.id ?? null,
      owner_id: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      notify.error(humanizeBackendError(error.message));
      return;
    }
    notify.success("Evento criado.");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="evt-title">Título</Label>
            <Input
              id="evt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Reunião com cliente João"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={eventType} onValueChange={(v) => setEventType(v as AgendaEventType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
              <Label htmlFor="all-day" className="mb-2">Dia inteiro</Label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="evt-start">Início</Label>
              <Input
                id="evt-start"
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="evt-end">Fim</Label>
              <Input
                id="evt-end"
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="evt-loc">Local</Label>
            <Input
              id="evt-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div>
            <Label htmlFor="evt-desc">Descrição</Label>
            <Textarea
              id="evt-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Opcional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}