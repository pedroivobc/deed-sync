import { useState, FormEvent } from "react";
import { Loader2, Search, ArrowLeft, FileText, User, Calendar, Hash, CheckCircle2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/Logo";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/track-protocol`;

interface Andamento {
  data: string;
  status: string;
  stage_raw: string;
  descricao: string | null;
}

interface TrackResult {
  protocolo: string;
  codigo_verificador: string;
  solicitante: string;
  tipo_servico: string;
  assunto: string;
  data_solicitacao: string;
  status_atual: string;
  status_atual_raw: string;
  andamentos: Andamento[];
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function formatDateOnly(d: string): string {
  try {
    return new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  } catch {
    return d;
  }
}

const STAGE_COLORS: Record<string, string> = {
  entrada: "bg-muted text-muted-foreground",
  documentacao: "bg-primary/10 text-primary",
  analise: "bg-accent/10 text-accent",
  execucao: "bg-warning/15 text-warning",
  revisao: "bg-secondary text-secondary-foreground",
  concluido: "bg-success/15 text-success",
};

export default function Acompanhar() {
  const [protocolo, setProtocolo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(FUNCTIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolo: protocolo.trim().toUpperCase(),
          codigo_verificador: codigo.trim().toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Não foi possível consultar o protocolo.");
        setResult(null);
      } else {
        setResult(data as TrackResult);
      }
    } catch {
      setError("Erro de conexão. Tente novamente em instantes.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setProtocolo("");
    setCodigo("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2 px-4 py-6 text-center">
          <Logo />
          <p className="text-xs text-muted-foreground">
            Rua Santa Rita, 454, Sala 203, Centro, Juiz de Fora/MG
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        {!result ? (
          <Card className="rounded-2xl p-5 shadow-soft sm:p-8">
            <div className="mb-6 text-center">
              <h1 className="font-display text-2xl text-foreground sm:text-3xl">
                Acompanhar Protocolo
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Informe o protocolo e o código verificador recebidos por e-mail.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="protocolo" className="text-sm font-medium">
                  Protocolo
                </Label>
                <Input
                  id="protocolo"
                  placeholder="CLM-2026-000000"
                  value={protocolo}
                  onChange={(e) => setProtocolo(e.target.value)}
                  className="h-12 font-mono text-base uppercase"
                  autoComplete="off"
                  inputMode="text"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="codigo" className="text-sm font-medium">
                  Código Verificador
                </Label>
                <Input
                  id="codigo"
                  placeholder="XXXXXXXX"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  className="h-12 font-mono text-base uppercase tracking-widest"
                  autoComplete="off"
                  inputMode="text"
                  maxLength={8}
                  required
                />
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="h-12 w-full gap-2 text-base"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Search className="h-5 w-5" />
                )}
                Consultar
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              Suas informações são protegidas. Somente quem tem o código verificador pode visualizar o andamento.
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={reset} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>

            {/* Status atual */}
            <Card className="rounded-2xl p-5 shadow-soft">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Situação do Processo
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={`text-sm py-1.5 px-3 ${STAGE_COLORS[result.status_atual_raw] ?? ""}`}
                >
                  {result.status_atual_raw === "concluido" ? (
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                  ) : (
                    <Clock className="mr-1 h-4 w-4" />
                  )}
                  {result.status_atual}
                </Badge>
              </div>
            </Card>

            {/* Dados do serviço */}
            <Card className="rounded-2xl divide-y divide-border p-0 shadow-soft">
              <InfoRow icon={<Hash className="h-4 w-4" />} label="Protocolo" value={result.protocolo} mono />
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Cadastro" value={formatDateOnly(result.data_solicitacao)} />
              <InfoRow icon={<User className="h-4 w-4" />} label="Interessado / Solicitante" value={result.solicitante} />
              <InfoRow icon={<FileText className="h-4 w-4" />} label="Tipo de Serviço" value={result.tipo_servico} />
            </Card>

            {/* Histórico (timeline) */}
            <Card className="rounded-2xl p-5 shadow-soft">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Andamentos
              </h2>
              {result.andamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem andamentos registrados.</p>
              ) : (
                <ol className="relative ml-2 space-y-5 border-l border-border pl-5">
                  {result.andamentos.map((a, i) => (
                    <li key={i} className="relative">
                      <span
                        className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-background ${
                          i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                        }`}
                      />
                      <div className="text-xs text-muted-foreground">
                        {formatDate(a.data)}
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-foreground">
                        {a.status}
                      </div>
                      {a.descricao && (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {a.descricao}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </Card>

            <p className="px-2 text-center text-xs text-muted-foreground">
              <strong>Observação:</strong> As informações de andamento são atualizadas manualmente por nossa equipe e podem não refletir, em tempo real, o estágio exato do serviço.
            </p>
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Clemente Assessoria
        </footer>
      </main>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-4">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-0.5 break-words text-sm text-foreground ${mono ? "font-mono font-semibold" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}