import { describe, it, expect } from "vitest";
import {
  calcularItbiSfh,
  calcularFinanciamentoCaixa,
  calcularFinanciamentoPrivado,
  LIMIAR_ITBI_SFH,
  ITBI_FIXO_LIMIAR,
} from "../financiamentos";

describe("calcularItbiSfh", () => {
  it("financiado abaixo do limiar: 2% sobre (base-financiado) + 0,5% sobre financiado", () => {
    const base = 300_000;
    const fin = 100_000;
    const itbi = calcularItbiSfh(base, fin);
    expect(itbi).toBeCloseTo((base - fin) * 0.02 + fin * 0.005, 2);
  });

  it("financiado acima do limiar: usa fórmula com ITBI fixo", () => {
    const base = 400_000;
    const fin = LIMIAR_ITBI_SFH + 50_000;
    const itbi = calcularItbiSfh(base, fin);
    expect(itbi).toBeCloseTo((base - LIMIAR_ITBI_SFH) * 0.02 + ITBI_FIXO_LIMIAR, 2);
  });

  it("base zero retorna 0", () => {
    expect(calcularItbiSfh(0, 100_000)).toBe(0);
  });
});

describe("calcularFinanciamento", () => {
  it("retorna null quando declarado e venal são zero", () => {
    expect(
      calcularFinanciamentoCaixa({
        valorDeclarado: 0,
        valorVenalCorrigido: 0,
        valorFinanciado: 100_000,
        folhas: 0,
        certidoes: 0,
        honorarios: 0,
      }),
    ).toBeNull();
  });

  it("Privado: ITBI cheio de 2% sobre a base", () => {
    const r = calcularFinanciamentoPrivado({
      valorDeclarado: 500_000,
      valorVenalCorrigido: 400_000,
      valorFinanciado: 200_000,
      folhas: 0,
      certidoes: 0,
      honorarios: 0,
    });
    expect(r).not.toBeNull();
    expect(r!.base).toBe(500_000);
    expect(r!.itbi).toBeCloseTo(10_000, 2);
    expect(r!.itbiLabel).toBe("ITBI (2%)");
  });

  it("Caixa SFH: ITBI segue regra de limiar", () => {
    const r = calcularFinanciamentoCaixa({
      valorDeclarado: 300_000,
      valorVenalCorrigido: 280_000,
      valorFinanciado: 100_000,
      folhas: 5,
      certidoes: 400,
      honorarios: 700,
    });
    expect(r).not.toBeNull();
    expect(r!.base).toBe(300_000);
    expect(r!.itbi).toBeCloseTo(calcularItbiSfh(300_000, 100_000), 2);
    expect(r!.itbiLabel).toContain("SFH");
  });
});