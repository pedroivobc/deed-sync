import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  Loader2,
  Trash2,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormSection } from "./FormSection";
import { FilePreviewDialog } from "@/components/files/FilePreviewDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { callDrive } from "@/lib/drive";
import {
  ACCEPTED_FILE_TYPES,
  deleteDriveFile,
  driveWebViewUrl,
  fileToBase64,
  formatFileSize,
  validateFile,
} from "@/lib/driveFiles";
import { notify } from "@/lib/notify";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface DriveListedFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string | number;
  modifiedTime?: string;
  thumbnailLink?: string | null;
  webViewLink?: string | null;
  subfolder_type: string;
  folder_path: string;
}

interface DriveFolderRow {
  drive_folder_id: string;
  subfolder_type: string;
  folder_path: string;
}

interface ListResponse {
  files: DriveListedFile[];
  folders: DriveFolderRow[];
  folder_url: string | null;
  root_folder_id: string | null;
}

interface Props {
  serviceId: string;
}

const SUBFOLDER_LABEL: Record<string, string> = {
  root: "Pasta principal",
  certidoes_pessoais: "Certidões Pessoais",
  certidoes_internet: "Certidões Internet",
  docs_imovel: "Documentos do Imóvel",
  contrato: "Contrato",
  escritura_final: "Escritura Final",
  docs_recebidos: "Documentos Recebidos",
  docs_gerados: "Documentos Gerados",
  entrega_final: "Entrega Final",
};

function fileIcon(mime: string) {
  if (mime?.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-accent" />;
  return <FileText className="h-4 w-4 text-accent" />;
}

export function ProcessFilesSection({ serviceId }: Props) {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    name: string;
    mime: string;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DriveListedFile | null>(null);

  const queryKey = useMemo(() => ["service-files", serviceId], [serviceId]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<ListResponse>({
    queryKey,
    queryFn: async () => {
      const res = await callDrive<ListResponse>("list_entity_files", {
        entity_type: "service",
        entity_id: serviceId,
      });
      if (!res.ok) throw new Error(res.error ?? "Falha ao listar arquivos");
      return res.result ?? { files: [], folders: [], folder_url: null, root_folder_id: null };
    },
    enabled: Boolean(serviceId),
    staleTime: 30_000,
  });

  const files = data?.files ?? [];
  const folders = data?.folders ?? [];
  const hasFolders = folders.length > 0;

  // Default upload destination = first available subfolder, fallback to root
  const defaultSubfolder =
    folders.find((f) => f.subfolder_type === "docs_recebidos")?.subfolder_type ??
    folders.find((f) => f.subfolder_type !== "root")?.subfolder_type ??
    folders.find((f) => f.subfolder_type === "root")?.subfolder_type ??
    "root";

  const handleFiles = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0) return;
      if (!hasFolders) {
        notify.error(
          "A pasta do Drive ainda não foi criada para este serviço. Salve o serviço primeiro.",
        );
        return;
      }
      const arr = Array.from(list);
      setUploading(true);
      try {
        for (const f of arr) {
          const err = validateFile(f);
          if (err) {
            notify.error(`${f.name}: ${err}`);
            continue;
          }
          try {
            const base64 = await fileToBase64(f);
            const res = await callDrive("upload_file", {
              entity_type: "service",
              entity_id: serviceId,
              subfolder_type: defaultSubfolder,
              file_base64: base64,
              file_name: f.name,
              mime_type: f.type || "application/octet-stream",
              file_size: f.size,
            });
            if (!res.ok) throw new Error(res.error ?? "Falha no upload");
            notify.success(`${f.name} enviado.`);
          } catch (e) {
            notify.error(`Falha ao enviar ${f.name}`, {
              description: e instanceof Error ? e.message : String(e),
            });
          }
        }
        await qc.invalidateQueries({ queryKey });
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [defaultSubfolder, hasFolders, qc, queryKey, serviceId],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  const handleDelete = async (f: DriveListedFile) => {
    try {
      await deleteDriveFile(f.id);
      notify.success("Arquivo removido.");
      await qc.invalidateQueries({ queryKey });
    } catch (e) {
      notify.error("Falha ao remover", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setConfirmDelete(null);
    }
  };

  const handleDownload = async (f: DriveListedFile) => {
    try {
      const res = await callDrive<{
        base64: string;
        file_name: string;
        mime_type: string;
      }>("download_file", { drive_file_id: f.id });
      if (!res.ok || !res.result) throw new Error(res.error ?? "Falha");
      const a = document.createElement("a");
      a.href = `data:${res.result.mime_type};base64,${res.result.base64}`;
      a.download = res.result.file_name || f.name;
      a.click();
    } catch (e) {
      notify.error("Falha ao baixar", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <FormSection title="Documentos do Processo" id="section-arquivos">
      <div className="space-y-3">
        <div className="-mt-2 mb-1 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Atualizar
          </Button>
        </div>
        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={cn(
            "rounded-2xl border-2 border-dashed bg-muted/20 p-4 transition-colors",
            dragActive
              ? "border-accent bg-accent/5"
              : "border-border hover:border-accent/40",
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-accent/10 p-2">
                <Upload className="h-4 w-4 text-accent" />
              </div>
              <div>
                <div className="text-sm font-medium">Enviar arquivo</div>
                <div className="text-[11px] text-muted-foreground">
                  Arraste aqui ou clique no botão • PDF, JPG ou PNG • até 10MB
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={uploading || !hasFolders}
                className="gap-1.5"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Selecionar arquivo
              </Button>
            </div>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES}
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
          />
        </div>

        {!hasFolders && !isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2 text-xs text-warning">
            <FolderOpen className="h-4 w-4" />
            A pasta do Google Drive ainda não foi criada. Salve o serviço para gerar a estrutura de pastas.
          </div>
        )}

        {/* File list */}
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando arquivos…
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error instanceof Error ? error.message : "Erro ao carregar arquivos"}
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum documento anexado ainda.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {files.map((f) => {
              const previewable =
                f.mimeType?.startsWith("image/") || f.mimeType === "application/pdf";
              return (
                <li
                  key={f.id}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/40">
                    {fileIcon(f.mimeType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{f.name}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="h-4 border-border/60 px-1.5 text-[10px] font-normal"
                      >
                        {SUBFOLDER_LABEL[f.subfolder_type] ?? f.subfolder_type}
                      </Badge>
                      <span>{formatFileSize(Number(f.size ?? 0))}</span>
                      {f.modifiedTime && (
                        <>
                          <span>•</span>
                          <span>
                            {format(new Date(f.modifiedTime), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {previewable && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 px-2 text-xs"
                        onClick={() =>
                          setPreviewFile({ id: f.id, name: f.name, mime: f.mimeType })
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="hidden md:inline">Visualizar</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 px-2 text-xs"
                      onClick={() => void handleDownload(f)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden md:inline">Baixar</span>
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setConfirmDelete(f)}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <FilePreviewDialog
        open={Boolean(previewFile)}
        onOpenChange={(o) => !o && setPreviewFile(null)}
        driveFileId={previewFile?.id ?? null}
        fileName={previewFile?.name ?? null}
        mimeType={previewFile?.mime ?? null}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title="Remover arquivo"
        description={`Tem certeza que deseja remover "${confirmDelete?.name ?? ""}" do Google Drive? Esta ação não pode ser desfeita.`}
        confirmText="Remover"
        destructive
        onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
      />
    </FormSection>
  );
}

// Open file in Drive (used as fallback for non-previewable formats).
export function openDriveFile(id: string) {
  window.open(driveWebViewUrl(id), "_blank", "noopener");
}
