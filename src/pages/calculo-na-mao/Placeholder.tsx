import { AppLayout } from "@/components/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CalculationHeader } from "@/components/calculo-na-mao/shared/CalculationHeader";
import type { ComponentType } from "react";

interface PlaceholderProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export function CalcPlaceholder({ icon, title, description }: PlaceholderProps) {
  return (
    <AppLayout title={title}>
      <div className="space-y-6">
        <CalculationHeader icon={icon} title={title} description={description} />
        <Alert>
          <AlertTitle>Em desenvolvimento</AlertTitle>
          <AlertDescription>
            Esta calculadora será habilitada em uma próxima fase do módulo Cálculo na Mão.
          </AlertDescription>
        </Alert>
      </div>
    </AppLayout>
  );
}