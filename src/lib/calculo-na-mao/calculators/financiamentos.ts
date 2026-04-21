import { getNotaryFee } from "../notaryFees";
import {
  PRECO_FOLHA,
  ESCRITURA_REGISTRO_BASE,
  ESCRITURA_REGISTRO_REDUZIDO,
} from "../constants";

export const LIMIAR_ITBI_SFH = 107603.17;
export const ITBI_FIXO_LIMIAR = 538.02;

/** Caixa (SFH): regra de limiar + alíquota mista. */
export function calcularItbiSfh(base: number, financiado: number): number {
  if (base <= 0) return 0;
  if (financiado < LIMIAR_ITBI_SFH) {
    return (base - financiado) * 0.02 + financiado * 0.005;
  }
  return (base - LIMIAR_ITBI_SFH) * 0.02 + ITBI_FIXO_LIMIAR;
}

export interface FinanciamentoInput {
  valorDeclarado: number;
  valorVenalCorrigido: number;
  valorFinanciado: number;
  folhas: number;
  certidoes: number;
  honorarios: number;
}

export interface FinanciamentoResult {
  base: number;
  itbi: number;
  itbiLabel: string;
  lavraturaCompra: number;
  lavraturaHipoteca: number;
  arquivamento: number;
  registroCompra: number;
  registroHipoteca: number;
  certidoes: number;
  honorarios: number;
  total: number;
}

function calcularFinanciamento(
  input: FinanciamentoInput,
  itbiCalc: (base: number, financiado: number) => number,
  itbiLabel: string,
): FinanciamentoResult | null {
  const declarado = input.valorDeclarado || 0;
  const venal = input.valorVenalCorrigido || 0;
  const financiado = input.valorFinanciado || 0;
  if (declarado + venal <= 0) return null;

  const base = Math.max(declarado, venal);
  const baseHipoteca = financiado;

  const itbi = itbiCalc(base, financiado);
  const lavraturaCompra = getNotaryFee(base);
  const lavraturaHipoteca = getNotaryFee(baseHipoteca);
  const folhas = Math.max(0, input.folhas || 0);
  const arquivamento = folhas * PRECO_FOLHA;
  const registroCompra = lavraturaCompra + ESCRITURA_REGISTRO_BASE;
  const registroHipoteca = lavraturaHipoteca + ESCRITURA_REGISTRO_REDUZIDO;
  const certidoes = Math.max(0, input.certidoes || 0);
  const honorarios = Math.max(0, input.honorarios || 0);

  const total =
    itbi +
    lavraturaCompra +
    lavraturaHipoteca +
    arquivamento +
    registroCompra +
    registroHipoteca +
    certidoes +
    honorarios;

  return {
    base,
    itbi,
    itbiLabel,
    lavraturaCompra,
    lavraturaHipoteca,
    arquivamento,
    registroCompra,
    registroHipoteca,
    certidoes,
    honorarios,
    total,
  };
}

/** Caixa: utiliza a regra do SFH. */
export function calcularFinanciamentoCaixa(input: FinanciamentoInput) {
  return calcularFinanciamento(input, calcularItbiSfh, "ITBI (SFH — 2% + 0,5%)");
}

/** Privado: ITBI cheio de 2% sobre a base. */
export function calcularFinanciamentoPrivado(input: FinanciamentoInput) {
  return calcularFinanciamento(input, (base) => base * 0.02, "ITBI (2%)");
}