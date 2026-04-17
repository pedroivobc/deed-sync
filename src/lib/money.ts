// Money helpers (BRL)
export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Convert masked string like "1.250,50" / "R$ 1.250,50" to number 1250.50
export function parseBRL(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = String(text).replace(/[^\d,]/g, "").replace(/\./g, "");
  if (!cleaned) return null;
  const normalized = cleaned.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}
