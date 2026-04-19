import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  callOcr, fileToBase64, DOCUMENT_TYPE_LABELS, type OcrDocumentType, type OcrResult,
} from "@/lib/ocr";

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/jpg";
const MAX_BYTES = 10 * 1024 * 1024;

interface Props {
  /** Tipos disponíveis no select. Default: PF (rg/cpf/cnh/comp.res.) */
  allowedTypes?: OcrDocumentType[];
  /** Tipo padrão pré-selecionado */
  defaultType?: OcrDocumentType;
  /** Vínculos opcionais para persistir no log */
  serviceId?: string | null;
  partyId?: string | null;
  clientId?: string | null;
  /** Modo teste: não persiste, retorna o resultado bruto */
  testMode?: boolean;
  /** Callback quando a extração termina (sucesso ou parcial) */
  onExtracted?: (result: OcrResult & { documentType: OcrDocumentType; fileName: string }) => void;
  /** Texto opcional acima do dropzone */
  helperText?: string;
}

export function DocumentUploader({
  allowedTypes = ["rg", "cpf", "cnh", "comprovante_residencia"],
  defaultType,
  serviceId,
  partyId,
  clientId,
  testMode = false,
  onExtracted,
  helperText,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<OcrDocumentType>(defaultType ?? allowedTypes[0]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"idle" | "encoding" | "uploading" | "analyzing">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  const isProcessing = stage !== "idle";

  const reset = () => {
    setFile(null);
    setProgress(0);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPick = useCallback((f: File | null) => {
    if (!f) return;
    if (!ACCEPTED.split(",").includes(f.type)) {
      toast.error("Apenas PDF, JPG e PNG são aceitos.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("O arquivo excede o limite de 10MB.");
      return;
    }
    setFile(f);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    onPick(f ?? null);
  };

  const handleProcess = async () => {
    if (!file) return;
    setStage("encoding");
    setProgress(15);
    try {
      const base64 = await fileToBase64(file);
      setStage("uploading");
      setProgress(40);
      // simulação visual de progresso enquanto a IA processa
      const tick = setInterval(() => {
        setProgress((p) => (p < 85 ? p + 3 : p));
      }, 400);
      setStage("analyzing");
      const res = await callOcr(testMode ? "test_extraction" : "extract_document", {
        file_base64: base64,
        mime_type: file.type,
        file_name: file.name,
        file_size: file.size,
        document_type: docType,
        service_id: serviceId ?? null,
        party_id: partyId ?? null,
        client_id: clientId ?? null,
      });
      clearInterval(tick);
      setProgress(100);

      if (!res.ok) {
        toast.error(res.error ?? "Falha na extração");
        reset();
        return;
      }
      if (res.status === "partial") {
        toast.warning("Extração parcial — revise os dados.");
      } else {
        toast.success("Documento analisado.");
      }
      onExtracted?.({ ...res, documentType: docType, fileName: file.name });
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar");
      reset();
    }
  };

  const stageLabel: Record<typeof stage, string> = {
    idle: "",
    encoding: "Preparando arquivo…",
    uploading: "Enviando para IA…",
    analyzing: "Extraindo dados…",
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] text-warning">
        <AlertTriangle className="mr-1 inline h-3 w-3" /> Documentos são enviados para IA do Google
        para análise. Dados extraídos ficam armazenados no seu sistema; a Google não retém os arquivos.
      </div>

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      {!file && !isProcessing && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition hover:border-accent hover:bg-accent/5"
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-medium">Arraste o arquivo ou clique para selecionar</div>
          <div className="text-xs text-muted-foreground">
            PDF, JPG ou PNG • até 10MB
          </div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      {file && !isProcessing && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-5 w-5 shrink-0 text-accent" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={reset}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de documento</Label>
            <Select value={docType} onValueChange={(v) => setDocType(v as OcrDocumentType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {allowedTypes.map((t) => (
                  <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={reset}>Cancelar</Button>
            <Button onClick={handleProcess} className="gap-2">
              <Sparkles className="h-4 w-4" /> Processar com IA
            </Button>
          </div>
        </div>
      )}

      {isProcessing && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            <span>{stageLabel[stage]}</span>
          </div>
          <Progress value={progress} />
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>{progress >= 15 ? "✓" : "○"} Preparando arquivo</li>
            <li>{progress >= 40 ? "✓" : "○"} Enviando para IA</li>
            <li>{progress >= 100 ? "✓" : progress >= 60 ? "⏳" : "○"} Extraindo dados</li>
          </ul>
        </div>
      )}
    </div>
  );
}
