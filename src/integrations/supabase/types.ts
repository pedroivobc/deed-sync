export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          id: string
          ip_address: string | null
          payload: Json | null
          resource_id: string | null
          resource_type: string
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          ip_address?: string | null
          payload?: Json | null
          resource_id?: string | null
          resource_type: string
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          id?: string
          ip_address?: string | null
          payload?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          channel: Database["public"]["Enums"]["contact_channel"]
          client_id: string
          contact_date: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["contact_channel"]
          client_id: string
          contact_date?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["contact_channel"]
          client_id?: string
          contact_date?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          birthday: string | null
          category: Database["public"]["Enums"]["client_category"]
          company: string | null
          cpf_cnpj: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          internal_notes: string | null
          last_contact: string | null
          name: string
          next_followup: string | null
          notes: string | null
          origin: Database["public"]["Enums"]["client_origin"] | null
          phone: string | null
          preferred_cartorio: string | null
          preferred_contact: Database["public"]["Enums"]["contact_pref"] | null
          profession: string | null
          referred_by: string | null
          satisfaction_nps: number | null
          status: Database["public"]["Enums"]["client_status"]
          type: Database["public"]["Enums"]["client_type"]
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          category?: Database["public"]["Enums"]["client_category"]
          company?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          last_contact?: string | null
          name: string
          next_followup?: string | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["client_origin"] | null
          phone?: string | null
          preferred_cartorio?: string | null
          preferred_contact?: Database["public"]["Enums"]["contact_pref"] | null
          profession?: string | null
          referred_by?: string | null
          satisfaction_nps?: number | null
          status?: Database["public"]["Enums"]["client_status"]
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          birthday?: string | null
          category?: Database["public"]["Enums"]["client_category"]
          company?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          internal_notes?: string | null
          last_contact?: string | null
          name?: string
          next_followup?: string | null
          notes?: string | null
          origin?: Database["public"]["Enums"]["client_origin"] | null
          phone?: string | null
          preferred_cartorio?: string | null
          preferred_contact?: Database["public"]["Enums"]["contact_pref"] | null
          profession?: string | null
          referred_by?: string | null
          satisfaction_nps?: number | null
          status?: Database["public"]["Enums"]["client_status"]
          type?: Database["public"]["Enums"]["client_type"]
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          category: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string
          document_number: string | null
          due_date: string | null
          id: string
          notes: string | null
          payment_method: string | null
          service_id: string | null
          status: Database["public"]["Enums"]["finance_status"]
          type: Database["public"]["Enums"]["finance_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description: string
          document_number?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["finance_status"]
          type: Database["public"]["Enums"]["finance_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          document_number?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["finance_status"]
          type?: Database["public"]["Enums"]["finance_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          description: string | null
          id: string
          link: string | null
          read_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          read_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          theme_preference: Database["public"]["Enums"]["theme_pref"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          theme_preference?: Database["public"]["Enums"]["theme_pref"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          theme_preference?: Database["public"]["Enums"]["theme_pref"]
          updated_at?: string
        }
        Relationships: []
      }
      service_activity_log: {
        Row: {
          action: string
          created_at: string
          id: string
          payload: Json | null
          service_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          payload?: Json | null
          service_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          payload?: Json | null
          service_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_activity_log_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json
          due_date: string | null
          etapa_processo: string | null
          etapa_tarefa: string | null
          id: string
          pasta_fisica: boolean
          stage: Database["public"]["Enums"]["service_stage"]
          subject: string
          type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          due_date?: string | null
          etapa_processo?: string | null
          etapa_tarefa?: string | null
          id?: string
          pasta_fisica?: boolean
          stage?: Database["public"]["Enums"]["service_stage"]
          subject: string
          type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json
          due_date?: string | null
          etapa_processo?: string | null
          etapa_tarefa?: string | null
          id?: string
          pasta_fisica?: boolean
          stage?: Database["public"]["Enums"]["service_stage"]
          subject?: string
          type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string
          email_daily_digest: boolean
          email_followup_reminders: boolean
          email_new_assignments: boolean
          email_overdue_alerts: boolean
          language: string
          monthly_revenue_goal: number | null
          recent_searches: Json
          theme: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_daily_digest?: boolean
          email_followup_reminders?: boolean
          email_new_assignments?: boolean
          email_overdue_alerts?: boolean
          language?: string
          monthly_revenue_goal?: number | null
          recent_searches?: Json
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_daily_digest?: boolean
          email_followup_reminders?: boolean
          email_new_assignments?: boolean
          email_overdue_alerts?: boolean
          language?: string
          monthly_revenue_goal?: number | null
          recent_searches?: Json
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_admin_or_manager: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "administrador" | "gerente" | "colaborador"
      audit_action: "create" | "update" | "delete" | "login" | "logout"
      client_category: "regular" | "recorrente" | "premium" | "unico"
      client_origin:
        | "indicacao"
        | "corretor_parceiro"
        | "imobiliaria"
        | "organico"
        | "site"
        | "recorrente"
        | "cartorio_parceiro"
        | "outros"
      client_status: "ativo" | "inativo" | "vip" | "risco"
      client_type: "PF" | "PJ"
      contact_channel:
        | "whatsapp"
        | "telefone"
        | "email"
        | "presencial"
        | "outros"
      contact_pref: "whatsapp" | "telefone" | "email" | "presencial"
      finance_status: "pago" | "pendente"
      finance_type: "receita" | "despesa"
      notification_type: "critical" | "warning" | "info" | "success"
      service_stage:
        | "entrada"
        | "documentacao"
        | "analise"
        | "execucao"
        | "revisao"
        | "concluido"
      service_type: "escritura" | "avulso" | "regularizacao"
      theme_pref: "light" | "dark"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["administrador", "gerente", "colaborador"],
      audit_action: ["create", "update", "delete", "login", "logout"],
      client_category: ["regular", "recorrente", "premium", "unico"],
      client_origin: [
        "indicacao",
        "corretor_parceiro",
        "imobiliaria",
        "organico",
        "site",
        "recorrente",
        "cartorio_parceiro",
        "outros",
      ],
      client_status: ["ativo", "inativo", "vip", "risco"],
      client_type: ["PF", "PJ"],
      contact_channel: [
        "whatsapp",
        "telefone",
        "email",
        "presencial",
        "outros",
      ],
      contact_pref: ["whatsapp", "telefone", "email", "presencial"],
      finance_status: ["pago", "pendente"],
      finance_type: ["receita", "despesa"],
      notification_type: ["critical", "warning", "info", "success"],
      service_stage: [
        "entrada",
        "documentacao",
        "analise",
        "execucao",
        "revisao",
        "concluido",
      ],
      service_type: ["escritura", "avulso", "regularizacao"],
      theme_pref: ["light", "dark"],
    },
  },
} as const
