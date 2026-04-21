import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

export type CalculoTipo = Database["public"]["Enums"]["calculo_tipo"];
export type CalculoRow = Database["public"]["Tables"]["calculos"]["Row"];
export type CalculoInsert = Database["public"]["Tables"]["calculos"]["Insert"];

export const calculosKeys = {
  all: ["calculos"] as const,
  list: (filters?: { tipo?: CalculoTipo }) => ["calculos", "list", filters ?? {}] as const,
  byUser: (userId: string) => ["calculos", "user", userId] as const,
};

/** Lista cálculos visíveis pelo usuário atual (RLS faz o filtro). */
export function useCalculations(filters?: { tipo?: CalculoTipo; limit?: number }) {
  return useQuery({
    queryKey: calculosKeys.list(filters),
    queryFn: async () => {
      let query = supabase
        .from("calculos")
        .select("*")
        .order("created_at", { ascending: false });
      if (filters?.tipo) query = query.eq("tipo", filters.tipo);
      if (filters?.limit) query = query.limit(filters.limit);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Cria um novo cálculo. user_id é injetado automaticamente. */
export function useCreateCalculation() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Omit<CalculoInsert, "user_id">) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from("calculos")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calculosKeys.all });
    },
  });
}