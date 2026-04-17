import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceAlerts {
  hasExpired: boolean;
  expiringSoon: boolean;
  incomplete: boolean;
  complete: boolean;
}

const EMPTY: ServiceAlerts = { hasExpired: false, expiringSoon: false, incomplete: true, complete: false };

/**
 * Batch-fetches doc alert flags for a list of escritura service IDs.
 * Lightweight: only counts/dates, no full payloads.
 */
export function useServiceAlerts(serviceIds: string[]) {
  const [map, setMap] = useState<Record<string, ServiceAlerts>>({});

  useEffect(() => {
    if (serviceIds.length === 0) {
      setMap({});
      return;
    }
    let cancelled = false;

    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

      const [partiesRes, civilRes, inetRes, itbiRes, regRes] = await Promise.all([
        supabase.from("service_parties").select("service_id").in("service_id", serviceIds),
        supabase.from("service_civil_certificates").select("service_id, status, expiration_date").in("service_id", serviceIds),
        supabase.from("service_internet_certificates").select("service_id, status, expected_validity_date").in("service_id", serviceIds),
        supabase.from("service_property_itbi").select("service_id, is_issued").in("service_id", serviceIds),
        supabase.from("service_property_registration").select("service_id, is_released, status, expiration_date").in("service_id", serviceIds),
      ]);

      if (cancelled) return;

      const next: Record<string, ServiceAlerts> = {};
      for (const id of serviceIds) {
        next[id] = { ...EMPTY };
      }

      // Parties presence
      const partyByService = new Set((partiesRes.data ?? []).map((r) => r.service_id));

      // Civil certs
      let civilIssuedByService: Record<string, number> = {};
      let civilTotalByService: Record<string, number> = {};
      for (const r of civilRes.data ?? []) {
        civilTotalByService[r.service_id] = (civilTotalByService[r.service_id] ?? 0) + 1;
        if (r.status === "emitida") {
          civilIssuedByService[r.service_id] = (civilIssuedByService[r.service_id] ?? 0) + 1;
        }
        const a = next[r.service_id];
        if (a) {
          if (r.status === "vencida" || (r.expiration_date && r.expiration_date < today)) a.hasExpired = true;
          else if (r.expiration_date && r.expiration_date <= in7 && r.status === "emitida") a.expiringSoon = true;
        }
      }

      // Internet certs
      let inetIssuedByService: Record<string, number> = {};
      for (const r of inetRes.data ?? []) {
        if (r.status === "emitida") {
          inetIssuedByService[r.service_id] = (inetIssuedByService[r.service_id] ?? 0) + 1;
        }
        const a = next[r.service_id];
        if (a) {
          if (r.status === "vencida" || (r.expected_validity_date && r.expected_validity_date < today)) a.hasExpired = true;
          else if (r.expected_validity_date && r.expected_validity_date <= in7 && r.status === "emitida") a.expiringSoon = true;
        }
      }

      // ITBI
      const itbiByService: Record<string, boolean> = {};
      for (const r of itbiRes.data ?? []) itbiByService[r.service_id] = !!r.is_issued;

      // Registration
      const regByService: Record<string, boolean> = {};
      for (const r of regRes.data ?? []) {
        regByService[r.service_id] = !!r.is_released;
        const a = next[r.service_id];
        if (a) {
          if (r.status === "vencida" || (r.expiration_date && r.expiration_date < today)) a.hasExpired = true;
          else if (r.expiration_date && r.expiration_date <= in7 && r.status === "liberada") a.expiringSoon = true;
        }
      }

      // Compute completeness — same buckets as DocChecklistPanel
      for (const id of serviceIds) {
        const a = next[id];
        const buckets: number[] = [];
        const hasParties = partyByService.has(id);
        buckets.push(hasParties ? 1 : 0);

        // Each civil cert as a bucket counted as ratio issued/total (already aggregated)
        const total = civilTotalByService[id] ?? 0;
        const issued = civilIssuedByService[id] ?? 0;
        if (total > 0) buckets.push(Math.min(1, issued / total));

        // 6 internet certs expected
        buckets.push(Math.min(1, (inetIssuedByService[id] ?? 0) / 6));
        buckets.push(itbiByService[id] ? 1 : 0);
        buckets.push(regByService[id] ? 1 : 0);

        const sum = buckets.reduce((s, n) => s + n, 0);
        const ratio = buckets.length === 0 ? 0 : sum / buckets.length;
        a.complete = ratio >= 1;
        a.incomplete = ratio < 0.5;
      }

      setMap(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [serviceIds.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}
