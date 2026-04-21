import { getNotaryFee } from "../notaryFees";
import {
  PRECO_FOLHA,
  ESCRITURA_REGISTRO_BASE,
  ESCRITURA_REGISTRO_REDUZIDO,
  LIMITE_ITCD_25,
  RENUNCIA_USUFRUTO_REGISTRO,
} from "../constants";

export type EscrituraSubtipo =
  | "compra_venda_simples"
  | "com_intervenienca"
  | "compra_vinculo"
  | "doacao_simples"
  | "doacao_usufruto"
  | "renuncia_usufruto";

export const ESCRITURA_SUBTIPO_LABEL: Record<EscrituraSubtipo, string> = {
  compra_venda_simples: "Compra e Venda Simples",
  com_intervenienca: "Com Interveniência",
  compra_vinculo: "Compra + Vínculo",
  doacao_simples: "Doação Simples",
  doacao_usufruto: "Doação c/ Usufruto",
  renuncia_usufruto: "Renúncia de Usufruto",
};

export interface EscrituraInput {
  subtipo: EscrituraSubtipo;
  valorDeclarado?: number;
  valorVenalCorrigido?: number;
  // interveniência
  valorDeclarado1?: number;
  valorVenal1?: number;
  valorDeclarado2?: number;
  valorVenal2?: number;
  // compra + vínculo
  valorDeclaradoCompra?: number;
  valorVenalCompra?: number;
  valorVinculo?: number;
  // doação / renúncia
  valorAtribuido?: number;
  avaliacaoFazenda?: number;
  // comuns
  folhas: number;
  certidoes: number;
  honorarios: number;
}

export interface EscrituraResult {
  base: number | number[];
  imposto: number | number[];
  impostoLabel: string;
  lavratura: number | number[];
  arquivamento: number;
  registro: number | number[];
  certidoes: number;
  honorarios: number;
  total: number;
}

const sum = (v: number | number[]) =>
  Array.isArray(v) ? v.reduce((a, b) => a + b, 0) : v;

export function calcularEscritura(input: EscrituraInput): EscrituraResult | null {
  const folhas = Math.max(0, input.folhas || 0);
  const certidoes = Math.max(0, input.certidoes || 0);
  const honorarios = Math.max(0, input.honorarios || 0);
  const arquivamento = folhas * PRECO_FOLHA;

  const REG_BASE = ESCRITURA_REGISTRO_BASE;
  const REG_RED = ESCRITURA_REGISTRO_REDUZIDO;

  switch (input.subtipo) {
    case "compra_venda_simples": {
      const declarado = input.valorDeclarado ?? 0;
      const venal = input.valorVenalCorrigido ?? 0;
      if (declarado <= 0 && venal <= 0) return null;
      const base = Math.max(declarado, venal);
      const itbi = base * 0.02;
      const lavratura = getNotaryFee(base);
      const registro = lavratura + REG_BASE;
      const total = itbi + lavratura + arquivamento + registro + certidoes + honorarios;
      return { base, imposto: itbi, impostoLabel: "ITBI (2%)", lavratura, arquivamento, registro, certidoes, honorarios, total };
    }
    case "com_intervenienca": {
      const dec1 = input.valorDeclarado1 ?? 0;
      const ven1 = input.valorVenal1 ?? 0;
      const dec2 = input.valorDeclarado2 ?? 0;
      const ven2 = input.valorVenal2 ?? 0;
      if (dec1 + ven1 + dec2 + ven2 <= 0) return null;
      const base1 = Math.max(dec1, ven1);
      const base2 = Math.max(dec2, ven2);
      const itbi1 = base1 * 0.02;
      const itbi2 = base2 * 0.02;
      const lav1 = getNotaryFee(base1);
      const lav2 = getNotaryFee(base2);
      const reg1 = lav1 + REG_BASE;
      const reg2 = lav2 + REG_RED;
      const total = itbi1 + itbi2 + lav1 + lav2 + arquivamento + reg1 + reg2 + certidoes + honorarios;
      return {
        base: [base1, base2],
        imposto: [itbi1, itbi2],
        impostoLabel: "ITBI (2% + 2%)",
        lavratura: [lav1, lav2],
        arquivamento,
        registro: [reg1, reg2],
        certidoes,
        honorarios,
        total,
      };
    }
    case "compra_vinculo": {
      const decC = input.valorDeclaradoCompra ?? 0;
      const venC = input.valorVenalCompra ?? 0;
      const valV = input.valorVinculo ?? 0;
      if (decC + venC + valV <= 0) return null;
      const baseC = Math.max(decC, venC);
      const baseV = valV;
      const itbi = baseC * 0.02;
      const lavC = getNotaryFee(baseC);
      const lavV = getNotaryFee(baseV);
      const regC = lavC + REG_BASE;
      const regV = lavV + REG_RED;
      const total = itbi + lavC + lavV + arquivamento + regC + regV + certidoes + honorarios;
      return {
        base: [baseC, baseV],
        imposto: itbi,
        impostoLabel: "ITBI (2%)",
        lavratura: [lavC, lavV],
        arquivamento,
        registro: [regC, regV],
        certidoes,
        honorarios,
        total,
      };
    }
    case "doacao_simples": {
      const atrib = input.valorAtribuido ?? 0;
      const fazenda = input.avaliacaoFazenda ?? 0;
      if (atrib + fazenda <= 0) return null;
      const base = Math.max(atrib, fazenda);
      const rate = base <= LIMITE_ITCD_25 ? 0.025 : 0.05;
      const itcd = base * rate;
      const lavratura = getNotaryFee(base);
      const registro = lavratura + REG_BASE;
      const total = itcd + lavratura + arquivamento + registro + certidoes + honorarios;
      return {
        base,
        imposto: itcd,
        impostoLabel: `ITCD (${(rate * 100).toFixed(1)}%)`,
        lavratura,
        arquivamento,
        registro,
        certidoes,
        honorarios,
        total,
      };
    }
    case "doacao_usufruto": {
      const atrib = input.valorAtribuido ?? 0;
      const fazenda = input.avaliacaoFazenda ?? 0;
      if (atrib + fazenda <= 0) return null;
      const baseD = Math.max(atrib, fazenda);
      const baseU = baseD / 3;
      const itcd = baseD * 0.05;
      const lavD = getNotaryFee(baseD);
      const lavU = getNotaryFee(baseU);
      const regD = lavD + REG_BASE;
      const regU = lavU + REG_RED;
      const total = itcd + lavD + lavU + arquivamento + regD + regU + certidoes + honorarios;
      return {
        base: [baseD, baseU],
        imposto: itcd,
        impostoLabel: "ITCD (5%)",
        lavratura: [lavD, lavU],
        arquivamento,
        registro: [regD, regU],
        certidoes,
        honorarios,
        total,
      };
    }
    case "renuncia_usufruto": {
      const atrib = input.valorAtribuido ?? 0;
      const fazenda = input.avaliacaoFazenda ?? 0;
      if (atrib + fazenda <= 0) return null;
      const base = Math.max(atrib, fazenda);
      const lavratura = getNotaryFee(base);
      const registro = RENUNCIA_USUFRUTO_REGISTRO;
      const total = lavratura + arquivamento + registro + certidoes + honorarios;
      return {
        base,
        imposto: 0,
        impostoLabel: "Isento",
        lavratura,
        arquivamento,
        registro,
        certidoes,
        honorarios,
        total,
      };
    }
  }
}

export const escrituraSum = sum;