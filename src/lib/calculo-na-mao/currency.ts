import { formatBRL, parseBRL } from "@/lib/money";

/** Wrapper para manter API consistente com a spec do módulo. */
export const formatCurrency = (value: number | null | undefined) =>
  formatBRL(value) || "R$ 0,00";

/** Sempre retorna number (0 quando vazio/inválido). */
export const parseCurrency = (text: string | null | undefined): number =>
  parseBRL(text) ?? 0;

export const formatPercent = (value: number, signed = false) =>
  new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? "always" : "auto",
  }).format(value / 100);