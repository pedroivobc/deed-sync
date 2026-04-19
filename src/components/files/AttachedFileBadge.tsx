import { Eye, Download, Trash2, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { driveWebViewUrl, formatFileSize } from "@/lib/driveFiles";

interface Props {
  fileName: string;
  fileSize?: number | null;
  driveFileId: string;
  onPreview: () => void;
  onReplace?: () => void;
  onRemove?: () => void;
  compact?: boolean;
}

export function AttachedFileBadge({
  fileName,
  fileSize,
  driveFileId,
  onPreview,
  onReplace,
  onRemove,
  compact = false,
}: Props) {
  return (
    <div
      className={
        "flex items-center justify-between gap-2 rounded-md border border-success/30 bg-success/5 " +
        (compact ? "p-2" : "p-2.5")
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-success" />
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">{fileName}</div>
          {fileSize != null && (
            <div className="text-[10px] text-muted-foreground">{formatFileSize(fileSize)}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onPreview} title="Visualizar">
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" asChild title="Baixar">
          <a href={driveWebViewUrl(driveFileId)} target="_blank" rel="noreferrer">
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
        {onReplace && (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onReplace} title="Substituir">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
        {onRemove && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            onClick={onRemove}
            title="Remover"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
