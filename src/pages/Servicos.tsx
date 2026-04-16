import { AppLayout } from "@/components/AppLayout";
import { Card } from "@/components/ui/card";

export default function Servicos() {
  return (
    <AppLayout title="Serviços">
      <Card className="flex h-64 items-center justify-center rounded-2xl border-dashed text-muted-foreground">
        Em construção
      </Card>
    </AppLayout>
  );
}
