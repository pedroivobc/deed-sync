import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  ServiceParty, CivilCertificate, InternetCertificate, PropertyItbi, PropertyRegistration,
} from "@/lib/serviceDocs";

export interface ServiceDocsState {
  parties: ServiceParty[];
  civilCerts: CivilCertificate[];
  internetCerts: InternetCertificate[];
  itbi: PropertyItbi | null;
  registration: PropertyRegistration | null;
  loading: boolean;
}

export function useServiceDocs(serviceId: string | null) {
  const [state, setState] = useState<ServiceDocsState>({
    parties: [],
    civilCerts: [],
    internetCerts: [],
    itbi: null,
    registration: null,
    loading: false,
  });

  const reload = useCallback(async () => {
    if (!serviceId) {
      setState({ parties: [], civilCerts: [], internetCerts: [], itbi: null, registration: null, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const [pRes, ccRes, icRes, itbiRes, regRes] = await Promise.all([
      supabase.from("service_parties").select("*").eq("service_id", serviceId).order("created_at"),
      supabase.from("service_civil_certificates").select("*").eq("service_id", serviceId).order("created_at"),
      supabase.from("service_internet_certificates").select("*").eq("service_id", serviceId).order("created_at"),
      supabase.from("service_property_itbi").select("*").eq("service_id", serviceId).maybeSingle(),
      supabase.from("service_property_registration").select("*").eq("service_id", serviceId).order("created_at", { ascending: false }).maybeSingle(),
    ]);
    setState({
      parties: (pRes.data ?? []) as ServiceParty[],
      civilCerts: (ccRes.data ?? []) as CivilCertificate[],
      internetCerts: (icRes.data ?? []) as InternetCertificate[],
      itbi: (itbiRes.data ?? null) as PropertyItbi | null,
      registration: (regRes.data ?? null) as PropertyRegistration | null,
      loading: false,
    });
  }, [serviceId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload };
}
