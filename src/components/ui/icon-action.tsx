import { ComponentProps, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface IconActionProps extends ComponentProps<typeof Button> {
  /** Texto do tooltip (também vira aria-label). */
  label: string;
}

/**
 * Botão somente-ícone com tooltip obrigatório.
 * Use em todas as ações em tabelas (editar, excluir, ver, duplicar...).
 */
export const IconAction = forwardRef<HTMLButtonElement, IconActionProps>(
  ({ label, children, ...rest }, ref) => {
    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              variant="ghost"
              size="icon"
              aria-label={label}
              {...rest}
            >
              {children}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);
IconAction.displayName = "IconAction";
