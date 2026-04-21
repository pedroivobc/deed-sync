import { describe, it, expect } from "vitest";
import { calcularDoacao } from "../doacao";
import { getNotaryFee } from "../../notaryFees";
import {
  DOACAO_REGISTRO_BASE,
  LIMITE_ITCD_25,
  RENUNCIA_USUFRUTO_REGISTRO,
} from "../../constants";

describe("calcularDoacao", () => {
  it("retorna null se as duas bases forem zero", () => {
    expect(
      calcularDoacao({
        subtipo: "doacao_simples",
        valorAtribuido: 0,
        avaliacaoFazenda: 0,
        folhas: 0,
        certidoes: 0,
        honorarios: 0,
      }),
    ).toBeNull();
  });

  it("doação simples abaixo do limite: ITCD 2,5%", () => {
    const base = LIMITE_ITCD_25 - 1_000;
    const r = calcularDoacao({
      subtipo: "doacao_simples",
      valorAtribuido: base,
      avaliacaoFazenda: 0,
      folhas: 0,
      certidoes: 0,
      honorarios: 0,
    });
    expect(r).not.toBeNull();
    expect(r!.itcd).toBeCloseTo(base * 0.025, 2);
    expect(r!.itcdLabel).toContain("2.5");
    expect(r!.registro).toBe(getNotaryFee(base) + DOACAO_REGISTRO_BASE);
  });

  it("doação simples acima do limite: ITCD 5%", () => {
    const base = LIMITE_ITCD_25 + 100_000;
    const r = calcularDoacao({
      subtipo: "doacao_simples",
      valorAtribuido: base,
      avaliacaoFazenda: 0,
      folhas: 0,
      certidoes: 0,
      honorarios: 0,
    });
    expect(r).not.toBeNull();
    expect(r!.itcd).toBeCloseTo(base * 0.05, 2);
    expect(r!.itcdLabel).toContain("5.0");
  });

  it("renúncia de usufruto: isento, registro fixo", () => {
    const r = calcularDoacao({
      subtipo: "renuncia_usufruto",
      valorAtribuido: 300_000,
      avaliacaoFazenda: 0,
      folhas: 0,
      certidoes: 0,
      honorarios: 0,
    });
    expect(r).not.toBeNull();
    expect(r!.itcd).toBe(0);
    expect(r!.itcdLabel).toBe("Isento");
    expect(r!.registro).toBe(RENUNCIA_USUFRUTO_REGISTRO);
  });
});