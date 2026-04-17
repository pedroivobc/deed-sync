// Finance helpers: categories, periods, KPI calculations, CSV export
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, subMonths, subDays, isAfter, isBefore, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";

export type FinanceEntry = Database["public"]["Tables"]["finance_entries"]["Row"] & {
  due_date: string | null;
  payment_method: string | null;
  document_number: string | null;
  notes: string | null;
};
export type FinanceType = Database["public"]["Enums"]["finance_type"];
export type FinanceStatus = Database["public"]["Enums"]["finance_status"];

export const RECEITA_CATEGORIES = [
  "Escritura",
  "Serviço avulso",
  "Regularização",
  "Consultoria",
  "Outros",
] as const;

export const DESPESA_CATEGORIES = [
  "Emolumentos cartório",
  "Certidões",
  "Marketing",
  "Folha",
  "Infraestrutura",
  "Impostos",
  "Outros",
] as const;

export const PAYMENT_METHODS = [
  "PIX",
  "Boleto",
  "Transferência",
  "Cartão",
  "Dinheiro",
  "Cheque",
  "Outros",
] as const;

export type PeriodKey = "mes" | "trimestre" | "ano" | "12m" | "total" | "custom";

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  mes: "Mês atual",
  trimestre: "Trimestre",
  ano: "Ano",
  "12m": "Últimos 12 meses",
  total: "Total",
  custom: "Personalizado",
};

export interface PeriodRange {
  from: Date | null;
  to: Date | null;
  prevFrom: Date | null;
  prevTo: Date | null;
}

export function resolvePeriod(key: PeriodKey, custom?: { from: Date | null; to: Date | null }): PeriodRange {
  const now = new Date();
  let from: Date | null = null;
  let to: Date | null = null;

  switch (key) {
    case "mes":
      from = startOfMonth(now); to = endOfMonth(now); break;
    case "trimestre":
      from = startOfQuarter(now); to = endOfQuarter(now); break;
    case "ano":
      from = startOfYear(now); to = endOfYear(now); break;
    case "12m":
      from = startOfMonth(subMonths(now, 11)); to = endOfMonth(now); break;
    case "total":
      from = null; to = null; break;
    case "custom":
      from = custom?.from ?? null; to = custom?.to ?? null; break;
  }

  // Previous comparable period
  let prevFrom: Date | null = null, prevTo: Date | null = null;
  if (from && to) {
    const days = differenceInDays(to, from) + 1;
    prevTo = subDays(from, 1);
    prevFrom = subDays(prevTo, days - 1);
  }
  return { from, to, prevFrom, prevTo };
}

export function inRange(dateStr: string | null, from: Date | null, to: Date | null): boolean {
  if (!dateStr) return false;
  if (!from && !to) return true;
  const d = new Date(dateStr + "T00:00:00");
  if (from && isBefore(d, from)) return false;
  if (to) {
    const end = new Date(to); end.setHours(23, 59, 59, 999);
    if (isAfter(d, end)) return false;
  }
  return true;
}

// Money: store/manipulate in BRL float, format BR
export function toCents(n: number): number { return Math.round(n * 100); }
export function fromCents(c: number): number { return c / 100; }

export function sumAmounts(entries: FinanceEntry[]): number {
  // Cents-based aggregation to avoid float drift
  const total = entries.reduce((acc, e) => acc + toCents(Number(e.amount)), 0);
  return fromCents(total);
}

