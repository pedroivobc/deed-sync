import { Briefcase, FileText, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceType } from "@/lib/serviceUi";

interface Props {
  onSelect: (type: ServiceType) => void;
}

const OPTIONS: {
  type: ServiceType;
  title: string;
  description: string;
  Icon: typeof FileText;
  accent: string;
}[] = [
  {
    type: "escritura",
    title: "Escritura",
    description:
      "Processo completo de escritura pública: coleta de documentos, certidões, ITBI, lavratura e registro.",
    Icon: FileText,
    accent: "bg-accent/15 text-accent-foreground border-accent",
  },
  {
    type: "avulso",
    title: "Serviço Avulso",
    description:
      "Serviços sob demanda: emissão de certidões específicas, consultas e pequenos processos.",
    Icon: Briefcase,
    accent: "bg-primary/10 text-foreground border-primary",
  },
  {
    type: "regularizacao",
    title: "Regularização de Imóveis",
    description:
      "Regularização junto a órgãos, averbações e adequação documental do imóvel.",
    Icon: Home,
    accent: "bg-muted text-foreground border-neutral-500 dark:border-neutral-400",
  },
];

export function NewServiceTypeStep({ onSelect }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {OPTIONS.map(({ type, title, description, Icon, accent }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelect(type)}
          className={cn(
            "group flex flex-col items-start gap-3 rounded-2xl border-2 bg-card p-6 text-left transition-all hover:-translate-y-1 hover:shadow-card",
            "border-border"
          )}
        >
          <div
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-xl border-2 transition group-hover:scale-105",
              accent
            )}
          >
            <Icon className="h-7 w-7" />
          </div>
          <h3 className="font-display text-2xl">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </button>
      ))}
    </div>
  );
}
