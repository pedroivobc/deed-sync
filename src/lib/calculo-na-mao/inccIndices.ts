/**
 * Índices INCC acumulados por ano.
 * Atualizar anualmente.
 */
export const INDICES_INCC: Record<number, number> = {
  1997: 30.25, 1998: 31.92, 1999: 32.45, 2000: 35.14,
  2001: 37.45, 2002: 40.30, 2003: 44.71, 2004: 49.64,
  2005: 53.23, 2006: 56.54, 2007: 58.25, 2008: 60.69,
  2009: 64.57, 2010: 67.29, 2011: 71.08, 2012: 75.80,
  2013: 79.99, 2014: 84.61, 2015: 90.16, 2016: 99.61,
  2017: 106.57, 2018: 109.55, 2019: 113.99, 2020: 117.72,
  2021: 122.79, 2022: 135.98, 2023: 144.00, 2024: 150.74,
  2025: 157.40, 2026: 165.54,
};

export const INCC_ANO_BASE = 2026;

/** Lista de anos disponíveis em ordem decrescente para selects. */
export const INCC_ANOS = Object.keys(INDICES_INCC)
  .map(Number)
  .sort((a, b) => b - a);