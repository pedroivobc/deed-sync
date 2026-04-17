import { useEffect, useState } from "react";
import { Activity, ArrowRight, Check, FileEdit, Plus, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGE_LABEL, type ServiceStage } from "@/lib/serviceUi";
import { cn } from "@/lib/utils";

interface Props { serviceId: string; refreshKey?: number; }

interface LogEntry {
  id: string;
  action: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  user_id: string | null;
  user?: { name: string | null; email: string | null } | null;
}

const ACTION_ICON: Record<string, typeof Plus> = {
  created: Plus,
  stage_changed: ArrowRight,
  updated: FileEdit,
  task_step_changed: FileEdit,
  process_step_changed: FileEdit,
  document_checked: Check,
  financial_changed: FileEdit,
  completed: Check,
  deleted: Trash2,
};

function describe(entry: LogEntry): string {
  const p = (entry.payload ?? {}) as Record<string, unknown>;
  const by = entry.user?.name ?? entry.user?.email ?? "Alguém";
  switch (entry.action) {
    case "created":
      return `${by} criou o serviço`;
    case "stage_changed": {
      const from = p.from as ServiceStage | undefined;
      const to = p.to as ServiceStage | undefined;
      return `${by} moveu de "${from ? STAGE_LABEL[from] : "?"}" para "${to ? STAGE_LABEL[to] : "?"}"`;
    }
    case "task_step_changed":
      return `${by} alterou a etapa da tarefa para "${p.to ?? "?"}"`;
    case "process_step_changed":
      return `${by} alterou a etapa do processo para "${p.to ?? "?"}"`;
    case "document_checked":
      return `${by} marcou documento "${p.document ?? "?"}" como ${p.checked ? "entregue" : "pendente"}`;
    case "financial_changed":
      return `${by} alterou valores financeiros`;
    case "completed":
      return `${by} concluiu o serviço`;
    case "updated":
      return `${by} atualizou o serviço`;
    default:
      return `${by} — ${entry.action}`;
  }
}

export function ActivityTimeline({ serviceId, refreshKey = 0 }: Props) {
  const [items, setItems] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase
      .from("service_activity_log")
      .select(`*, user:profiles ( name, email )`)
      .eq("service_id", serviceId)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (active) {
          setItems((data as unknown as LogEntry[]) ?? []);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [serviceId, refreshKey]);

  if (loading) return <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        <Activity className="mx-auto mb-2 h-5 w-5 opacity-60" />
        Nenhuma atividade registrada ainda.
      </div>
    );
  }

  return (
    <ol className="space-y-3">
      {items.map((entry) => {
        const Icon = ACTION_ICON[entry.action] ?? Activity;
        return (
          <li key={entry.id} className="flex items-start gap-3">
            <div className={cn("mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent")}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{describe(entry)}</p>
              <p className="text-xs text-muted-foreground" title={format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}>
                {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
