// Service module UI mappings, constants and helpers
import type { Database } from "@/integrations/supabase/types";

export type ServiceType = Database["public"]["Enums"]["service_type"];
export type ServiceStage = Database["public"]["Enums"]["service_stage"];

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  escritura: "Escritura",
  avulso: "Serviço Avulso",
  regularizacao: "Regularização",
};

export const SERVICE_TYPE_BADGE: Record<ServiceType, string> = {
  // Escritura: amarelo com texto preto
  escritura: "bg-accent text-accent-foreground",
  // Avulso: preto com texto amarelo
  avulso: "bg-primary text-primary-foreground",
  // Regularização: cinza escuro com texto branco
  regularizacao: "bg-neutral-700 text-white dark:bg-neutral-600",
};

export const STAGE_ORDER: ServiceStage[] = [
  "entrada",
  "documentacao",
  "analise",
  "execucao",
  "revisao",
  "concluido",
];

export const STAGE_LABEL: Record<ServiceStage, string> = {
  entrada: "Entrada",
  documentacao: "Documentação",
  analise: "Em Análise",
  execucao: "Em Execução",
  revisao: "Revisão",
  concluido: "Concluído",
};

// Tailwind utility classes for stage colored bar/badge — using design tokens
export const STAGE_BAR_CLASS: Record<ServiceStage, string> = {
  entrada: "bg-stage-entrada",
  documentacao: "bg-stage-documentacao",
  analise: "bg-stage-analise",
  execucao: "bg-stage-execucao",
  revisao: "bg-stage-revisao",
  concluido: "bg-stage-concluido",
};

export const STAGE_BADGE_CLASS: Record<ServiceStage, string> = {
  entrada: "bg-stage-entrada/15 text-foreground",
  documentacao: "bg-stage-documentacao/15 text-stage-documentacao",
  analise: "bg-stage-analise/15 text-stage-analise",
  execucao: "bg-stage-execucao/25 text-foreground",
  revisao: "bg-stage-revisao/15 text-stage-revisao",
  concluido: "bg-stage-concluido/15 text-stage-concluido",
};

// Etapa da tarefa (genérica para todos os tipos)
export const TASK_STEPS = [
  "Aguardando início",
  "Em andamento",
  "Aguardando cliente",
  "Aguardando cartório",
  "Aguardando banco",
  "Pausado",
  "Concluído",
] as const;

// Etapa do processo dinâmica por tipo
export const PROCESS_STEPS: Record<ServiceType, string[]> = {
  escritura: [
    "Coleta de documentos",
    "Análise de documentação",
    "Emissão de certidões",
    "Elaboração de minuta",
    "Agendamento de assinatura",
    "Lavratura da escritura",
    "Registro em cartório",
    "Entrega ao cliente",
  ],
  avulso: [
    "Recebimento da demanda",
    "Análise da solicitação",
    "Em execução",
    "Revisão final",
    "Entrega ao cliente",
  ],
  regularizacao: [
    "Levantamento inicial",
    "Análise documental",
    "Identificação de pendências",
    "Regularização em órgãos",
    "Averbação",
    "Entrega ao cliente",
  ],
};

export function dueDateColorClass(date?: string | null): string {
  if (!date) return "text-muted-foreground";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "text-destructive font-medium";
  if (diff <= 3) return "text-warning font-medium";
  return "text-foreground";
}
