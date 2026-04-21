import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExtractionStep = "idle" | "upload" | "ia" | "extract" | "done" | "error";

interface Props {
  step: ExtractionStep;
}

const STEPS: { key: Exclude<ExtractionStep, "idle" | "error">; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "ia", label: "IA" },
  { key: "extract", label: "Extração" },
  { key: "done", label: "Cálculo" },
];

const ORDER: Record<ExtractionStep, number> = {
  idle: -1, upload: 0, ia: 1, extract: 2, done: 3, error: -1,
};

export function ExtractionProgress({ step }: Props) {
  if (step === "idle") return null;
  const currentIdx = ORDER[step];

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, i) => {
        const isDone = currentIdx > i || step === "done";
        const isActive = currentIdx === i && step !== "done";
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                isDone && "border-primary bg-primary text-primary-foreground",
                isActive && "border-primary bg-primary/10 text-primary",
                !isDone && !isActive && "border-border text-muted-foreground",
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" /> : isActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : i + 1}
            </div>
            <span className={cn("text-xs", isActive ? "font-medium text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}