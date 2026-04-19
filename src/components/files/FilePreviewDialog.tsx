import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Loader2, ChevronLeft, ChevronRight, ExternalLink, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { downloadDriveFile, driveWebViewUrl } from "@/lib/driveFiles";
import { notify } from "@/lib/notify";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Use the worker bundled with pdfjs-dist (Vite-friendly)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  driveFileId: string | null;
  fileName?: string | null;
  mimeType?: string | null;
}

export function FilePreviewDialog({ open, onOpenChange, driveFileId, fileName, mimeType }: Props) {
  const [loading, setLoading] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [resolvedMime, setResolvedMime] = useState<string | null>(mimeType ?? null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    if (!open || !driveFileId) return;
    let cancelled = false;
    setLoading(true);
    setDataUrl(null);
    setPageNum(1);
    setNumPages(0);

    downloadDriveFile(driveFileId)
      .then((r) => {
        if (cancelled) return;
        const mime = r.mime_type || mimeType || "application/octet-stream";
        setResolvedMime(mime);
        setDataUrl(`data:${mime};base64,${r.base64}`);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        notify.error("Não foi possível carregar o arquivo", {
          description: e instanceof Error ? e.message : String(e),
        });
      })
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [open, driveFileId, mimeType]);

  const isPdf = (resolvedMime ?? "").includes("pdf");
  const isImage = (resolvedMime ?? "").startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="truncate text-sm">{fileName ?? "Arquivo"}</DialogTitle>
            <div className="flex items-center gap-1.5">
              {driveFileId && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={driveWebViewUrl(driveFileId)} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Abrir no Drive
                  </a>
                </Button>
              )}
              {dataUrl && fileName && (
                <Button size="sm" variant="ghost" asChild>
                  <a href={dataUrl} download={fileName}>
                    <Download className="mr-1 h-3.5 w-3.5" /> Baixar
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex max-h-[78vh] min-h-[60vh] items-center justify-center overflow-auto bg-muted/30 p-4">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Carregando arquivo…
            </div>
          )}
          {!loading && dataUrl && isImage && (
            <img src={dataUrl} alt={fileName ?? ""} className="max-h-full max-w-full rounded-md shadow-md" />
          )}
          {!loading && dataUrl && isPdf && (
            <div className="flex flex-col items-center gap-3">
              <Document
                file={dataUrl}
                onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                loading={<Loader2 className="h-6 w-6 animate-spin" />}
                error={<p className="text-sm text-destructive">Erro ao renderizar PDF</p>}
              >
                <Page
                  pageNumber={pageNum}
                  width={Math.min(800, window.innerWidth - 120)}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
              {numPages > 1 && (
                <div className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-1.5 text-sm shadow-sm">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={pageNum <= 1}
                    onClick={() => setPageNum((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs">
                    Página {pageNum} de {numPages}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={pageNum >= numPages}
                    onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
          {!loading && dataUrl && !isPdf && !isImage && (
            <p className="text-sm text-muted-foreground">
              Pré-visualização não disponível para este formato. Use "Abrir no Drive" ou "Baixar".
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
