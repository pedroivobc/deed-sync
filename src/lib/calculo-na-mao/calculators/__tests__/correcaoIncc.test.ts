import { describe, expect, it } from "vitest";
import { calcularCorrecaoIncc } from "../correcaoIncc";

describe("calcularCorrecaoIncc", () => {
  it("retorna null quando valor é zero", () => {
    expect(calcularCorrecaoIncc({ valorCompra: 0, anoContrato: 2020 })).toBeNull();
  });

  it("retorna null quando valor é negativo", () => {
    expect(calcularCorrecaoIncc({ valorCompra: -100, anoContrato: 2020 })).toBeNull();
  });

  it("não corrige quando ano = ano base", () => {
    const r = calcularCorrecaoIncc({ valorCompra: 500_000, anoContrato: 2026 })!;
    expect(r.valorCorrigido).toBe(500_000);
    expect(r.diferenca).toBe(0);
    expect(r.variacaoPercentual).toBe(0);
  });

  it("aplica fator INCC corretamente para 2020 (índice 117.72) → 2026 (índice 165.54)", () => {
    const r = calcularCorrecaoIncc({ valorCompra: 100_000, anoContrato: 2020 })!;
    const esperado = (100_000 / 117.72) * 165.54;
    expect(r.valorCorrigido).toBeCloseTo(esperado, 2);
    expect(r.variacaoPercentual).toBeGreaterThan(0);
  });

  it("retorna null para ano não existente no índice", () => {
    expect(calcularCorrecaoIncc({ valorCompra: 100_000, anoContrato: 1990 })).toBeNull();
  });
});