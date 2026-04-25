import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek,
  format, isSameDay, isSameMonth, startOfMonth, startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus, CalendarDays, Link2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAgendaEvents, type AgendaEvent } from "@/hooks/useAgendaEvents";
import { EventFormDialog } from "@/components/agenda/EventFormDialog";
import { cn } from "@/lib/utils";

type View = "month" | "week";

const TYPE_COLOR: Record<AgendaEvent["event_type"], string> = {
  vencimento_certidao: "bg-warning/15 text-warning border-warning/30",
  assinatura_prevista: "bg-info/15 text-info border-info/30",
  assinatura_realizada: "bg-success/15 text-success border-success/30",
  atendimento_cliente: "bg-accent/15 text-accent-foreground border-accent/30",
  prazo_servico: "bg-destructive/15 text-destructive border-destructive/30",
  reuniao: "bg-primary/15 text-primary border-primary/30",
  outro: "bg-muted text-muted-foreground border-border",
};

function isoDay(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function Agenda() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(new Date());
  const [onlyMine, setOnlyMine] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | undefined>(undefined);

  const range = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
      const end = addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }), 1);
      return { start, end };
    }
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    const end = addDays(endOfWeek(cursor, { weekStartsOn: 0 }), 1);
    return { start, end };
  }, [cursor, view]);

  const { events, loading } = useAgendaEvents({
    fromIso: isoDay(range.start),
    toIso: isoDay(range.end),
    onlyMine,
  });

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) }),
    [range],
  );

  const eventsByDay = useMemo(() => {
    const m = new Map<string, AgendaEvent[]>();
    for (const e of events) {
      const d = isoDay(new Date(e.start_at));
      const arr = m.get(d) ?? [];
      arr.push(e);
      m.set(d, arr);
    }
    return m;
  }, [events]);

  const goPrev = () => setCursor((c) => (view === "month" ? addMonths(c, -1) : addWeeks(c, -1)));
  const goNext = () => setCursor((c) => (view === "month" ? addMonths(c, 1) : addWeeks(c, 1)));
  const goToday = () => setCursor(new Date());

  const onEventClick = (e: AgendaEvent) => {
    if (e.service_id) navigate(`/servicos?id=${e.service_id}`);
  };

  const headerLabel = view === "month"
    ? format(cursor, "MMMM yyyy", { locale: ptBR })
    : `${format(range.start, "dd MMM", { locale: ptBR })} – ${format(addDays(range.end, -1), "dd MMM yyyy", { locale: ptBR })}`;

  return (
    <AppLayout title="Agenda">
      <div className="mx-auto max-w-7xl">
        <Breadcrumbs items={[{ label: "Agenda" }]} />

        {/* Toolbar */}
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goPrev} aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToday}>
              Hoje
            </Button>
            <Button variant="outline" size="sm" onClick={goNext} aria-label="Próximo">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <h2 className="ml-3 text-lg font-semibold capitalize">{headerLabel}</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch id="only-mine" checked={onlyMine} onCheckedChange={setOnlyMine} />
              <Label htmlFor="only-mine" className="text-sm">Minhas atividades</Label>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="month">Mês</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => { setSelectedDay(undefined); setOpenCreate(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Novo evento
            </Button>
          </div>
        </Card>

        {/* Calendar grid */}
        <Card className="overflow-hidden rounded-2xl shadow-soft">
          <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
              <div key={d} className="px-2 py-2">{d}</div>
            ))}
          </div>
          <div className={cn("grid grid-cols-7", view === "month" ? "auto-rows-fr" : "auto-rows-fr")}>
            {days.map((d) => {
              const key = isoDay(d);
              const dayEvents = eventsByDay.get(key) ?? [];
              const inMonth = view === "week" || isSameMonth(d, cursor);
              const today = isSameDay(d, new Date());
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setSelectedDay(key); setOpenCreate(true); }}
                  className={cn(
                    "group relative min-h-[110px] border-b border-r border-border p-1.5 text-left transition-colors hover:bg-muted/40",
                    !inMonth && "bg-muted/10 text-muted-foreground/50",
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                        today && "bg-primary text-primary-foreground",
                      )}
                    >
                      {format(d, "d")}
                    </span>
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <li key={e.id}>
                        <span
                          onClick={(ev) => { ev.stopPropagation(); onEventClick(e); }}
                          className={cn(
                            "block truncate rounded border px-1.5 py-0.5 text-[11px] font-medium",
                            TYPE_COLOR[e.event_type],
                            e.service_id && "cursor-pointer hover:opacity-80",
                          )}
                          title={e.title}
                        >
                          {e.source === "auto" && <Link2 className="mr-0.5 inline h-2.5 w-2.5" />}
                          {e.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {([
            ["reuniao", "Reunião"],
            ["atendimento_cliente", "Atendimento"],
            ["assinatura_prevista", "Assinatura"],
            ["prazo_servico", "Prazo"],
            ["vencimento_certidao", "Vencimento certidão"],
          ] as const).map(([key, label]) => (
            <span key={key} className="inline-flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded border", TYPE_COLOR[key])} />
              {label}
            </span>
          ))}
          <span className="ml-auto inline-flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {loading ? "Carregando..." : `${events.length} evento(s) no período`}
          </span>
        </div>
      </div>

      <EventFormDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        defaultDate={selectedDay}
        onSaved={() => setCursor(new Date(cursor))}
      />
    </AppLayout>
  );
}