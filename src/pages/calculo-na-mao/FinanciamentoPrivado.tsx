import { AppLayout } from "@/components/AppLayout";
import { FinanciamentoPage } from "@/components/calculo-na-mao/financiamentos/FinanciamentoPage";
export default function FinanciamentoPrivadoRoute() {
  return <AppLayout title="Financiamento Privado"><FinanciamentoPage variant="privado" /></AppLayout>;
}