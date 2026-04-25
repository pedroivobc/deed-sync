import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type NotificationType = "critical" | "warning" | "info" | "success";
export type NotificationCategory = "tarefa" | "agenda" | "importante" | "sistema";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  description: string | null;
  link: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  read_at: string | null;
  dismissed_at: string | null;
  category: NotificationCategory | string;
  created_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as AppNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channelName = `notifications:${user.id}`;
    // Remove any pre-existing channel with the same name to avoid
    // "cannot add postgres_changes callbacks ... after subscribe()" errors
    // (happens in React StrictMode dev double-invoke or after HMR).
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
  };

  const dismiss = async (id: string) => {
    await supabase.from("notifications").update({ dismissed_at: new Date().toISOString() }).eq("id", id);
  };

  return { items, loading, unreadCount, markAsRead, markAllAsRead, dismiss, refresh: load };
}
