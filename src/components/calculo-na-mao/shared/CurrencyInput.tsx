import { forwardRef } from "react";
import { NumericFormat, type NumericFormatProps } from "react-number-format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<NumericFormatProps, "value" | "onValueChange" | "customInput"> {
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  className?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
}

/** Input com máscara BRL (R$ 1.234,56). Emite number via onValueChange. */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, className, ...props }, ref) => {
    return (
      <NumericFormat
        getInputRef={ref}
        customInput={Input}
        className={cn(className)}
        value={value ?? ""}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale
        allowNegative={false}
        prefix="R$ "
        onValueChange={(v) => onValueChange(v.floatValue ?? 0)}
        {...props}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";