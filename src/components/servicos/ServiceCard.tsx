import { memo } from "react";
import { Calendar, Folder, MoreVertical, AlertTriangle, AlertCircle, CheckCircle2, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getInitials } from "@/lib/clientUi";
import {
  SERVICE_TYPE_BADGE,
  SERVICE_TYPE_LABEL,
  dueDateColorClass,
  type ServiceType,
} from "@/lib/serviceUi";
import type { ServiceAlerts } from "@/hooks/useServiceAlerts";

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
  alerts?: ServiceAlerts;
  selected?: boolean;
  hasSelection?: boolean;
  onToggleSelect?: (id: string, e?: React.MouseEvent) => void;
  onClickWithModifiers?: (e: React.MouseEvent, id: string) => boolean;
}

function ServiceCardImpl({
  service,
  onOpen,
  draggable = true,
  alerts,
  selected = false,
  hasSelection = false,
  onToggleSelect,
  onClickWithModifiers,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: service.id,
    disabled: !draggable || hasSelection,
    data: { service },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: 50 }
    : undefined;

  // Show alert badges only for escritura services (the only type with detailed docs)
  const showAlerts = service.type === "escritura" && alerts;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        // Let parent intercept shift/ctrl/meta to do range/toggle selection
        if (onClickWithModifiers && onClickWithModifiers(e, service.id)) return;
        // If there is an active selection, plain click toggles instead of opening
        if (hasSelection && onToggleSelect) {
          onToggleSelect(service.id, e);
          return;
        }
        onOpen(service.id);
      }}
      className={cn(
        "group cursor-pointer rounded-lg border border-border bg-card p-3 shadow-soft transition hover:shadow-card",
        isDragging && "opacity-60 shadow-card",
        selected && "ring-2 ring-primary border-primary/40"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <span
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(service.id, e);
              }}
              className={cn(
                "transition-opacity",
                hasSelection || selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <Checkbox checked={selected} aria-label="Selecionar serviço" />
            </span>
          )}
          <Badge className={cn("rounded-md text-[10px] font-semibold uppercase", SERVICE_TYPE_BADGE[service.type])}>
            {SERVICE_TYPE_LABEL[service.type]}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {showAlerts && (
            <TooltipProvider delayDuration={200}>
              {alerts.hasExpired && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                  </TooltipTrigger>
                  <TooltipContent side="top">Documento vencido</TooltipContent>
                </Tooltip>
              )}
              {!alerts.hasExpired && alerts.expiringSoon && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                  </TooltipTrigger>
                  <TooltipContent side="top">Documento vence em breve</TooltipContent>
                </Tooltip>
              )}
              {!alerts.hasExpired && !alerts.expiringSoon && alerts.complete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  </TooltipTrigger>
                  <TooltipContent side="top">Documentação completa</TooltipContent>
                </Tooltip>
              )}
              {!alerts.hasExpired && !alerts.expiringSoon && !alerts.complete && alerts.incomplete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent side="top">Documentação &lt; 50% completa</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          )}
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

export const ServiceCard = memo(ServiceCardImpl, (prev, next) => {
  return (
    prev.onOpen === next.onOpen &&
    prev.draggable === next.draggable &&
    prev.service.id === next.service.id &&
    prev.service.subject === next.service.subject &&
    prev.service.due_date === next.service.due_date &&
    prev.service.pasta_fisica === next.service.pasta_fisica &&
    prev.service.client_name === next.service.client_name &&
    prev.service.assigned_name === next.service.assigned_name &&
    prev.selected === next.selected &&
    prev.hasSelection === next.hasSelection &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.onClickWithModifiers === next.onClickWithModifiers &&
    prev.alerts?.hasExpired === next.alerts?.hasExpired &&
    prev.alerts?.expiringSoon === next.alerts?.expiringSoon &&
    prev.alerts?.complete === next.alerts?.complete &&
    prev.alerts?.incomplete === next.alerts?.incomplete
  );
});
