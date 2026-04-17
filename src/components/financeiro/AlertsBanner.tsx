import { AlertTriangle, Calendar, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";
import type { FinanceEntry } from "@/lib/finance";

interface Props {
  overdueValue: number;
  dueSoonCount: number;
  monthlyGoal?: number;
  monthRevenue?: number;
}

export function AlertsBanner({ overdueValue, dueSoonCount, monthlyGoal, monthRevenue }: Props) {
  const hasGoalHit = monthlyGoal && monthRevenue && monthRevenue >= monthlyGoal;
  const has = overdueValue > 0 || dueSoonCount > 0 || hasGoalHit;
  if (!has) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {overdueValue > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>Você tem <strong>{formatBRL(overdueValue)}</strong> em receitas vencidas há mais de 30 dias</span>
        </div>
      )}
      {dueSoonCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
          <Calendar className="h-4 w-4 text-warning" />
          <span><strong>{dueSoonCount}</strong> despesa{dueSoonCount > 1 ? "s" : ""} vence{dueSoonCount > 1 ? "m" : ""} nos próximos 7 dias</span>
        </div>
      )}
      {hasGoalHit && (
        <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle className="h-4 w-4" />
          <span>Você bateu a meta de receita do mês</span>
        </div>
      )}
    </div>
  );
}
