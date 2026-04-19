import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DocumentUploader } from "./DocumentUploader";
import type { OcrResult } from "@/lib/ocr";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function OcrTestDialog({ open, onOpenChange }: Props) {
  const [result, setResult] = useState<OcrResult | null>(null);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setResult(null);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Testar extração de documento</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Envie qualquer documento para visualizar o JSON retornado. Nada será salvo.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <DocumentUploader
            testMode
            allowedTypes={[
              "rg", "cpf", "cnh", "comprovante_residencia",
              "contrato_social", "certidao_junta", "outro",
            ]}
            onExtracted={(r) => setResult(r)}
          />

          {result && (
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Resposta da IA ({result.processing_time_ms} ms)</span>
                <span>
                  Tokens: {result.tokens?.prompt ?? 0} in · {result.tokens?.response ?? 0} out
                </span>
              </div>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-[11px]">
                {JSON.stringify(result.extracted, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
