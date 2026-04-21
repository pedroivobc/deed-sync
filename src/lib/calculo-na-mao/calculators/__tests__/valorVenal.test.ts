import { describe, it, expect } from "vitest";
import { calcularValorVenal } from "../valorVenal";

describe("calcularValorVenal", () => {
  it("calcula caso típico de apartamento", () => {
    const r = calcularValorVenal({
      vvTerrenoIPTU: 50_000, vM2TerrenoIPTU: 500,        // 100 m²
      vvEdificacaoIPTU: 80_000, vM2EdificacaoIPTU: 800,  // 100 m²
      valorM2TerrenoPJF: 1000,
      valorM2EdificacaoPJF: 1500,
      fatorComercializacao: 1.0,
    })!;
    expect(r.areaTerrenoM2).toBe(100);
    expect(r.areaEdificacaoM2).toBe(100);
    expect(r.valorTerrenoCorrigido).toBe(100_000);
    expect(r.valorEdificacaoCorrigida).toBe(150_000);
    expect(r.valorVenalTotal).toBe(250_000);
  });

  it("aplica fator de comercialização", () => {
    const r = calcularValorVenal({
      vvTerrenoIPTU: 10_000, vM2TerrenoIPTU: 100,
      vvEdificacaoIPTU: 20_000, vM2EdificacaoIPTU: 200,
      valorM2TerrenoPJF: 200,
      valorM2EdificacaoPJF: 400,
      fatorComercializacao: 1.5,
    })!;
    // areas = 100, valores corrigidos = 20.000 + 40.000, * 1.5 = 90.000
    expect(r.valorVenalTotal).toBe(90_000);
  });

  it("retorna null quando m² do IPTU é zero", () => {
    expect(
      calcularValorVenal({
        vvTerrenoIPTU: 100, vM2TerrenoIPTU: 0,
        vvEdificacaoIPTU: 100, vM2EdificacaoIPTU: 100,
        valorM2TerrenoPJF: 1, valorM2EdificacaoPJF: 1, fatorComercializacao: 1,
      }),
    ).toBeNull();
  });
});