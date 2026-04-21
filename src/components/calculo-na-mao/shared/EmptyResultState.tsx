import { Calculator } from "lucide-react";

interface EmptyResultStateProps {
  message?: string;
}

export function EmptyResultState({
  message = "Preencha os campos ao lado para ver o resultado.",
}: EmptyResultStateProps) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
      <Calculator className="h-10 w-10 text-muted-foreground/60" aria-hidden />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}