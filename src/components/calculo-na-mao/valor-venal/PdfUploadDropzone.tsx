import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

export function PdfUploadDropzone({ file, onChange, disabled }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(
    (f: File | undefined | null) => {
      if (!f) return;
      if (f.type !== "application/pdf") return;
      if (f.size > 10 * 1024 * 1024) return;
      onChange(f);
    },
    [onChange],
  );

  if (file) {
    return (
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{file.name}</div>
          <div className="text-xs text-muted-foreground">
            {(file.size / 1024).toFixed(0)} KB
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={() => onChange(null)} disabled={disabled}>
          <X className="h-4 w-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-10 text-center transition-colors",
        dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        disabled && "pointer-events-none opacity-50",
      )}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        accept(e.dataTransfer.files?.[0]);
      }}
    >
      <UploadCloud className="h-8 w-8 text-muted-foreground" />
      <div>
        <div className="text-sm font-medium">Arraste o PDF do IPTU aqui</div>
        <div className="text-xs text-muted-foreground">ou clique para selecionar (máx. 10 MB)</div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </Card>
  );
}