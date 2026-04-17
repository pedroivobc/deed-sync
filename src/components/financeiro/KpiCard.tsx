import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/money";

interface Props {
  label: string;
  value: number | string;
  subtext?: string;
  icon: LucideIcon;
  tone?: "neutral" | "success" | "danger" | "warning" | "info";
  onClick?: () => void;
  isCurrency?: boolean;
  small?: boolean;
}

const TONE_BG: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "bg-card",
  success: "bg-success/10 border-success/20",
  danger: "bg-destructive/10 border-destructive/20",
  warning: "bg-warning/10 border-warning/30",
  info: "bg-info/10 border-info/20",
};

const TONE_ICON: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "text-foreground",
  success: "text-success",
  danger: "text-destructive",
  warning: "text-warning",
  info: "text-info",
};

export function KpiCard({ label, value, subtext, icon: Icon, tone = "neutral", onClick, isCurrency = true, small = false }: Props) {
  const formatted = isCurrency && typeof value === "number" ? formatBRL(value) : value;
  return (
    <Card
      onClick={onClick}
      className={cn(
        "rounded-2xl border p-4 transition",
        TONE_BG[tone],
        onClick && "cursor-pointer hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className={cn("mt-1 font-display font-semibold tabular-nums", small ? "text-xl" : "text-2xl md:text-3xl")}>
            {formatted}
          </div>
          {subtext && <div className="mt-1 text-xs text-muted-foreground">{subtext}</div>}
        </div>
        <div className={cn("rounded-xl p-2", TONE_BG[tone], TONE_ICON[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
