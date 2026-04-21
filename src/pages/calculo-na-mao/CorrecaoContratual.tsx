import { AppLayout } from "@/components/AppLayout";
import { CorrecaoContratualPage } from "@/components/calculo-na-mao/correcao-contratual/CorrecaoContratualPage";

export default function CorrecaoContratualRoute() {
  return (
    <AppLayout title="Correção Contratual">
      <CorrecaoContratualPage />
    </AppLayout>
  );
}