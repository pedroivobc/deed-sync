import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ACCEPTED_FILE_TYPES,
  formatFileSize,
  uploadFileToDrive,
  validateFile,
  type UploadedDriveFile,
} from "@/lib/driveFiles";
import { notify } from "@/lib/notify";

interface Props {
  entityType: "service" | "client";
  entityId: string;
  subfolderType: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  onUploaded: (file: UploadedDriveFile) => void;
  /** Optional render slot below the dropzone (e.g. extra fields) */
  children?: React.ReactNode;
  /** Hide the action buttons when caller provides custom CTA via children */
  autoUploadOnSelect?: boolean;
  helperText?: string;
}

export function SimpleFileUploader({
  entityType,
  entityId,
  subfolderType,
  relatedEntityType,
  relatedEntityId,
  onUploaded,
  children,
  autoUploadOnSelect = false,
  helperText,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setProgress(0);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onPick = useCallback(
    (f: File | null) => {
      if (!f) return;
      const err = validateFile(f);
      if (err) {
        notify.error(err);
        return;
      }
      setFile(f);
      if (autoUploadOnSelect) {
        void doUpload(f);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [autoUploadOnSelect],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onPick(e.dataTransfer.files?.[0] ?? null);
  };

  const doUpload = async (f: File) => {
    setUploading(true);
    setProgress(20);
    const tick = setInterval(() => setProgress((p) => (p < 85 ? p + 5 : p)), 350);
    try {
      const res = await uploadFileToDrive({
        file: f,
        entityType,
        entityId,
        subfolderType,
        relatedEntityType,
        relatedEntityId,
      });
      clearInterval(tick);
      setProgress(100);
      notify.success("Arquivo anexado ao Drive.");
      onUploaded(res);
      reset();
    } catch (e) {
      clearInterval(tick);
      notify.error("Falha ao enviar arquivo", {
        description: e instanceof Error ? e.message : String(e),
      });
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-3">
      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      {!file && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-8 text-center transition hover:border-accent hover:bg-accent/5"
        >
          <Upload className="h-7 w-7 text-muted-foreground" />
          <div className="text-sm font-medium">Arraste o arquivo ou clique para selecionar</div>
          <div className="text-[11px] text-muted-foreground">PDF, JPG ou PNG • até 10MB</div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />

      {file && !uploading && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{file.name}</div>
              <div className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={reset} aria-label="Remover">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {file && children}

      {file && !uploading && !autoUploadOnSelect && !children && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={reset}>
            Cancelar
          </Button>
          <Button onClick={() => void doUpload(file)}>Enviar para o Drive</Button>
        </div>
      )}

      {uploading && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
            Enviando para o Google Drive…
          </div>
          <Progress value={progress} />
        </div>
      )}

      {/* Expose internal upload trigger through a hidden form helper.
          Callers passing children can call doUpload by re-rendering with
          autoUploadOnSelect or by handling save themselves. */}
    </div>
  );
}

/** Hook variant when the caller wants total control over the upload trigger. */
export function useDriveUpload() {
  const [uploading, setUploading] = useState(false);
  const upload = async (input: Parameters<typeof uploadFileToDrive>[0]) => {
    setUploading(true);
    try {
      return await uploadFileToDrive(input);
    } finally {
      setUploading(false);
    }
  };
  return { upload, uploading };
}
