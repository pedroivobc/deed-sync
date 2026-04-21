import { type ComponentType } from "react";

interface CalculationHeaderProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
}

export function CalculationHeader({ icon: Icon, title, description }: CalculationHeaderProps) {
  return (
    <header className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
    </header>
  );
}