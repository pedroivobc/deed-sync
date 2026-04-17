import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, type AppNotification, type NotificationType } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const typeIcon: Record<NotificationType, typeof Bell> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};

const typeColor: Record<NotificationType, string> = {
  critical: "text-destructive",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

export function NotificationsBell() {
  const { items, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleClick = async (n: AppNotification) => {
    if (!n.read_at) await markAsRead(n.id);
    if (n.link) {
      navigate(n.link);
      setOpen(false);
    }
  };

  const badgeText = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificações${unreadCount ? ` (${unreadCount} não lidas)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {badgeText}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">Notificações</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <Bell className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-medium">Você está em dia!</p>
              <p className="mt-1 text-xs text-muted-foreground">Nenhuma notificação no momento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = typeIcon[n.type];
                const unread = !n.read_at;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted",
                        unread && "bg-accent/10"
                      )}
                    >
                      {unread && (
                        <span
                          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent"
                          aria-label="Não lida"
                        />
                      )}
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", typeColor[n.type])} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        {n.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {n.description}
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t border-border px-4 py-2">
          <button
            onClick={() => {
              navigate("/notificacoes");
              setOpen(false);
            }}
            className="w-full text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver todas as notificações
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
