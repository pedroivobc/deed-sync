import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Sparkles } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { callOcr, type Confidence, type OcrResult } from "@/lib/ocr";
import { toast } from "sonner";

interface FieldDef {
  /** chave dentro de extracted_data */
  key: string;
  /** rótulo legível */
  label: string;
  /** transformador para exibir (ex: data) */
  format?: (v: unknown) => string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  result: OcrResult | null;
  fileName?: string;
  /** Campos esperados para esse documento (ordem de exibição) */
  fields: FieldDef[];
  /** Quando o usuário aplica → recebe os valores aceitos */
  onApply: (accepted: Record<string, unknown>) => void;
}

export function ExtractionReviewDialog({
  open, onOpenChange, result, fileName, fields, onApply,
}: Props) {
  // Memoize derived references against the stable `result` identity to avoid
  // creating new `{}` literals on every render (which would invalidate the
  // effect deps below and trigger infinite re-renders).
  const data = useMemo(
    () => (result?.extracted ?? {}) as Record<string, unknown>,
    [result],
  );
  const confidences = useMemo(
    () => (result?.confidence_scores ?? {}) as Record<string, Confidence>,
    [result],
  );

  const [values, setValues] = useState<Record<string, unknown>>({});
  const [corrected, setCorrected] = useState<Record<string, boolean>>({});

  // Reset form values whenever a new extraction result arrives.
  // Using useEffect (not useMemo) because we are performing a side-effect.
  useEffect(() => {
    const next: Record<string, unknown> = {};
    for (const f of fields) {
      const c = confidences[f.key] ?? "none";
      // só auto-preenche para confiança alta/média
      if (c === "high" || c === "medium") next[f.key] = data[f.key] ?? "";
      else next[f.key] = "";
    }
    setValues(next);
    setCorrected({});
  }, [data, confidences, fields]);

  const setField = (k: string, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    if (String(data[k] ?? "") !== v) setCorrected((c) => ({ ...c, [k]: true }));
  };

  const handleApply = async () => {
    onApply(values);
    if (result?.log_id) {
      await callOcr("validate_extraction", {
        log_id: result.log_id,
        user_accepted: true,
        user_corrected_fields: corrected,
      });
    }
    onOpenChange(false);
    toast.success("Dados aplicados ao formulário.");
  };

  const renderConfidenceIcon = (c: Confidence) => {
    if (c === "high") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (c === "medium") return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
    if (c === "low") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
    return <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />;
  };

  const renderConfidenceBadge = (c: Confidence) => {
    if (c === "high")
      return <Badge className="bg-success/15 text-success">Alta</Badge>;
    if (c === "medium")
      return <Badge className="bg-warning/15 text-warning">Média</Badge>;
    if (c === "low")
      return <Badge variant="destructive">Baixa</Badge>;
    return <Badge variant="outline">Não encontrado</Badge>;
  };

  const fieldBorder = (c: Confidence) => {
    if (c === "high") return "border-success/40";
    if (c === "medium") return "border-warning/50 bg-warning/5";
    if (c === "low") return "border-destructive/40 bg-destructive/5";
    return "border-border";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            Revisar dados extraídos
          </DialogTitle>
          {fileName && (
            <p className="text-xs text-muted-foreground">{fileName}</p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-3 py-2">
            {fields.map((f) => {
              const c: Confidence = confidences[f.key] ?? "none";
              const raw = data[f.key];
              const display =
                typeof raw === "object" && raw !== null
                  ? JSON.stringify(raw)
                  : String(raw ?? "");
              return (
                <div key={f.key} className={`rounded-lg border p-3 ${fieldBorder(c)}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Label className="flex items-center gap-1.5 text-xs">
                      {renderConfidenceIcon(c)} {f.label}
                    </Label>
                    {renderConfidenceBadge(c)}
                  </div>
                  <Input
                    value={String(values[f.key] ?? "")}
                    onChange={(e) => setField(f.key, e.target.value)}
                    placeholder={c === "none" ? "Preencher manualmente" : ""}
                  />
                  {c !== "none" && c !== "high" && display && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Sugestão IA: <span className="font-mono">{display}</span>
                    </p>
                  )}
                </div>
              );
            })}

            {(data as any).observacoes && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                <span className="font-medium">Observações da IA:</span>{" "}
                {String((data as any).observacoes)}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleApply}>Aplicar ao formulário</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
