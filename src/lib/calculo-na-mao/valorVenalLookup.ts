import { LAND_VALUES } from "./landValues";
import { CONSTRUCTION_PRICES, COMMERCIALIZATION_FACTORS } from "./constructionFactors";

/**
 * Normaliza um código de área isótima para o formato padrão "XX###".
 * Ex.: "RE5"  → "RE005", "cs012" → "CS012", "AC 1" → "AC001".
 * Retorna o input em UPPER limpo se não bater no padrão.
 */
export function normalizeIsotima(input: string | null | undefined): string {
  if (!input) return "";
  const cleaned = String(input).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const match = cleaned.match(/^([A-Z]{2})(\d+)$/);
  if (!match) return cleaned;
  const [, prefix, digits] = match;
  return `${prefix}${digits.padStart(3, "0")}`;
}

/** Normaliza tipo de imóvel (APTO, CASA…). */
export function normalizeTipoImovel(input: string | null | undefined): string {
  if (!input) return "";
  const upper = String(input).trim().toUpperCase();
  const map: Record<string, string> = {
    APARTAMENTO: "APTO", APTO: "APTO", AP: "APTO",
    CASA: "CASA", RESIDENCIA: "CASA",
    SALA: "SALA", SALAS: "SALA", ESCRITORIO: "SALA",
    LOJA: "LOJA", COMERCIAL: "LOJA",
    TELHEIRO: "TELHEIRO",
    GALPAO: "GALPAO", "GALPÃO": "GALPAO", BARRACAO: "GALPAO",
  };
  return map[upper] ?? upper;
}

/** Normaliza padrão construtivo (OTIMO, BOM…). */
export function normalizePadrao(input: string | null | undefined): string {
  if (!input) return "";
  const upper = String(input).trim().toUpperCase().replace(/[ÓÒÔÕ]/g, "O");
  const map: Record<string, string> = {
    OTIMO: "OTIMO", "ÓTIMO": "OTIMO", EXCELENTE: "OTIMO", LUXO: "OTIMO",
    BOM: "BOM", BOA: "BOM",
    REGULAR: "REGULAR", MEDIO: "REGULAR", "MÉDIO": "REGULAR",
    BAIXO: "BAIXO", BAIXA: "BAIXO",
    POPULAR: "POPULAR", SIMPLES: "POPULAR",
  };
  return map[upper] ?? upper;
}

/** Busca valor de m² do terreno na Planta Genérica de Valores PJF. */
export function findValorM2Terreno(isotima: string): number | null {
  const key = normalizeIsotima(isotima);
  if (!key) return null;
  const value = (LAND_VALUES as Record<string, number>)[key];
  return typeof value === "number" ? value : null;
}

/** Busca valor de m² da edificação por tipo + padrão. */
export function findValorM2Edificacao(tipo: string, padrao: string): number | null {
  const t = normalizeTipoImovel(tipo);
  const p = normalizePadrao(padrao);
  if (!t || !p) return null;
  const tipoData = (CONSTRUCTION_PRICES as Record<string, Record<string, number>>)[t];
  if (!tipoData) return null;
  const v = tipoData[p];
  return typeof v === "number" ? v : null;
}

/** Busca fator de comercialização. Default 1.0 quando não encontrado. */
export function findFatorComercializacao(isotima: string, tipo: string): number {
  const key = normalizeIsotima(isotima);
  const t = normalizeTipoImovel(tipo);
  if (!key || !t) return 1.0;
  const areaData =
    (COMMERCIALIZATION_FACTORS as Record<string, Record<string, number>>)[key];
  if (!areaData) return 1.0;
  const found =
    areaData[t] ??
    Object.entries(areaData).find(([k]) => k.includes(t) || t.includes(k))?.[1];
  return typeof found === "number" ? found : 1.0;
}