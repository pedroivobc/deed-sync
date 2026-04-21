import { INDICES_INCC, INCC_ANO_BASE } from "../inccIndices";

export interface CorrecaoInccInput {
  valorCompra: number;
  anoContrato: number;
}

export interface CorrecaoInccResult {
  valorCompra: number;
  valorCorrigido: number;
  indiceAno: number;
  indiceBase: number;
  variacaoPercentual: number;
  diferenca: number;
  anoContrato: number;
  anoBase: number;
}

export function calcularCorrecaoIncc(input: CorrecaoInccInput): CorrecaoInccResult | null {
  const { valorCompra, anoContrato } = input;
  if (!valorCompra || valorCompra <= 0) return null;

  const indiceAno = INDICES_INCC[anoContrato];
  const indiceBase = INDICES_INCC[INCC_ANO_BASE];
  if (!indiceAno || !indiceBase) return null;

  const valorCorrigido =
    anoContrato === INCC_ANO_BASE ? valorCompra : (valorCompra / indiceAno) * indiceBase;

  const diferenca = valorCorrigido - valorCompra;
  const variacaoPercentual = (diferenca / valorCompra) * 100;

  return {
    valorCompra,
    valorCorrigido,
    indiceAno,
    indiceBase,
    variacaoPercentual,
    diferenca,
    anoContrato,
    anoBase: INCC_ANO_BASE,
  };
}