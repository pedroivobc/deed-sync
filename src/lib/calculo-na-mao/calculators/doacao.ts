import { getNotaryFee } from "../notaryFees";
import {
  PRECO_FOLHA,
  DOACAO_REGISTRO_BASE,
  DOACAO_REGISTRO_REDUZIDO,
  LIMITE_ITCD_25,
  RENUNCIA_USUFRUTO_REGISTRO,
} from "../constants";

export type DoacaoSubtipo = "doacao_simples" | "doacao_usufruto" | "renuncia_usufruto";

export const DOACAO_SUBTIPO_LABEL: Record<DoacaoSubtipo, string> = {
  doacao_simples: "Doação Simples",
  doacao_usufruto: "Doação c/ Usufruto",
  renuncia_usufruto: "Renúncia de Usufruto",
};

export interface DoacaoInput {
  subtipo: DoacaoSubtipo;
  valorAtribuido: number;
  avaliacaoFazenda: number;
  folhas: number;
  certidoes: number;
  honorarios: number;
}

export interface DoacaoResult {
  base: number | number[];
  itcd: number;
  itcdLabel: string;
  lavratura: number | number[];
  arquivamento: number;
  registro: number | number[];
  certidoes: number;
  honorarios: number;
  total: number;
}

export function calcularDoacao(input: DoacaoInput): DoacaoResult | null {
  const atrib = input.valorAtribuido || 0;
  const fazenda = input.avaliacaoFazenda || 0;
  if (atrib + fazenda <= 0) return null;
  const folhas = Math.max(0, input.folhas || 0);
  const certidoes = Math.max(0, input.certidoes || 0);
  const honorarios = Math.max(0, input.honorarios || 0);
  const arquivamento = folhas * PRECO_FOLHA;

  if (input.subtipo === "doacao_simples") {
    const base = Math.max(atrib, fazenda);
    const rate = base <= LIMITE_ITCD_25 ? 0.025 : 0.05;
    const itcd = base * rate;
    const lavratura = getNotaryFee(base);
    const registro = lavratura + DOACAO_REGISTRO_BASE;
    const total = itcd + lavratura + arquivamento + registro + certidoes + honorarios;
    return {
      base,
      itcd,
      itcdLabel: `ITCD (${(rate * 100).toFixed(1)}%)`,
      lavratura,
      arquivamento,
      registro,
      certidoes,
      honorarios,
      total,
    };
  }

  if (input.subtipo === "doacao_usufruto") {
    const baseD = Math.max(atrib, fazenda);
    const baseU = baseD / 3;
    const itcd = baseD * 0.05;
    const lavD = getNotaryFee(baseD);
    const lavU = getNotaryFee(baseU);
    const regD = lavD + DOACAO_REGISTRO_BASE;
    const regU = lavU + DOACAO_REGISTRO_REDUZIDO;
    const total = itcd + lavD + lavU + arquivamento + regD + regU + certidoes + honorarios;
    return {
      base: [baseD, baseU],
      itcd,
      itcdLabel: "ITCD (5%)",
      lavratura: [lavD, lavU],
      arquivamento,
      registro: [regD, regU],
      certidoes,
      honorarios,
      total,
    };
  }

  // renuncia_usufruto
  const base = Math.max(atrib, fazenda);
  const lavratura = getNotaryFee(base);
  const registro = RENUNCIA_USUFRUTO_REGISTRO;
  const total = lavratura + arquivamento + registro + certidoes + honorarios;
  return {
    base,
    itcd: 0,
    itcdLabel: "Isento",
    lavratura,
    arquivamento,
    registro,
    certidoes,
    honorarios,
    total,
  };
}