import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Loader2, ExternalLink, FolderOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { callDrive, checkDriveSecrets } from "@/lib/drive";
import { GeminiOcrCard } from "@/components/ocr/GeminiOcrCard";
import { InfosimplesIntegrationCard } from "@/components/InfosimplesIntegrationCard";
import { ClickSignIntegrationCard } from "@/components/ClickSignIntegrationCard";

type SecretsStatus = Record<string, boolean>;

interface SyncLog {
  id: string;
  operation: string;
  status: string;
  details: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
}

interface ConnectionInfo {
  connected: boolean;
  service_account_email: string | null;
  root_folder_id: string | null;
  root_folder_url?: string | null;
  root_folder_name?: string | null;
  sample_items?: Array<{ name: string }>;
}

const SECRET_LABELS: Record<string, string> = {
  GOOGLE_SERVICE_ACCOUNT_JSON: "Credencial da conta de serviço",
  GOOGLE_DRIVE_ROOT_FOLDER_ID: "Pasta raiz",
  GOOGLE_DRIVE_ESCRITURAS_FOLDER_ID: "Pasta — Escrituras",
  GOOGLE_DRIVE_AVULSOS_FOLDER_ID: "Pasta — Serviços avulsos",
  GOOGLE_DRIVE_REGULARIZACAO_FOLDER_ID: "Pasta — Regularização",
  GOOGLE_DRIVE_CRM_FOLDER_ID: "Pasta — CRM/Clientes",
};

export function IntegrationsPanel() {
  const [secrets, setSecrets] = useState<SecretsStatus | null>(null);
  const [conn, setConn] = useState<ConnectionInfo | null>(null);
  const [testing, setTesting] = useState(false);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [stats, setStats] = useState({ folders: 0, files: 0 });

  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshAll = async () => {
    setLoadError(null);
    try {
      const [secretsMap, foldersRes, filesRes] = await Promise.all([
        checkDriveSecrets(),
        supabase.from("drive_folders").select("id", { count: "exact", head: true }).eq("subfolder_type", "root"),
        supabase.from("drive_files").select("id", { count: "exact", head: true }),
      ]);
      setSecrets(secretsMap);
      setStats({ folders: foldersRes.count ?? 0, files: filesRes.count ?? 0 });
      await loadLogs();
    } catch (e) {
      console.error("[IntegrationsPanel] refreshAll error", e);
      setLoadError(e instanceof Error ? e.message : "Erro ao carregar integrações");
    }
  };

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("drive_sync_logs")
        .select("id, operation, status, details, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      setLogs((data ?? []) as SyncLog[]);
    } catch (e) {
      console.error("[IntegrationsPanel] loadLogs error", e);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allSecretsSet = useMemo(
    () => secrets && Object.values(secrets).every(Boolean),
    [secrets],
  );

  const handleTest = async () => {
    setTesting(true);
    const res = await callDrive<Record<string, unknown>>("test_connection");
    setTesting(false);
    if (!res.ok) {
      setConn({ connected: false, service_account_email: null, root_folder_id: null });
      toast.error(`Conexão falhou: ${res.error ?? "erro desconhecido"}`);
    } else {
      const r = (res.result ?? {}) as Record<string, unknown>;
      setConn({
        connected: true,
        service_account_email: (r.email as string) ?? (r.service_account_email as string) ?? null,
        root_folder_id: (r.root_folder_id as string) ?? null,
        root_folder_url: (r.folder_url as string) ?? null,
        root_folder_name: (r.folder_name as string) ?? null,
      });
      toast.success("Conexão com Google Drive bem-sucedida.");
    }
    await loadLogs();
  };

  const opLabel = (op: string) => {
    const map: Record<string, string> = {
      folder_created: "Pasta criada",
      folder_deleted: "Pasta excluída",
      file_uploaded: "Arquivo enviado",
      file_deleted: "Arquivo excluído",
      ocr_processed: "OCR processado",
      sync_manual: "Sincronização manual",
      test_connection: "Teste de conexão",
      error: "Erro",
    };
    return map[op] ?? op;
  };

  const statusBadge = (s: string) => {
    if (s === "success") return <Badge className="bg-success/15 text-success">Sucesso</Badge>;
    if (s === "failed") return <Badge variant="destructive">Falha</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <InfosimplesIntegrationCard />
      <ClickSignIntegrationCard />
      <GeminiOcrCard />
      {loadError && (
        <Card className="rounded-2xl border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <div className="flex items-center justify-between gap-3">
            <span>Não foi possível carregar todas as informações de integração: {loadError}</span>
            <Button size="sm" variant="outline" onClick={refreshAll}>Tentar novamente</Button>
          </div>
        </Card>
      )}
      <Card className="rounded-2xl p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-accent/10 p-2">
              <FolderOpen className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-xl">Google Drive</h3>
              <p className="text-sm text-muted-foreground">
                Criação automática de pastas para serviços e clientes.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {conn?.connected ? (
                  <Badge className="gap-1 bg-success/15 text-success">
                    <CheckCircle2 className="h-3 w-3" /> Conectado
                  </Badge>
                ) : conn === null ? (
                  <Badge variant="outline">Não testado</Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" /> Desconectado
                  </Badge>
                )}
                {!allSecretsSet && (
                  <Badge variant="outline" className="border-warning/50 text-warning">
                    Configure os secrets
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Testar conexão
            </Button>
            <Button onClick={refreshAll} variant="ghost" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Atualizar
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Conta de serviço</p>
            <p className="text-sm">{conn?.service_account_email ?? "—"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Pasta raiz</p>
            {conn?.root_folder_url || conn?.root_folder_id ? (
              <a
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                href={conn.root_folder_url ?? `https://drive.google.com/drive/folders/${conn.root_folder_id}`}
                target="_blank"
                rel="noopener"
              >
                {conn.root_folder_name ?? "Abrir no Drive"} <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <p className="text-sm">—</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Pastas criadas</p>
            <p className="text-sm">{stats.folders}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Arquivos registrados</p>
            <p className="text-sm">{stats.files}</p>
          </div>
        </div>

        <Separator className="my-5" />

        <div>
          <p className="mb-3 text-xs uppercase text-muted-foreground">Configuração de secrets</p>
          <div className="grid gap-2 md:grid-cols-2">
            {Object.entries(SECRET_LABELS).map(([key, label]) => {
              const ok = secrets?.[key];
              return (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <div className="text-sm">{label}</div>
                    <div className="text-[11px] text-muted-foreground">{key}</div>
                  </div>
                  {ok ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="rounded-2xl p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="section-title">Últimas operações</h3>
          <Button variant="ghost" size="sm" onClick={loadLogs} disabled={loadingLogs} className="gap-2">
            {loadingLogs ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recarregar
          </Button>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma operação registrada ainda.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detalhes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {format(new Date(l.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-sm">{opLabel(l.operation)}</TableCell>
                  <TableCell>{statusBadge(l.status)}</TableCell>
                  <TableCell className="max-w-md text-xs text-muted-foreground">
                    {l.error_message ? (
                      <span className="text-destructive">{l.error_message}</span>
                    ) : l.details ? (
                      <span className="line-clamp-2">{JSON.stringify(l.details)}</span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
