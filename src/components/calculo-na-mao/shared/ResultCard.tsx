import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface ResultCardProps {
  label: string;
  value: string;
  hint?: ReactNode;
  className?: string;
}

/**
 * Card de destaque do resultado final. Usa apenas tokens semânticos
 * (bg-card / text-primary / border-primary) — funciona em light & dark.
 */
export function ResultCard({ label, value, hint, className }: ResultCardProps) {
  return (
    <Card
      className={cn(
        "border-primary/30 bg-card shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <CardContent className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          {label}
        </span>
        <span
          className={cn(
            "font-display text-4xl leading-tight text-foreground sm:text-5xl",
            "drop-shadow-[0_2px_8px_hsl(var(--accent)/0.25)]",
          )}
        >
          {value}
        </span>
        {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}