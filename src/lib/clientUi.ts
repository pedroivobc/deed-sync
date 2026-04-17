// Shared UI mappings for the CRM module
import type { Database } from "@/integrations/supabase/types";

export type ClientStatus = Database["public"]["Enums"]["client_status"];
export type ClientCategory = Database["public"]["Enums"]["client_category"];
export type ClientOrigin = Database["public"]["Enums"]["client_origin"];
export type ContactPref = Database["public"]["Enums"]["contact_pref"];
export type ContactChannel = Database["public"]["Enums"]["contact_channel"];

export const STATUS_LABEL: Record<ClientStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  vip: "VIP",
  risco: "Em risco",
};

export const STATUS_BADGE: Record<ClientStatus, string> = {
  ativo: "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200",
  inativo: "bg-muted text-muted-foreground",
  vip: "bg-yellow-100 text-yellow-900 dark:bg-yellow-500/20 dark:text-yellow-200",
  risco: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-200",
};

export const CATEGORY_LABEL: Record<ClientCategory, string> = {
  regular: "Regular",
  recorrente: "Recorrente",
  premium: "Premium",
  unico: "Único",
};

export const ORIGIN_LABEL: Record<ClientOrigin, string> = {
  indicacao: "Indicação",
  corretor_parceiro: "Corretor parceiro",
  imobiliaria: "Imobiliária",
  organico: "Orgânico / Redes sociais",
  site: "Site",
  recorrente: "Cliente recorrente",
  cartorio_parceiro: "Cartório parceiro",
  outros: "Outros",
};

export const CONTACT_PREF_LABEL: Record<ContactPref, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  presencial: "Presencial",
};

export const CHANNEL_LABEL: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  presencial: "Presencial",
  outros: "Outros",
};

export function getInitials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function followupColorClass(date?: string | null): string {
  if (!date) return "text-muted-foreground";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = Math.floor((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "text-destructive font-medium";
  if (diff <= 3) return "text-warning font-medium";
  return "text-foreground";
}
