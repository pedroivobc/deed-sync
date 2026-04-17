import { Card } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

const ITEMS = [
  "DRE gerencial mensal estruturado: separar receita operacional, custo direto (certidões, emolumentos), despesas fixas e variáveis",
  "Fluxo de caixa projetado D+60 e D+90: baseado em serviços em andamento e prazos esperados de recebimento",
  "CAC (Custo de Aquisição de Cliente): gastos com marketing e comissões de indicação ÷ novos clientes no período",
  "Inadimplência por faixa etária: segmentar em 0-30, 31-60, 61-90, 90+ dias",
  "Custo e margem de contribuição por tipo de serviço: quanto Escritura vs Avulso vs Regularização lucra líquido",
  "Ponto de equilíbrio mensal: quantos serviços ou receita são necessários para cobrir custos fixos",
  "Participação de receita recorrente: % de faturamento vindo de clientes que retornam",
  "Giro de capital de giro: tempo médio entre pagar fornecedores e receber do cliente",
  "ROI por canal de aquisição: retorno por cada origem (Indicação, Corretor, Imobiliária, etc.)",
];

export function BpoRecommendations() {
  return (
    <Card className="rounded-2xl border-accent/40 bg-accent/10 p-5">
      <div className="mb-2 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-foreground" />
        <h3 className="font-display text-lg font-semibold">Indicadores BPO recomendados para próxima iteração</h3>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Pedro, como consultor de BPO sênior, recomendo implementar em próximas fases:
      </p>
      <ul className="space-y-1.5 text-sm">
        {ITEMS.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
