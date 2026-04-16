import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  title: string;
}

export function Topbar({ title }: Props) {
  const { profile } = useAuth();
  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const initial = (profile?.name ?? "U").slice(0, 1).toUpperCase();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur-sm">
      <div className="flex flex-col">
        <h1 className="font-display text-2xl font-semibold leading-none">{title}</h1>
        <span className="mt-1 text-xs capitalize text-muted-foreground">{today}</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
          {initial}
        </div>
      </div>
    </header>
  );
}
