import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AgendaSource = "manual" | "auto";
export type AgendaEventType =
  | "vencimento_certidao"
  | "assinatura_prevista"
  | "assinatura_realizada"
  | "atendimento_cliente"
  | "prazo_servico"
  | "reuniao"
  | "outro";

export interface AgendaEvent {
  id: string;
  title: string;
  description?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day: boolean;
  event_type: AgendaEventType;
  source: AgendaSource;
  service_id?: string | null;
  client_id?: string | null;
  owner_id?: string | null;
  color?: string | null;
  location?: string | null;
}

export interface UseAgendaOptions {
  /** ISO date (yyyy-mm-dd) start of visible window */
  fromIso: string;
  /** ISO date (yyyy-mm-dd) end of visible window (exclusive) */
  toIso: string;
  /** When true, include only events owned/assigned to current user */
  onlyMine?: boolean;
}

/**
 * Aggregates manual `calendar_events` with auto-derived items:
 * - service due_date → prazo_servico
 * - civil/internet certificate expiration → vencimento_certidao
 */
export function useAgendaEvents(opts: UseAgendaOptions) {
  const { user } = useAuth();
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);

      const fromTs = `${opts.fromIso}T00:00:00.000Z`;
      const toTs = `${opts.toIso}T00:00:00.000Z`;

      let manualQ = supabase
        .from("calendar_events")
        .select("*")
        .gte("start_at", fromTs)
        .lt("start_at", toTs)
        .order("start_at", { ascending: true });

      if (opts.onlyMine && user) {
        manualQ = manualQ.or(`owner_id.eq.${user.id},created_by.eq.${user.id}`);
      }

      const [manualRes, servicesRes, civilRes, inetRes] = await Promise.all([
        manualQ,
        supabase
          .from("services")
          .select("id, subject, due_date, assigned_to, created_by, client_id, stage")
          .gte("due_date", opts.fromIso)
          .lt("due_date", opts.toIso)
          .neq("stage", "concluido"),
        supabase
          .from("service_civil_certificates")
          .select("id, service_id, certificate_type, expiration_date, status")
          .gte("expiration_date", opts.fromIso)
          .lt("expiration_date", opts.toIso)
          .eq("status", "emitida"),
        supabase
          .from("service_internet_certificates")
          .select("id, service_id, certificate_type, expected_validity_date, status")
          .gte("expected_validity_date", opts.fromIso)
          .lt("expected_validity_date", opts.toIso)
          .eq("status", "emitida"),
      ]);

      if (cancelled) return;

      const list: AgendaEvent[] = [];

      for (const e of manualRes.data ?? []) {
        list.push({
          id: e.id,
          title: e.title,
          description: e.description,
          start_at: e.start_at,
          end_at: e.end_at,
          all_day: e.all_day,
          event_type: e.event_type as AgendaEventType,
          source: "manual",
          service_id: e.service_id,
          client_id: e.client_id,
          owner_id: e.owner_id,
          color: e.color,
          location: e.location,
        });
      }

      for (const s of servicesRes.data ?? []) {
        if (!s.due_date) continue;
        if (opts.onlyMine && user && s.assigned_to !== user.id && s.created_by !== user.id) continue;
        list.push({
          id: `svc-${s.id}`,
          title: `Prazo: ${s.subject}`,
          start_at: `${s.due_date}T09:00:00.000Z`,
          all_day: true,
          event_type: "prazo_servico",
          source: "auto",
          service_id: s.id,
          client_id: s.client_id,
          owner_id: s.assigned_to ?? s.created_by,
        });
      }

      for (const c of civilRes.data ?? []) {
        if (!c.expiration_date) continue;
        list.push({
          id: `civ-${c.id}`,
          title: `Vence certidão: ${c.certificate_type}`,
          start_at: `${c.expiration_date}T09:00:00.000Z`,
          all_day: true,
          event_type: "vencimento_certidao",
          source: "auto",
          service_id: c.service_id,
        });
      }

      for (const c of inetRes.data ?? []) {
        if (!c.expected_validity_date) continue;
        list.push({
          id: `inet-${c.id}`,
          title: `Vence certidão: ${c.certificate_type}`,
          start_at: `${c.expected_validity_date}T09:00:00.000Z`,
          all_day: true,
          event_type: "vencimento_certidao",
          source: "auto",
          service_id: c.service_id,
        });
      }

      list.sort((a, b) => a.start_at.localeCompare(b.start_at));
      setEvents(list);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [opts.fromIso, opts.toIso, opts.onlyMine, user?.id]);

  return { events, loading };
}