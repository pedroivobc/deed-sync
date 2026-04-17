import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { ServiceCard, type ServiceCardData } from "./ServiceCard";
import { STAGE_BAR_CLASS, STAGE_LABEL, type ServiceStage } from "@/lib/serviceUi";

interface Props {
  stage: ServiceStage;
  services: ServiceCardData[];
  onOpen: (id: string) => void;
  /** When true, render cards via @tanstack/react-virtual (used when total cards > 50). */
  virtualize?: boolean;
}

const ESTIMATED_CARD_HEIGHT = 132;

export function KanbanColumn({ stage, services, onOpen, virtualize = false }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: services.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 6,
    enabled: virtualize,
  });

  // Compose refs: dnd-kit needs to know the droppable node, virtualizer needs the scroll node.
  const composedRef = (node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setNodeRef(node);
  };

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
        ref={composedRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors",
          virtualize && services.length > 0 && "max-h-[70vh]",
          isOver && "bg-accent/10",
        )}
      >
        {services.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            Arraste cards para cá
          </div>
        ) : virtualize ? (
          <div
            style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const s = services[vi.index];
              return (
                <div
                  key={s.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${vi.start}px)`,
                    paddingBottom: 8,
                  }}
                >
                  <ServiceCard service={s} onOpen={onOpen} />
                </div>
              );
            })}
          </div>
        ) : (
          services.map((s) => <ServiceCard key={s.id} service={s} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
}
