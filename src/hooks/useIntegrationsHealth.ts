import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { callDrive } from "@/lib/drive";
import { testClickSignConnection } from "@/lib/clicksign";

export type IntegrationStatus = "ok" | "needs_reconnect" | "checking" | "unknown";

export interface IntegrationsHealth {
  drive: IntegrationStatus;
  clicksign: IntegrationStatus;
  cora: IntegrationStatus;
  lastCheckedAt: number | null;
}

const initial: IntegrationsHealth = {
  drive: "unknown",
  clicksign: "unknown",
  cora: "unknown",
  lastCheckedAt: null,
};

/** Local-storage key to avoid re-running the check on every page navigation. */
const STORAGE_KEY = "integrations_health_v1";
/** Re-check at most every 10 minutes per session. */
const RECHECK_INTERVAL_MS = 10 * 60 * 1000;

function readCached(): IntegrationsHealth | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as IntegrationsHealth;
    if (
      !parsed.lastCheckedAt ||
      Date.now() - parsed.lastCheckedAt > RECHECK_INTERVAL_MS
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCached(h: IntegrationsHealth) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(h));
  } catch {
    /* ignore quota errors */
  }
}

/**
 * Verifies Drive (service account), ClickSign and Cora (auto refresh)
 * once after login and caches the result for the session.
 * Failures never block the UI — they only update status badges.
 */
export function useIntegrationsHealth() {
  const { user, loading } = useAuth();
  const [health, setHealth] = useState<IntegrationsHealth>(() => readCached() ?? initial);
  const [running, setRunning] = useState(false);

  const check = useCallback(async (force = false) => {
    if (!force) {
      const cached = readCached();
      if (cached) {
        setHealth(cached);
        return cached;
      }
    }
    setRunning(true);
    setHealth((prev) => ({
      ...prev,
      drive: "checking",
      clicksign: "checking",
      cora: "checking",
    }));

    const [driveRes, clickRes, coraRes] = await Promise.allSettled([
      callDrive("test_connection"),
      testClickSignConnection(),
      // Cora auto-refreshes its token if expiring within 5 min.
      supabase.functions.invoke("cora-auth", { body: {} }),
    ]);

    const drive: IntegrationStatus =
      driveRes.status === "fulfilled" && driveRes.value.ok ? "ok" : "needs_reconnect";

    const clicksign: IntegrationStatus =
      clickRes.status === "fulfilled" && clickRes.value.ok && clickRes.value.result?.ok
        ? "ok"
        : "needs_reconnect";

    let cora: IntegrationStatus = "needs_reconnect";
    if (coraRes.status === "fulfilled") {
      const data = coraRes.value.data as { ok?: boolean } | null;
      if (!coraRes.value.error && data?.ok) cora = "ok";
    }

    const next: IntegrationsHealth = {
      drive,
      clicksign,
      cora,
      lastCheckedAt: Date.now(),
    };
    setHealth(next);
    writeCached(next);
    setRunning(false);
    return next;
  }, []);

  // Run once after the user is authenticated.
  useEffect(() => {
    if (loading || !user) return;
    void check(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  return { health, running, recheck: () => check(true) };
}
