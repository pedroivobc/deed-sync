import { Check, AlertCircle, Circle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { SectionProgress } from "@/lib/serviceFields";

interface Props {
  sections: SectionProgress[];
  overall: number;
  onJump?: (sectionKey: string) => void;
}

export function ProgressPanel({ sections, overall, onJump }: Props) {
  return (
    <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <h5 className="text-xs font-bold uppercase tracking-wider text-accent">
            Preenchimento
          </h5>
          <span className="text-2xl font-semibold tabular-nums">{overall}%</span>
        </div>
        <Progress value={overall} className="h-2" />
      </div>
      <ul className="space-y-1.5">
        {sections.map((s) => {
          const Icon = s.ratio >= 1 ? Check : s.ratio > 0 ? AlertCircle : Circle;
          const color =
            s.ratio >= 1 ? "text-success"
            : s.ratio > 0 ? "text-warning"
            : "text-muted-foreground";
          return (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onJump?.(s.key)}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition hover:bg-muted/60"
              >
                <span className="flex items-center gap-2">
                  <Icon className={cn("h-3.5 w-3.5", color)} />
                  {s.label}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {Math.round(s.ratio * 100)}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
