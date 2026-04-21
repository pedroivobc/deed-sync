import { getNotaryFee } from "../notaryFees";
import { PRECO_FOLHA, ESCRITURA_REGISTRO_REDUZIDO } from "../constants";

export interface RegularizacaoInput {
  /** Valor venal corrigido do imóvel (base de cálculo). */
  valorVenalCorrigido: number;
  /** Folhas de averbação (padrão 10). */
  folhas: number;
  certidoes: number;
  honorarios: number;
}

export interface RegularizacaoResult {
  base: number;
  averbacao: number;
  arquivamento: number;
  registro: number;
  certidoes: number;
  honorarios: number;
  total: number;
}

/**
 * Regularização de construção/edificação: averbação na matrícula.
 * Usa a tabela de emolumentos sobre o valor venal corrigido + registro reduzido.
 */
export function calcularRegularizacao(
  input: RegularizacaoInput,
): RegularizacaoResult | null {
  const base = input.valorVenalCorrigido || 0;
  if (base <= 0) return null;
  const folhas = Math.max(0, input.folhas || 0);
  const certidoes = Math.max(0, input.certidoes || 0);
  const honorarios = Math.max(0, input.honorarios || 0);

  const averbacao = getNotaryFee(base);
  const arquivamento = folhas * PRECO_FOLHA;
  const registro = averbacao + ESCRITURA_REGISTRO_REDUZIDO;

  const total = averbacao + arquivamento + registro + certidoes + honorarios;

  return { base, averbacao, arquivamento, registro, certidoes, honorarios, total };
}