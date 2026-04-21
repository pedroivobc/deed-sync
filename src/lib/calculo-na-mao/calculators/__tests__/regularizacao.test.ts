import { describe, it, expect } from "vitest";
import { calcularRegularizacao } from "../regularizacao";
import { getNotaryFee } from "../../notaryFees";
import { PRECO_FOLHA, ESCRITURA_REGISTRO_REDUZIDO } from "../../constants";

describe("calcularRegularizacao", () => {
  it("retorna null se base for zero", () => {
    expect(
      calcularRegularizacao({
        valorVenalCorrigido: 0,
        folhas: 10,
        certidoes: 0,
        honorarios: 0,
      }),
    ).toBeNull();
  });

  it("calcula averbação + arquivamento + registro reduzido", () => {
    const base = 250_000;
    const r = calcularRegularizacao({
      valorVenalCorrigido: base,
      folhas: 10,
      certidoes: 400,
      honorarios: 700,
    });
    expect(r).not.toBeNull();
    const fee = getNotaryFee(base);
    expect(r!.averbacao).toBe(fee);
    expect(r!.arquivamento).toBeCloseTo(10 * PRECO_FOLHA, 2);
    expect(r!.registro).toBe(fee + ESCRITURA_REGISTRO_REDUZIDO);
    expect(r!.total).toBeCloseTo(
      fee + 10 * PRECO_FOLHA + (fee + ESCRITURA_REGISTRO_REDUZIDO) + 400 + 700,
      2,
    );
  });

  it("trata folhas/certidões/honorários negativos como zero", () => {
    const r = calcularRegularizacao({
      valorVenalCorrigido: 100_000,
      folhas: -5,
      certidoes: -100,
      honorarios: -200,
    });
    expect(r).not.toBeNull();
    expect(r!.arquivamento).toBe(0);
    expect(r!.certidoes).toBe(0);
    expect(r!.honorarios).toBe(0);
  });
});