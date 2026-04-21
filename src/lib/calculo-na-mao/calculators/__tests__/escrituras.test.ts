import { describe, it, expect } from "vitest";
import { calcularEscritura } from "../escrituras";
import { getNotaryFee } from "../../notaryFees";
import {
  PRECO_FOLHA,
  ESCRITURA_REGISTRO_BASE,
  ESCRITURA_REGISTRO_REDUZIDO,
  RENUNCIA_USUFRUTO_REGISTRO,
} from "../../constants";

describe("calcularEscritura", () => {
  it("retorna null quando todas as bases são zero", () => {
    expect(
      calcularEscritura({
        subtipo: "compra_venda_simples",
        valorDeclarado: 0,
        valorVenalCorrigido: 0,
        folhas: 0,
        certidoes: 0,
        honorarios: 0,
      }),
    ).toBeNull();
  });

  it("compra e venda simples: ITBI 2%, base = max(declarado, venal)", () => {
    const r = calcularEscritura({
      subtipo: "compra_venda_simples",
      valorDeclarado: 300_000,
      valorVenalCorrigido: 250_000,
      folhas: 10,
      certidoes: 400,
      honorarios: 700,
    });
    expect(r).not.toBeNull();
    expect(r!.base).toBe(300_000);
    expect(r!.imposto).toBe(6_000);
    const lav = getNotaryFee(300_000);
    expect(r!.lavratura).toBe(lav);
    expect(r!.registro).toBe(lav + ESCRITURA_REGISTRO_BASE);
    expect(r!.arquivamento).toBe(10 * PRECO_FOLHA);
    expect(r!.total).toBeCloseTo(
      6_000 + lav + (lav + ESCRITURA_REGISTRO_BASE) + 10 * PRECO_FOLHA + 400 + 700,
      2,
    );
  });

  it("renúncia de usufruto: isento de imposto, registro fixo", () => {
    const r = calcularEscritura({
      subtipo: "renuncia_usufruto",
      valorAtribuido: 200_000,
      avaliacaoFazenda: 180_000,
      folhas: 5,
      certidoes: 0,
      honorarios: 0,
    });
    expect(r).not.toBeNull();
    expect(r!.imposto).toBe(0);
    expect(r!.impostoLabel).toBe("Isento");
    expect(r!.registro).toBe(RENUNCIA_USUFRUTO_REGISTRO);
    expect(r!.base).toBe(200_000);
  });

  it("doação c/ usufruto: ITCD 5% sobre baseD, baseU = baseD/3", () => {
    const r = calcularEscritura({
      subtipo: "doacao_usufruto",
      valorAtribuido: 600_000,
      avaliacaoFazenda: 500_000,
      folhas: 0,
      certidoes: 0,
      honorarios: 0,
    });
    expect(r).not.toBeNull();
    expect(Array.isArray(r!.base)).toBe(true);
    const [baseD, baseU] = r!.base as number[];
    expect(baseD).toBe(600_000);
    expect(baseU).toBeCloseTo(200_000, 2);
    expect(r!.imposto).toBe(30_000);
    const [, regU] = r!.registro as number[];
    expect(regU).toBe(getNotaryFee(baseU) + ESCRITURA_REGISTRO_REDUZIDO);
  });
});