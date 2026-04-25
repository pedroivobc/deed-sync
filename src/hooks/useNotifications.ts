import { useEffect, useState, useCallback, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
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
  // Holds the single active realtime channel for the current user.
  // Using a ref guarantees that StrictMode double-invokes / re-renders
  // never create more than one channel instance.
  const channelRef = useRef<RealtimeChannel | null>(null);
  const channelUserIdRef = useRef<string | null>(null);
  const loadRef = useRef<() => void>(() => {});

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

  // Keep latest `load` accessible inside the realtime callback without
  // re-subscribing the channel every time `load` changes.
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  // Realtime subscription — exactly one channel per user, created once.
  useEffect(() => {
    if (!user) return;

    // If a channel already exists for this exact user, do nothing.
    if (channelRef.current && channelUserIdRef.current === user.id) {
      return;
    }

    // If a channel exists for a different user, tear it down first.
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      channelUserIdRef.current = null;
    }

    // CRITICAL: .on() MUST be chained before .subscribe() in a single
    // expression. Calling .on() on an already-subscribed channel throws
    // "cannot add postgres_changes callbacks after subscribe()".
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => loadRef.current?.()
      )
      .subscribe();

    channelRef.current = channel;
    channelUserIdRef.current = user.id;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        channelUserIdRef.current = null;
      }
    };
  }, [user]);

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
