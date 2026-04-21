import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw, CreditCard, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface CoraToken {
  environment: string;
  expires_at: string;
  updated_at: string;
}

interface CoraLog {
  id: string;
  endpoint: string;
  method: string;
  response_status: number | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export function CoraIntegrationCard() {
  const [token, setToken] = useState<CoraToken | null>(null);
  const [testing, setTesting] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState<CoraLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const env = (token?.environment ?? "stage").toLowerCase();
  const isConnected =
    !!token?.expires_at && new Date(token.expires_at).getTime() > Date.now();

  const refreshToken = async () => {
    const { data } = await supabase
      .from("cora_auth_tokens" as any)
      .select("environment, expires_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setToken((data as CoraToken | null) ?? null);
  };

  useEffect(() => {
    refreshToken();
  }, []);

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("cora-auth", {
        body: { force: true },
      });
      if (error) throw error;
      const res = data as { ok?: boolean; error?: string; expires_at?: string };
      if (!res?.ok) {
        toast.error(`❌ ${res?.error ?? "Falha na conexão com a Cora"}`);
      } else {
        toast.success("✅ Conexão Cora estabelecida! Token válido por 24h.");
        await refreshToken();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao testar conexão");
    } finally {
      setTesting(false);
    }
  };

  const openLogs = async () => {
    setLogsOpen(true);
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from("cora_api_logs" as any)
        .select("id, endpoint, method, response_status, error_message, duration_ms, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setLogs((data ?? []) as unknown as CoraLog[]);
    } catch (e) {
      console.error(e);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const stats = { issued: 0, paid: 0, total: 0, conversion: 0 };

  return (
    <Card className="rounded-2xl p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-accent/10 p-2">
            <CreditCard className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h3 className="font-display text-xl">Cora PJ</h3>
            <p className="text-sm text-muted-foreground">
              Emissão de boletos com QR Code Pix via Cora.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isConnected ? (
                <Badge className="gap-1 bg-success/15 text-success">
                  <CheckCircle2 className="h-3 w-3" /> Conectado
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" /> Desconectado
                </Badge>
              )}
              <Badge variant="outline" className="capitalize">
                {env === "production" ? "Produção" : "Stage"}
              </Badge>
              {token?.expires_at && (
                <Badge variant="outline" className="text-[11px]">
                  expira {format(new Date(token.expires_at), "dd/MM HH:mm", { locale: ptBR })}
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
          <Button onClick={openLogs} variant="ghost" className="gap-2">
            <FileText className="h-4 w-4" /> Ver logs
          </Button>
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Boletos emitidos</p>
          <p className="text-2xl font-display">{stats.issued}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Boletos pagos</p>
          <p className="text-2xl font-display">{stats.paid}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Valor recebido</p>
          <p className="text-2xl font-display">R$ {stats.total.toFixed(2)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase text-muted-foreground">Conversão</p>
          <p className="text-2xl font-display">{stats.conversion}%</p>
        </div>
      </div>

      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Últimas chamadas — Cora API</DialogTitle>
          </DialogHeader>
          {loadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma chamada registrada ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(l.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.method} {l.endpoint}
                    </TableCell>
                    <TableCell>
                      {l.response_status ? (
                        <Badge
                          variant={l.response_status < 400 ? "outline" : "destructive"}
                          className={l.response_status < 400 ? "bg-success/15 text-success" : ""}
                        >
                          {l.response_status}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">erro</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {l.duration_ms ? `${l.duration_ms} ms` : "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs text-destructive">
                      {l.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}