// Utilities for importing services from a standardized CSV.
// Filters out operational subtasks based on action verbs and detects client
// name from the task title. Tasks without a clear client are flagged for
// manual review instead of being discarded.

import type { ServiceStage, ServiceType } from "@/lib/serviceUi";

/** Default verbs that mark a row as an operational subtask (case-insensitive). */
export const DEFAULT_EXCLUDED_VERBS = [
  "Solicitar",
  "Anotar",
  "Pedir",
  "Enviar",
  "Emitir",
  "Conferir",
] as const;

/** Headers expected in the standardized template (case-insensitive match). */
export const TEMPLATE_HEADERS = [
  "titulo",
  "tipo",
  "etapa",
  "cliente",
  "responsavel_email",
  "prazo",
  "etapa_processo",
  "etapa_tarefa",
  "valor_calculo_final",
  "pasta_fisica",
] as const;

export interface CsvRowRaw {
  [key: string]: string | undefined;
}

export type ImportStatus = "ok" | "review" | "skipped";

export interface ParsedService {
  /** 1-based row number in the CSV (matches what the user sees in Excel). */
  rowNumber: number;
  status: ImportStatus;
  /** Reason when status is "skipped" or "review". */
  reason?: string;
  /** Original raw title cell. */
  rawTitle: string;

  // Mapped service fields
  subject: string;
  type: ServiceType;
  stage: ServiceStage;
  clientName: string | null;
  assignedEmail: string | null;
  dueDate: string | null; // ISO date (yyyy-mm-dd) or null
  etapaProcesso: string | null;
  etapaTarefa: string | null;
  valorCalculoFinal: number | null;
  pastaFisica: boolean;
}

export interface ParseOptions {
  excludedVerbs: string[];
  /** When true a row missing a recognizable client is flagged "review"
   *  instead of being skipped. Always true per product spec. */
  flagMissingClientForReview: boolean;
}

const TYPE_MAP: Record<string, ServiceType> = {
  escritura: "escritura",
  avulso: "avulso",
  "servico avulso": "avulso",
  "serviço avulso": "avulso",
  regularizacao: "regularizacao",
  regularização: "regularizacao",
};

const STAGE_MAP: Record<string, ServiceStage> = {
  entrada: "entrada",
  documentacao: "documentacao",
  documentação: "documentacao",
  analise: "analise",
  análise: "analise",
  execucao: "execucao",
  execução: "execucao",
  revisao: "revisao",
  revisão: "revisao",
  concluido: "concluido",
  concluído: "concluido",
};

function norm(value: string | undefined): string {
  return (value ?? "").trim();
}

function lc(value: string | undefined): string {
  return norm(value).toLowerCase();
}

/** True if the title starts with one of the operational verbs. */
export function startsWithExcludedVerb(title: string, verbs: string[]): string | null {
  const t = title.trim().toLowerCase();
  for (const v of verbs) {
    const verb = v.trim().toLowerCase();
    if (!verb) continue;
    // Match "verb " or "verb:" at the start. Tolerate punctuation/spaces.
    const re = new RegExp(`^${verb}(\\b|[\\s:,-])`, "i");
    if (re.test(t)) return v;
  }
  return null;
}

/** Heuristic: a "person name" is two or more capitalized words, optionally
 *  with prepositions (de, da, do, dos, das). Works for PF; for PJ the import
 *  still flags the row for review. */
const NAME_REGEX =
  /\b([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+(?:\s+(?:de|da|do|dos|das|e)\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+|\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõç]+){1,4})\b/;

const SEPARATORS = [" - ", " – ", " — ", " | ", ": "];

/** Detect a client name inside the title. Returns the detected name and the
 *  remaining title (after stripping the client + separator). */
export function detectClientFromTitle(title: string): { client: string | null; subject: string } {
  const trimmed = title.trim();

  // 1) Try common separators: "João Silva - Escritura"
  for (const sep of SEPARATORS) {
    const idx = trimmed.indexOf(sep);
    if (idx > 0) {
      const left = trimmed.slice(0, idx).trim();
      const right = trimmed.slice(idx + sep.length).trim();
      if (NAME_REGEX.test(left)) {
        return { client: left, subject: right || left };
      }
      if (NAME_REGEX.test(right)) {
        return { client: right.match(NAME_REGEX)![1], subject: left };
      }
    }
  }

  // 2) Fallback: scan for a name anywhere in the title
  const m = trimmed.match(NAME_REGEX);
  if (m) {
    return { client: m[1], subject: trimmed };
  }
  return { client: null, subject: trimmed };
}

