/**
 * Cálculo de Valor Venal (PJF — Juiz de Fora).
 *
 * Fórmula EXATA usada na "Cálculo na Mão 2.0":
 *   areaTerreno   = vvTerrenoIPTU / vM2TerrenoIPTU
 *   areaEdif      = vvEdificacaoIPTU / vM2EdificacaoIPTU
 *   valorTerreno  = areaTerreno × valorM2TerrenoPJF
 *   valorEdif     = areaEdif    × valorM2EdificacaoPJF
 *   valorVenal    = (valorTerreno + valorEdif) × fatorComercializacao
 */

export interface ValorVenalInputs {
  /** Valor venal do terreno informado pelo carnê do IPTU */
  vvTerrenoIPTU: number;
  /** Valor m² terreno informado pelo carnê do IPTU */
  vM2TerrenoIPTU: number;
  /** Valor venal da edificação informado pelo carnê do IPTU */
  vvEdificacaoIPTU: number;
  /** Valor m² edificação informado pelo carnê do IPTU */
  vM2EdificacaoIPTU: number;
  /** Valor de referência do m² terreno (Planta Genérica de Valores PJF) */
  valorM2TerrenoPJF: number;
  /** Valor de referência do m² edificação (tabela de construção PJF) */
  valorM2EdificacaoPJF: number;
  /** Fator de comercialização para a área isótima × tipo */
  fatorComercializacao: number;
}

export interface ValorVenalResult {
  areaTerrenoM2: number;
  areaEdificacaoM2: number;
  valorTerrenoCorrigido: number;
  valorEdificacaoCorrigida: number;
  valorVenalTotal: number;
}

export function calcularValorVenal(inputs: ValorVenalInputs): ValorVenalResult | null {
  const {
    vvTerrenoIPTU, vM2TerrenoIPTU, vvEdificacaoIPTU, vM2EdificacaoIPTU,
    valorM2TerrenoPJF, valorM2EdificacaoPJF, fatorComercializacao,
  } = inputs;

  if (vM2TerrenoIPTU <= 0 || vM2EdificacaoIPTU <= 0) return null;

  const areaTerrenoM2 = vvTerrenoIPTU / vM2TerrenoIPTU;
  const areaEdificacaoM2 = vvEdificacaoIPTU / vM2EdificacaoIPTU;
  const valorTerrenoCorrigido = areaTerrenoM2 * valorM2TerrenoPJF;
  const valorEdificacaoCorrigida = areaEdificacaoM2 * valorM2EdificacaoPJF;
  const valorVenalTotal =
    (valorTerrenoCorrigido + valorEdificacaoCorrigida) * fatorComercializacao;

  return {
    areaTerrenoM2,
    areaEdificacaoM2,
    valorTerrenoCorrigido,
    valorEdificacaoCorrigida,
    valorVenalTotal,
  };
}