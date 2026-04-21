import { Import } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUltimoValorVenal } from "@/hooks/calculo-na-mao/useUltimoValorVenal";
import { toast } from "sonner";

interface Props {
  onImport: (valor: number) => void;
}

/** Importa o último cálculo de Valor Venal salvo (RLS aplica). */
export function ImportValorVenalButton({ onImport }: Props) {
  const { data, isLoading } = useUltimoValorVenal();

  const handle = () => {
    if (!data?.valor_total) {
      toast.info("Nenhum cálculo de Valor Venal encontrado.", {
        description: "Rode o cálculo no módulo Valor Venal antes de importar.",
      });
      return;
    }
    onImport(Number(data.valor_total));
    toast.success("Valor venal importado.");
  };

  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      className="h-auto px-0 py-0 text-xs text-accent"
      onClick={handle}
      disabled={isLoading}
    >
      <Import className="mr-1 h-3 w-3" />
      Importar Valor Venal
    </Button>
  );
}