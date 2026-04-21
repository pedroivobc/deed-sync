import { FileDown, Share2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

interface ExportButtonsProps {
  onExportPdf: () => void;
  onShareWhatsApp: () => void;
  disabled?: boolean;
}

/**
 * Botões de exportação. Colaboradores não podem exportar PDF nem
 * compartilhar via WhatsApp — apenas Administrador e Gerente.
 */
export function ExportButtons({ onExportPdf, onShareWhatsApp, disabled }: ExportButtonsProps) {
  const { isManager } = useAuth(); // true para administrador OU gerente
  const allowed = isManager;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={onExportPdf}
                disabled={disabled || !allowed}
                className="gap-2"
              >
                {allowed ? <FileDown className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                Exportar PDF
              </Button>
            </span>
          </TooltipTrigger>
          {!allowed && (
            <TooltipContent>
              Apenas Administrador e Gerente podem exportar PDF.
            </TooltipContent>
          )}
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onShareWhatsApp}
                disabled={disabled || !allowed}
                className="gap-2"
              >
                {allowed ? <Share2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                WhatsApp
              </Button>
            </span>
          </TooltipTrigger>
          {!allowed && (
            <TooltipContent>
              Apenas Administrador e Gerente podem compartilhar via WhatsApp.
            </TooltipContent>
          )}
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}