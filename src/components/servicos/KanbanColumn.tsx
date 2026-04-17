import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { ServiceCard, type ServiceCardData } from "./ServiceCard";
import { STAGE_BAR_CLASS, STAGE_LABEL, type ServiceStage } from "@/lib/serviceUi";

interface Props {
  stage: ServiceStage;
  services: ServiceCardData[];
  onOpen: (id: string) => void;
}

export function KanbanColumn({ stage, services, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex w-[320px] flex-shrink-0 flex-col rounded-xl border border-border bg-muted/30">
      <div className="rounded-t-xl bg-card">
        <div className={cn("h-1 rounded-t-xl", STAGE_BAR_CLASS[stage])} />
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide">
            {STAGE_LABEL[stage]}
          </h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {services.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-accent/10"
        )}
      >
        {services.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            Arraste cards para cá
          </div>
        ) : (
          services.map((s) => <ServiceCard key={s.id} service={s} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}
