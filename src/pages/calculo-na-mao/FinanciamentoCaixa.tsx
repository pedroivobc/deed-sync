import { AppLayout } from "@/components/AppLayout";
import { FinanciamentoPage } from "@/components/calculo-na-mao/financiamentos/FinanciamentoPage";
export default function FinanciamentoCaixaRoute() {
  return <AppLayout title="Financiamento Caixa"><FinanciamentoPage variant="caixa" /></AppLayout>;
}