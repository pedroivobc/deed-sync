import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceType } from "@/lib/serviceUi";

export type StageCategory = "active" | "done" | "closed";

export interface ServiceStageRow {
  id: string;
  tipo_servico: ServiceType;
  name: string;
  description: string | null;
  color: string;
  category: StageCategory;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetches dynamic service stages for a given service type, ordered by display_order.
 * Subscribes to realtime changes so admin edits propagate instantly.
 */
export function useServiceStages(tipo: ServiceType | null, includeInactive = false) {
  const [stages, setStages] = useState<ServiceStageRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!tipo) {
      setStages([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from("service_stages" as never)
        .select("*")
        .eq("tipo_servico", tipo)
        .order("display_order", { ascending: true });
      if (!includeInactive) q = q.eq("is_active", true);
      const { data, error } = await q;
      if (cancelled) return;
      if (!error) setStages((data ?? []) as unknown as ServiceStageRow[]);
      setLoading(false);
    };
    void load();

    const channel = supabase
      .channel(`service_stages_${tipo}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_stages" },
        () => void load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [tipo, includeInactive]);

  const grouped = useMemo(() => {
    const g: Record<StageCategory, ServiceStageRow[]> = { active: [], done: [], closed: [] };
    for (const s of stages) g[s.category].push(s);
    return g;
  }, [stages]);

  const byId = useMemo(() => {
    const m = new Map<string, ServiceStageRow>();
    for (const s of stages) m.set(s.id, s);
    return m;
  }, [stages]);

  return { stages, grouped, byId, loading };
}

export const STAGE_CATEGORY_LABEL: Record<StageCategory, string> = {
  active: "Ativas",
  done: "Concluídas",
  closed: "Encerradas",
};