export function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null; // null = sem base de comparação
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export function formatPct(n: number | null): string {
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

// ----- KPI helpers -----
export interface KpiBundle {
  receita: number;
  despesa: number;
  liquido: number;
  margem: number | null; // %
  receivable: number; // a receber (pendente)
  payable: number;    // a pagar (pendente)
  ticketMedio: number;
  fluxoD30: number;   // projeção
  inadimplenciaPct: number; // %
  inadimplenciaValor: number;
}

export function computeKpis(entries: FinanceEntry[]): KpiBundle {
  const receitas = entries.filter((e) => e.type === "receita");
  const despesas = entries.filter((e) => e.type === "despesa");
  const receita = sumAmounts(receitas.filter((e) => e.status === "pago"));
  const despesa = sumAmounts(despesas.filter((e) => e.status === "pago"));
  const liquido = +(receita - despesa).toFixed(2);
  const margem = receita > 0 ? (liquido / receita) * 100 : null;

  const receivable = sumAmounts(receitas.filter((e) => e.status === "pendente"));
  const payable = sumAmounts(despesas.filter((e) => e.status === "pendente"));

  const servicosComReceita = new Set(
    receitas.filter((e) => e.status === "pago" && e.service_id).map((e) => e.service_id as string)
  );
  const ticketMedio = servicosComReceita.size > 0 ? receita / servicosComReceita.size : 0;

  // Projeção D+30 — pendentes com due_date nos próximos 30 dias
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d30 = new Date(today); d30.setDate(d30.getDate() + 30);
  const inWindow = (e: FinanceEntry) => {
    if (!e.due_date) return false;
    const dd = new Date(e.due_date + "T00:00:00");
    return !isBefore(dd, today) && !isAfter(dd, d30);
  };
  const projReceita = sumAmounts(receitas.filter((e) => e.status === "pendente" && inWindow(e)));
  const projDespesa = sumAmounts(despesas.filter((e) => e.status === "pendente" && inWindow(e)));
  const fluxoD30 = +(projReceita - projDespesa).toFixed(2);

  // Inadimplência: pendentes com vencimento > 30 dias atrás (apenas receitas)
  const limit = new Date(today); limit.setDate(limit.getDate() - 30);
  const overdue = receitas.filter((e) => {
    if (e.status !== "pendente" || !e.due_date) return false;
    const dd = new Date(e.due_date + "T00:00:00");
    return isBefore(dd, limit);
  });
  const inadimplenciaValor = sumAmounts(overdue);
  const totalReceitasPotencial = sumAmounts(receitas);
  const inadimplenciaPct = totalReceitasPotencial > 0 ? (inadimplenciaValor / totalReceitasPotencial) * 100 : 0;

  return { receita, despesa, liquido, margem, receivable, payable, ticketMedio, fluxoD30, inadimplenciaPct, inadimplenciaValor };
}

// ----- Group by category for DRE -----
export interface DreRow {
  category: string;
  current: number;
  previous: number;
  variation: number | null;
}

export function dreByCategory(entries: FinanceEntry[], type: FinanceType, categories: readonly string[], from: Date | null, to: Date | null, prevFrom: Date | null, prevTo: Date | null): DreRow[] {
  return categories.map((cat) => {
    const matchType = entries.filter((e) => e.type === type);
    const inCat = (e: FinanceEntry) => (e.category ?? "Outros") === cat;
    const current = sumAmounts(matchType.filter((e) => inCat(e) && inRange(e.date, from, to) && e.status === "pago"));
    const previous = sumAmounts(matchType.filter((e) => inCat(e) && inRange(e.date, prevFrom, prevTo) && e.status === "pago"));
    return { category: cat, current, previous, variation: pctChange(current, previous) };
  });
}

// ----- Last 6 months chart -----
export interface MonthBucket { label: string; receita: number; despesa: number; key: string; }
export function last6Months(entries: FinanceEntry[]): MonthBucket[] {
  const now = new Date();
  const buckets: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = subMonths(now, i);
    const from = startOfMonth(ref), to = endOfMonth(ref);
    const monthEntries = entries.filter((e) => inRange(e.date, from, to) && e.status === "pago");
    buckets.push({
      key: format(ref, "yyyy-MM"),
      label: format(ref, "MMM/yy", { locale: ptBR }),
      receita: sumAmounts(monthEntries.filter((e) => e.type === "receita")),
      despesa: sumAmounts(monthEntries.filter((e) => e.type === "despesa")),
    });
  }
  return buckets;
}

// ----- CSV export -----
export function exportToCsv(entries: FinanceEntry[], filename: string) {
  const headers = ["Data", "Vencimento", "Tipo", "Categoria", "Status", "Descrição", "Valor", "Forma pagamento", "Documento", "Observações"];
  const rows = entries.map((e) => [
    e.date,
    e.due_date ?? "",
    e.type,
    e.category ?? "",
    e.status,
    (e.description ?? "").replace(/"/g, '""'),
    String(e.amount).replace(".", ","),
    e.payment_method ?? "",
    e.document_number ?? "",
    (e.notes ?? "").replace(/"/g, '""'),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(";")).join("\n");
  // BOM UTF-8 for Excel BR
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