function parseDateLoose(input: string | undefined): string | null {
  const v = norm(input);
  if (!v) return null;
  // Accept yyyy-mm-dd, dd/mm/yyyy, dd-mm-yyyy
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (iso) return v;
  const br = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/.exec(v);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseMoney(input: string | undefined): number | null {
  const v = norm(input);
  if (!v) return null;
  // Accept "1.234,56" (BR) and "1234.56"
  const cleaned = v.replace(/[^\d,.\-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseBool(input: string | undefined): boolean {
  const v = lc(input);
  return ["1", "true", "sim", "s", "x", "yes", "y"].includes(v);
}

/** Map a single CSV row into a normalized ParsedService entry. */
export function mapRow(
  row: CsvRowRaw,
  rowNumber: number,
  opts: ParseOptions,
): ParsedService {
  // Lookup helper that is case-insensitive and tolerant to accents.
  const get = (key: string): string => {
    const target = key.toLowerCase();
    for (const k of Object.keys(row)) {
      if (k.toLowerCase().trim() === target) return norm(row[k]);
    }
    return "";
  };

  const rawTitle = get("titulo") || get("título") || get("title") || get("task name") || "";
  const typeRaw = lc(get("tipo"));
  const stageRaw = lc(get("etapa"));

  const type: ServiceType = TYPE_MAP[typeRaw] ?? "escritura";
  const stage: ServiceStage = STAGE_MAP[stageRaw] ?? "entrada";

  const base: ParsedService = {
    rowNumber,
    status: "ok",
    rawTitle,
    subject: rawTitle,
    type,
    stage,
    clientName: get("cliente") || null,
    assignedEmail: get("responsavel_email") || get("responsável_email") || null,
    dueDate: parseDateLoose(get("prazo") || get("due_date")),
    etapaProcesso: get("etapa_processo") || null,
    etapaTarefa: get("etapa_tarefa") || null,
    valorCalculoFinal: parseMoney(get("valor_calculo_final")),
    pastaFisica: parseBool(get("pasta_fisica")),
  };

  if (!rawTitle) {
    return { ...base, status: "skipped", reason: "Linha sem título" };
  }

  // Filter operational subtasks
  const matchedVerb = startsWithExcludedVerb(rawTitle, opts.excludedVerbs);
  if (matchedVerb) {
    return {
      ...base,
      status: "skipped",
      reason: `Subtarefa operacional (inicia com "${matchedVerb}")`,
    };
  }

  // Detect client name from title if not provided in column
  if (!base.clientName) {
    const { client, subject } = detectClientFromTitle(rawTitle);
    if (client) {
      base.clientName = client;
      base.subject = subject || rawTitle;
    } else {
      // No name detected — flag for review (do not delete)
      return {
        ...base,
        status: opts.flagMissingClientForReview ? "review" : "skipped",
        reason: "Cliente não identificado no título",
      };
    }
  } else {
    // Client column provided — clean the title if it embeds the same name
    const cleaned = detectClientFromTitle(rawTitle);
    if (cleaned.client && cleaned.subject) {
      base.subject = cleaned.subject;
    }
  }

  return base;
}

/** Build the CSV template content for download. */
export function buildTemplateCsv(): string {
  const headers = TEMPLATE_HEADERS.join(",");
  const examples = [
    'João Silva - Escritura,escritura,entrada,João Silva,maria@empresa.com,2026-05-10,Coleta de documentos,Aguardando matrícula,15000,1',
    'Maria Souza - Regularização do imóvel,regularizacao,documentacao,Maria Souza,,2026-05-20,,,8000,0',
    'Solicitar certidão TJMG,escritura,entrada,,,,,,,', // será filtrada
  ];
  return [headers, ...examples].join("\n");
}