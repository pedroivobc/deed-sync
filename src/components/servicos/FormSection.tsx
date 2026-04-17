import { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  id?: string;
}

export function FormSection({ title, children, id }: Props) {
  return (
    <section id={id} className="rounded-xl border border-border bg-card/50 p-4">
      <h4 className="mb-4 text-xs font-bold uppercase tracking-wider text-accent">
        {title}
      </h4>
      {children}
    </section>
  );
}

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
      {children} {required && <span className="text-destructive">*</span>}
    </label>
  );
}
