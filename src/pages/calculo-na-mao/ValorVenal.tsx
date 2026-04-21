import { AppLayout } from "@/components/AppLayout";
import { ValorVenalPage } from "@/components/calculo-na-mao/valor-venal/ValorVenalPage";

export default function ValorVenalRoute() {
  return (
    <AppLayout title="Valor Venal">
      <ValorVenalPage />
    </AppLayout>
  );
}