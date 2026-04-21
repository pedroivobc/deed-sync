/** Abre o WhatsApp web/app com a mensagem pré-formatada. */
export function shareToWhatsApp(message: string) {
  if (typeof window === "undefined") return;
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

const DISCLAIMER = "_Valores estimados. Sujeitos a alteração após análise documental._";

export function buildCorrecaoInccMessage(params: {
  valorCompra: string;
  anoContrato: number;
  valorCorrigido: string;
  variacao: string;
}) {
  return [
    "📈 *Correção Contratual INCC*",
    "",
    `Valor original: *${params.valorCompra}*`,
    `Ano do contrato: *${params.anoContrato}*`,
    `Valor corrigido: *${params.valorCorrigido}*`,
    `Variação: *${params.variacao}*`,
    "",
    DISCLAIMER,
  ].join("\n");
}