import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Devolve o último cálculo de Valor Venal salvo pelo usuário (RLS aplica).
 * Usado pelo módulo Escrituras para "Importar Valor Venal".
 */
export function useUltimoValorVenal() {
  return useQuery({
    queryKey: ["calculos", "ultimo-valor-venal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculos")
        .select("*")
        .eq("tipo", "valor_venal")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 30,
  });
}

/** Lista clientes para o picker de vínculo. */
export function useClientsForPicker() {
  return useQuery({
    queryKey: ["clients", "picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name, cpf_cnpj")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/** Lista serviços para o picker de vínculo (com nome do cliente). */
export function useServicesForPicker() {
  return useQuery({
    queryKey: ["services", "picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("id, subject, type, stage, client_id, clients!services_client_id_fkey(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });
}