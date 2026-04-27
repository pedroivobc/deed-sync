import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import { ServiceCard, type ServiceCardData } from "./ServiceCard";
import type { ServiceAlerts } from "@/hooks/useServiceAlerts";
import type { ServiceStageRow } from "@/hooks/useServiceStages";

interface Props {
  stage: ServiceStageRow;
  /** Sentinel id used as the droppable id; we prefix it to avoid colliding with enum-based ids. */
  droppableId: string;
  services: ServiceCardData[];
  onOpen: (id: string) => void;
  virtualize?: boolean;
  alertsMap?: Record<string, ServiceAlerts>;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string, e?: React.MouseEvent) => void;
  onClickWithModifiers?: (e: React.MouseEvent, id: string) => boolean;
}

const ESTIMATED_CARD_HEIGHT = 132;

/**
 * Kanban column rendered from a dynamic stage row (color from DB).
 */
export function DynamicKanbanColumn({
  stage, droppableId, services, onOpen, virtualize = false, alertsMap,
  selectedIds, onToggleSelect, onClickWithModifiers,
}: Props) {
  const hasSelection = (selectedIds?.size ?? 0) > 0;
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: services.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_CARD_HEIGHT,
    overscan: 6,
    enabled: virtualize,
  });

  const composedRef = (node: HTMLDivElement | null) => {
    scrollRef.current = node;
    setNodeRef(node);
  };

  return (
    <div className="flex w-[320px] flex-shrink-0 flex-col rounded-xl border border-border bg-muted/30">
      <div className="rounded-t-xl bg-card">
        <div className="h-1 rounded-t-xl" style={{ backgroundColor: stage.color }} />
        <div className="flex items-center justify-between px-3 py-2.5">
          <h3 className="font-display text-sm font-semibold uppercase tracking-wide" title={stage.description ?? undefined}>
            {stage.name}
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
          <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
            {virtualizer.getVirtualItems().map((vi) => {
              const s = services[vi.index];
              return (
                <div
                  key={s.id}
                  style={{
                    position: "absolute", top: 0, left: 0, right: 0,
                    transform: `translateY(${vi.start}px)`, paddingBottom: 8,
                  }}
                >
                  <ServiceCard
                    service={s}
                    onOpen={onOpen}
                    alerts={alertsMap?.[s.id]}
                    selected={selectedIds?.has(s.id) ?? false}
                    hasSelection={hasSelection}
                    onToggleSelect={onToggleSelect}
                    onClickWithModifiers={onClickWithModifiers}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          services.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              onOpen={onOpen}
              alerts={alertsMap?.[s.id]}
              selected={selectedIds?.has(s.id) ?? false}
              hasSelection={hasSelection}
              onToggleSelect={onToggleSelect}
              onClickWithModifiers={onClickWithModifiers}
            />
          ))
        )}
      </div>
    </div>
  );
}