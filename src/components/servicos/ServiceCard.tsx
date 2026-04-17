import { Calendar, Folder, MoreVertical } from "lucide-react";
import { format } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/clientUi";
import {
  SERVICE_TYPE_BADGE,
  SERVICE_TYPE_LABEL,
  dueDateColorClass,
  type ServiceType,
} from "@/lib/serviceUi";

export interface ServiceCardData {
  id: string;
  type: ServiceType;
  subject: string;
  client_name: string | null;
  created_at: string;
  due_date: string | null;
  pasta_fisica: boolean;
  assigned_name: string | null;
}

interface Props {
  service: ServiceCardData;
  onOpen: (id: string) => void;
  draggable?: boolean;
}

export function ServiceCard({ service, onOpen, draggable = true }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: service.id,
    disabled: !draggable,
    data: { service },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Avoid opening when ending a drag
        if (isDragging) return;
        onOpen(service.id);
      }}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-soft transition hover:shadow-card",
        isDragging && "opacity-60 shadow-card"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge className={cn("rounded-md text-[10px] font-semibold uppercase", SERVICE_TYPE_BADGE[service.type])}>
          {SERVICE_TYPE_LABEL[service.type]}
        </Badge>
        <button
          type="button"
          className="rounded p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-muted"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpen(service.id);
          }}
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </div>

      <h4 className="mb-1 line-clamp-2 text-sm font-medium leading-snug">
        {service.subject}
      </h4>
      {service.client_name && (
        <p className="mb-3 truncate text-xs text-muted-foreground">{service.client_name}</p>
      )}

      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(service.created_at), "dd/MM/yyyy")}</span>
        </div>
        <div className="flex items-center gap-2">
          {service.due_date && (
            <span className={cn("text-[11px]", dueDateColorClass(service.due_date))}>
              {format(new Date(service.due_date), "dd/MM")}
            </span>
          )}
          {service.pasta_fisica && (
            <Folder className="h-3 w-3 text-accent" aria-label="Pasta física" />
          )}
          {service.assigned_name && (
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground"
              title={service.assigned_name}
            >
              {getInitials(service.assigned_name)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
