import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  bold?: boolean;
  emphasis?: boolean;
}

export function BreakdownRow({ label, value, bold, emphasis }: Props) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-border/50 py-1.5 last:border-0",
        emphasis && "bg-accent/5 px-2 -mx-2 rounded-md",
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "tabular-nums",
          bold ? "font-semibold text-foreground" : "font-medium text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}