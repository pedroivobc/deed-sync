import { NumericFormat } from "react-number-format";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  value: number | null | undefined;
  onChange: (n: number | null) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

export function MoneyInput({ value, onChange, placeholder = "R$ 0,00", className, id }: Props) {
  return (
    <NumericFormat
      id={id}
      customInput={Input}
      value={value ?? ""}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={2}
      fixedDecimalScale
      prefix="R$ "
      allowNegative={false}
      placeholder={placeholder}
      className={cn(className)}
      onValueChange={(values) => {
        onChange(values.floatValue ?? null);
      }}
    />
  );
}
