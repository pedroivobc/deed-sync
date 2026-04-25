import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { notify, humanizeBackendError } from "@/lib/notify";
import {
  buildTemplateCsv,
  DEFAULT_EXCLUDED_VERBS,
  mapRow,
  TEMPLATE_HEADERS,
  type CsvRowRaw,
  type ParsedService,
} from "@/lib/csvImport";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: () => void;
}

type ClientLookup = { id: string; name: string };

export function ImportCsvDialog({ open, onOpenChange, onImported }: Props) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedService[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  const [verbs, setVerbs] = useState<string[]>([...DEFAULT_EXCLUDED_VERBS]);
  const [newVerb, setNewVerb] = useState("");

  const stats = useMemo(() => {
    return {
      total: rows.length,
      ok: rows.filter((r) => r.status === "ok").length,
      review: rows.filter((r) => r.status === "review").length,
      skipped: rows.filter((r) => r.status === "skipped").length,
    };
  }, [rows]);

  const reset = () => {
    setFileName(null);
    setRows([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv = buildTemplateCsv();
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_importacao_servicos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCurrent = async () => {
    const { data, error } = await supabase
      .from("services")
      .select(
        "subject, type, stage, due_date, etapa_processo, etapa_tarefa, valor_calculo_final, pasta_fisica, client:clients(name), assigned:profiles!services_assigned_to_fkey(email)"
      )
      .order("created_at", { ascending: false });
    if (error) {
      notify.error(humanizeBackendError(error));
      return;
    }
    type Row = {
      subject: string;
      type: string;
      stage: string;
      due_date: string | null;
      etapa_processo: string | null;
      etapa_tarefa: string | null;
      valor_calculo_final: number | null;
      pasta_fisica: boolean;
      client: { name: string } | null;
      assigned: { email: string } | null;
    };
    const rowsCsv = ((data ?? []) as Row[]).map((s) => ({
      titulo: s.subject,
      tipo: s.type,
      etapa: s.stage,
      cliente: s.client?.name ?? "",
      responsavel_email: s.assigned?.email ?? "",
      prazo: s.due_date ?? "",
      etapa_processo: s.etapa_processo ?? "",
      etapa_tarefa: s.etapa_tarefa ?? "",
      valor_calculo_final: s.valor_calculo_final ?? "",
      pasta_fisica: s.pasta_fisica ? 1 : 0,
    }));
    const csv = Papa.unparse({ fields: [...TEMPLATE_HEADERS], data: rowsCsv });
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "servicos_export.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    setParsing(true);
    setFileName(file.name);
    Papa.parse<CsvRowRaw>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const mapped = result.data.map((row, i) =>
          mapRow(row, i + 2, {
            excludedVerbs: verbs,
            flagMissingClientForReview: true,
          })
        );
        setRows(mapped);
        setParsing(false);
      },
      error: (err) => {
        notify.error("Falha ao ler CSV", { description: err.message });
        setParsing(false);
      },
    });
  };

  const reprocessWithVerbs = (nextVerbs: string[]) => {
    if (rows.length === 0) return;
    setRows((prev) =>
      prev.map((r) =>
        mapRow(
          {
            titulo: r.rawTitle,
            tipo: r.type,
            etapa: r.stage,
            cliente: r.clientName ?? "",
            responsavel_email: r.assignedEmail ?? "",
            prazo: r.dueDate ?? "",
            etapa_processo: r.etapaProcesso ?? "",
            etapa_tarefa: r.etapaTarefa ?? "",
            valor_calculo_final:
              r.valorCalculoFinal !== null ? String(r.valorCalculoFinal) : "",
            pasta_fisica: r.pastaFisica ? "1" : "",
          },
          r.rowNumber,
          { excludedVerbs: nextVerbs, flagMissingClientForReview: true }
        )
      )
    );
  };

  const addVerb = () => {
    const v = newVerb.trim();
    if (!v) return;
    if (verbs.some((x) => x.toLowerCase() === v.toLowerCase())) {
      setNewVerb("");
      return;
    }
    const next = [...verbs, v];
    setVerbs(next);
    setNewVerb("");
    reprocessWithVerbs(next);
  };

  const removeVerb = (verb: string) => {
    const next = verbs.filter((v) => v !== verb);
    setVerbs(next);
    reprocessWithVerbs(next);
  };

  /** Resolve clientName -> client_id. Creates a draft client if none exists. */
  const resolveClientId = async (
    name: string,
    cache: Map<string, string>
  ): Promise<string | null> => {
    const key = name.trim().toLowerCase();
    if (cache.has(key)) return cache.get(key)!;
    const { data } = await supabase
      .from("clients")
      .select("id, name")
      .ilike("name", name.trim())
      .limit(1);
    const found = (data ?? [])[0] as ClientLookup | undefined;
    if (found) {
      cache.set(key, found.id);
      return found.id;
    }
    const { data: created, error } = await supabase
      .from("clients")
      .insert({ name: name.trim(), created_by: user?.id ?? null })
      .select("id")
      .single();
    if (error || !created) return null;
    cache.set(key, created.id);
    return created.id;
  };

  const doImport = async () => {
    const importable = rows.filter((r) => r.status !== "skipped");
    if (importable.length === 0) {
      notify.error("Nenhuma linha válida para importar.");
      return;
    }
    setImporting(true);
    const cache = new Map<string, string>();
    let success = 0;
    let failed = 0;

    for (const r of importable) {
      const clientId = r.clientName ? await resolveClientId(r.clientName, cache) : null;
      const subject =
        r.status === "review"
          ? `[REVISAR] ${r.subject || r.rawTitle}`
          : r.subject || r.rawTitle;

      const { error } = await supabase.from("services").insert({
        subject,
        type: r.type,
        stage: r.stage,
        client_id: clientId,
        due_date: r.dueDate,
        etapa_processo: r.etapaProcesso,
        etapa_tarefa: r.etapaTarefa,
        valor_calculo_final: r.valorCalculoFinal,
        pasta_fisica: r.pastaFisica,
        created_by: user?.id ?? null,
      });
      if (error) failed += 1;
      else success += 1;
    }

    setImporting(false);
    if (success > 0) {
      notify.success(`Importação concluída: ${success} criado(s)${failed ? `, ${failed} falha(s)` : ""}.`);
      onImported?.();
      reset();
      onOpenChange(false);
    } else {
      notify.error(`Falha ao importar (${failed} linha(s)).`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            Importar serviços via CSV
          </DialogTitle>
          <DialogDescription>
            Filtra subtarefas operacionais e detecta o cliente automaticamente a partir do título.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Templates */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Baixar modelo CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportCurrent}>
              <Download className="mr-2 h-4 w-4" /> Exportar serviços atuais
            </Button>
          </div>

          {/* Verbos editáveis */}
          <Card className="p-3">
            <Label className="text-xs font-medium text-muted-foreground">
              Verbos que marcam subtarefas operacionais (excluídas da importação)
            </Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {verbs.map((v) => (
                <Badge key={v} variant="secondary" className="gap-1">
                  {v}
                  <button
                    type="button"
                    onClick={() => removeVerb(v)}
                    aria-label={`Remover ${v}`}
                    className="ml-0.5 rounded hover:bg-background/40"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={newVerb}
                onChange={(e) => setNewVerb(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addVerb();
                  }
                }}
                placeholder="Adicionar verbo (ex: Verificar)"
                className="h-8 text-sm"
              />
              <Button size="sm" variant="outline" onClick={addVerb}>
                Adicionar
              </Button>
            </div>
          </Card>

          {/* Upload */}
          {rows.length === 0 ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition hover:border-accent hover:bg-accent/5"
            >
              {parsing ? (
                <Loader2 className="h-7 w-7 animate-spin text-accent" />
              ) : (
                <Upload className="h-7 w-7 text-muted-foreground" />
              )}
              <div className="text-sm font-medium">
                {parsing ? "Processando…" : "Selecionar arquivo CSV"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Use o modelo acima para garantir o mapeamento correto
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{fileName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{stats.total} linha(s)</span>
                <Badge variant="outline" className="border-success/40 text-success">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> {stats.ok} ok
                </Badge>
                <Badge variant="outline" className="border-warning/40 text-warning">
                  <AlertCircle className="mr-1 h-3 w-3" /> {stats.review} revisar
                </Badge>
                <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
                  {stats.skipped} ignorada(s)
                </Badge>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
                  Trocar arquivo
                </Button>
              </div>

              <Card className="max-h-[420px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="w-12">Linha</TableHead>
                      <TableHead className="w-24">Status</TableHead>
                      <TableHead>Título original</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Observação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.rowNumber}>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.rowNumber}
                        </TableCell>
                        <TableCell>
                          {r.status === "ok" && (
                            <Badge className="bg-success/15 text-success hover:bg-success/15">
                              OK
                            </Badge>
                          )}
                          {r.status === "review" && (
                            <Badge className="bg-warning/15 text-warning hover:bg-warning/15">
                              Revisar
                            </Badge>
                          )}
                          {r.status === "skipped" && (
                            <Badge variant="outline" className="text-muted-foreground">
                              Ignorada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-xs">
                          {r.rawTitle}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.clientName ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-xs">{r.subject}</TableCell>
                        <TableCell className="text-xs">{r.type}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.reason ?? ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={doImport}
            disabled={importing || rows.filter((r) => r.status !== "skipped").length === 0}
          >
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Importar {stats.ok + stats.review > 0 ? `${stats.ok + stats.review} serviço(s)` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}