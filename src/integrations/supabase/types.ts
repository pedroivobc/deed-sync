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
      drive_files: {
        Row: {
          client_id: string | null
          download_url: string | null
          drive_file_id: string
          drive_folder_id: string
          file_name: string
          file_size: number
          id: string
          mime_type: string
          notes: string | null
          ocr_extracted_data: Json | null
          ocr_status: Database["public"]["Enums"]["drive_ocr_status"]
          preview_url: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          service_id: string | null
          tags: string[] | null
          thumbnail_url: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          client_id?: string | null
          download_url?: string | null
          drive_file_id: string
          drive_folder_id: string
          file_name: string
          file_size?: number
          id?: string
          mime_type: string
          notes?: string | null
          ocr_extracted_data?: Json | null
          ocr_status?: Database["public"]["Enums"]["drive_ocr_status"]
          preview_url?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          service_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string | null
          download_url?: string | null
          drive_file_id?: string
          drive_folder_id?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          notes?: string | null
          ocr_extracted_data?: Json | null
          ocr_status?: Database["public"]["Enums"]["drive_ocr_status"]
          preview_url?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          service_id?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drive_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drive_folders: {
        Row: {
          created_at: string
          drive_folder_id: string
          drive_folder_url: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["drive_entity_type"]
          folder_path: string
          id: string
          parent_folder_id: string | null
          subfolder_type: Database["public"]["Enums"]["drive_subfolder_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          drive_folder_id: string
          drive_folder_url: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["drive_entity_type"]
          folder_path: string
          id?: string
          parent_folder_id?: string | null
          subfolder_type?: Database["public"]["Enums"]["drive_subfolder_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          drive_folder_id?: string
          drive_folder_url?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["drive_entity_type"]
          folder_path?: string
          id?: string
          parent_folder_id?: string | null
          subfolder_type?: Database["public"]["Enums"]["drive_subfolder_type"]
          updated_at?: string
        }
        Relationships: []
      }
      drive_sync_logs: {
        Row: {
          created_at: string
          details: Json
          drive_resource_id: string | null
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          id: string
          operation: Database["public"]["Enums"]["drive_sync_operation"]
          status: Database["public"]["Enums"]["drive_sync_status"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          drive_resource_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          operation: Database["public"]["Enums"]["drive_sync_operation"]
          status: Database["public"]["Enums"]["drive_sync_status"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          drive_resource_id?: string | null
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          id?: string
          operation?: Database["public"]["Enums"]["drive_sync_operation"]
          status?: Database["public"]["Enums"]["drive_sync_status"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drive_sync_logs_user_id_fkey"
            columns: ["user_id"]
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
      ocr_extraction_logs: {
        Row: {
          client_id: string | null
          confidence_scores: Json
          created_at: string
          created_by: string | null
          document_type: Database["public"]["Enums"]["ocr_document_type"]
          drive_file_id: string | null
          error_message: string | null
          extracted_data: Json
          file_name: string
          file_size: number
          gemini_model_used: string | null
          id: string
          mime_type: string
          party_id: string | null
          processing_time_ms: number | null
          prompt_tokens_used: number | null
          response_tokens_used: number | null
          service_id: string | null
          status: Database["public"]["Enums"]["ocr_extraction_status"]
          user_accepted: boolean
          user_corrected_fields: Json | null
        }
        Insert: {
          client_id?: string | null
          confidence_scores?: Json
          created_at?: string
          created_by?: string | null
          document_type: Database["public"]["Enums"]["ocr_document_type"]
          drive_file_id?: string | null
          error_message?: string | null
          extracted_data?: Json
          file_name: string
          file_size?: number
          gemini_model_used?: string | null
          id?: string
          mime_type: string
          party_id?: string | null
          processing_time_ms?: number | null
          prompt_tokens_used?: number | null
          response_tokens_used?: number | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["ocr_extraction_status"]
          user_accepted?: boolean
          user_corrected_fields?: Json | null
        }
        Update: {
          client_id?: string | null
          confidence_scores?: Json
          created_at?: string
          created_by?: string | null
          document_type?: Database["public"]["Enums"]["ocr_document_type"]
          drive_file_id?: string | null
          error_message?: string | null
          extracted_data?: Json
          file_name?: string
          file_size?: number
          gemini_model_used?: string | null
          id?: string
          mime_type?: string
          party_id?: string | null
          processing_time_ms?: number | null
          prompt_tokens_used?: number | null
          response_tokens_used?: number | null
          service_id?: string | null
          status?: Database["public"]["Enums"]["ocr_extraction_status"]
          user_accepted?: boolean
          user_corrected_fields?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ocr_extraction_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_extraction_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_extraction_logs_drive_file_id_fkey"
            columns: ["drive_file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_extraction_logs_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "service_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocr_extraction_logs_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      ocr_usage_stats: {
        Row: {
          by_document_type: Json
          estimated_cost_brl: number
          id: string
          month: string
          total_extractions: number
          total_tokens_used: number
          updated_at: string
        }
        Insert: {
          by_document_type?: Json
          estimated_cost_brl?: number
          id?: string
          month: string
          total_extractions?: number
          total_tokens_used?: number
          updated_at?: string
        }
        Update: {
          by_document_type?: Json
          estimated_cost_brl?: number
          id?: string
          month?: string
          total_extractions?: number
          total_tokens_used?: number
          updated_at?: string
        }
        Relationships: []
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
      service_civil_certificates: {
        Row: {
          certificate_type: Database["public"]["Enums"]["civil_certificate_type"]
          complementary_payment: number | null
          created_at: string
          expiration_date: string | null
          file_url: string | null
          id: string
          initial_payment: number | null
          is_issued: boolean
          issued_date: string | null
          notes: string | null
          party_id: string
          request_date: string | null
          service_id: string
          status: Database["public"]["Enums"]["civil_certificate_status"]
          total_paid: number | null
          updated_at: string
          validity_days: number
        }
        Insert: {
          certificate_type: Database["public"]["Enums"]["civil_certificate_type"]
          complementary_payment?: number | null
          created_at?: string
          expiration_date?: string | null
          file_url?: string | null
          id?: string
          initial_payment?: number | null
          is_issued?: boolean
          issued_date?: string | null
          notes?: string | null
          party_id: string
          request_date?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["civil_certificate_status"]
          total_paid?: number | null
          updated_at?: string
          validity_days?: number
        }
        Update: {
          certificate_type?: Database["public"]["Enums"]["civil_certificate_type"]
          complementary_payment?: number | null
          created_at?: string
          expiration_date?: string | null
          file_url?: string | null
          id?: string
          initial_payment?: number | null
          is_issued?: boolean
          issued_date?: string | null
          notes?: string | null
          party_id?: string
          request_date?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["civil_certificate_status"]
          total_paid?: number | null
          updated_at?: string
          validity_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_civil_certificates_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "service_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_civil_certificates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_internet_certificates: {
        Row: {
          certificate_type: Database["public"]["Enums"]["internet_certificate_type"]
          comarca: string | null
          created_at: string
          custom_name: string | null
          drive_file_id: string | null
          expected_validity_date: string | null
          file_name: string | null
          file_size: number | null
          file_uploaded_at: string | null
          file_uploaded_by: string | null
          file_url: string | null
          id: string
          infosimples_request_id: string | null
          issued_date: string | null
          issuer_url: string | null
          notes: string | null
          party_id: string | null
          protocol_number: string | null
          request_date: string | null
          service_id: string
          state: string | null
          status: Database["public"]["Enums"]["internet_certificate_status"]
          updated_at: string
        }
        Insert: {
          certificate_type: Database["public"]["Enums"]["internet_certificate_type"]
          comarca?: string | null
          created_at?: string
          custom_name?: string | null
          drive_file_id?: string | null
          expected_validity_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_uploaded_at?: string | null
          file_uploaded_by?: string | null
          file_url?: string | null
          id?: string
          infosimples_request_id?: string | null
          issued_date?: string | null
          issuer_url?: string | null
          notes?: string | null
          party_id?: string | null
          protocol_number?: string | null
          request_date?: string | null
          service_id: string
          state?: string | null
          status?: Database["public"]["Enums"]["internet_certificate_status"]
          updated_at?: string
        }
        Update: {
          certificate_type?: Database["public"]["Enums"]["internet_certificate_type"]
          comarca?: string | null
          created_at?: string
          custom_name?: string | null
          drive_file_id?: string | null
          expected_validity_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_uploaded_at?: string | null
          file_uploaded_by?: string | null
          file_url?: string | null
          id?: string
          infosimples_request_id?: string | null
          issued_date?: string | null
          issuer_url?: string | null
          notes?: string | null
          party_id?: string | null
          protocol_number?: string | null
          request_date?: string | null
          service_id?: string
          state?: string | null
          status?: Database["public"]["Enums"]["internet_certificate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_internet_certificates_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "service_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_internet_certificates_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_parties: {
        Row: {
          address: string | null
          cnh: string | null
          company_state: string | null
          cpf_cnpj: string | null
          created_at: string
          email: string | null
          has_digital_certificate: boolean | null
          id: string
          marital_status: string | null
          name: string
          nationality: string | null
          notes: string | null
          person_type: Database["public"]["Enums"]["party_person_type"]
          phone: string | null
          profession: string | null
          rg: string | null
          role: Database["public"]["Enums"]["party_role"]
          service_id: string
          signature_mode: Database["public"]["Enums"]["signature_mode"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          cnh?: string | null
          company_state?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          has_digital_certificate?: boolean | null
          id?: string
          marital_status?: string | null
          name: string
          nationality?: string | null
          notes?: string | null
          person_type?: Database["public"]["Enums"]["party_person_type"]
          phone?: string | null
          profession?: string | null
          rg?: string | null
          role: Database["public"]["Enums"]["party_role"]
          service_id: string
          signature_mode?: Database["public"]["Enums"]["signature_mode"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          cnh?: string | null
          company_state?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          email?: string | null
          has_digital_certificate?: boolean | null
          id?: string
          marital_status?: string | null
          name?: string
          nationality?: string | null
          notes?: string | null
          person_type?: Database["public"]["Enums"]["party_person_type"]
          phone?: string | null
          profession?: string | null
          rg?: string | null
          role?: Database["public"]["Enums"]["party_role"]
          service_id?: string
          signature_mode?: Database["public"]["Enums"]["signature_mode"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_parties_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_property_itbi: {
        Row: {
          created_at: string
          id: string
          is_issued: boolean
          issuance_date: string | null
          itbi_value: number | null
          observations: string | null
          payment_date: string | null
          prefecture_url: string | null
          protocol_date: string | null
          protocol_number: string | null
          service_id: string
          status: Database["public"]["Enums"]["itbi_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_issued?: boolean
          issuance_date?: string | null
          itbi_value?: number | null
          observations?: string | null
          payment_date?: string | null
          prefecture_url?: string | null
          protocol_date?: string | null
          protocol_number?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["itbi_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_issued?: boolean
          issuance_date?: string | null
          itbi_value?: number | null
          observations?: string | null
          payment_date?: string | null
          prefecture_url?: string | null
          protocol_date?: string | null
          protocol_number?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["itbi_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_property_itbi_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_property_registration: {
        Row: {
          amount_paid: number | null
          created_at: string
          drive_file_id: string | null
          expiration_date: string | null
          file_name: string | null
          file_size: number | null
          file_uploaded_at: string | null
          file_uploaded_by: string | null
          file_url: string | null
          id: string
          is_released: boolean
          issued_date: string | null
          notes: string | null
          onr_protocol: string | null
          registration_type: Database["public"]["Enums"]["property_registration_type"]
          request_date: string | null
          service_id: string
          status: Database["public"]["Enums"]["property_registration_status"]
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          drive_file_id?: string | null
          expiration_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_uploaded_at?: string | null
          file_uploaded_by?: string | null
          file_url?: string | null
          id?: string
          is_released?: boolean
          issued_date?: string | null
          notes?: string | null
          onr_protocol?: string | null
          registration_type?: Database["public"]["Enums"]["property_registration_type"]
          request_date?: string | null
          service_id: string
          status?: Database["public"]["Enums"]["property_registration_status"]
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          drive_file_id?: string | null
          expiration_date?: string | null
          file_name?: string | null
          file_size?: number | null
          file_uploaded_at?: string | null
          file_uploaded_by?: string | null
          file_url?: string | null
          id?: string
          is_released?: boolean
          issued_date?: string | null
          notes?: string | null
          onr_protocol?: string | null
          registration_type?: Database["public"]["Enums"]["property_registration_type"]
          request_date?: string | null
          service_id?: string
          status?: Database["public"]["Enums"]["property_registration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_property_registration_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_reminders: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          expiration_date: string
          id: string
          is_dismissed: boolean
          is_sent: boolean
          reminder_date: string
          service_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          expiration_date: string
          id?: string
          is_dismissed?: boolean
          is_sent?: boolean
          reminder_date: string
          service_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          expiration_date?: string
          id?: string
          is_dismissed?: boolean
          is_sent?: boolean
          reminder_date?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_reminders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
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
      check_document_expirations: { Args: never; Returns: undefined }
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
      civil_certificate_status:
        | "pendente"
        | "solicitada"
        | "emitida"
        | "vencida"
        | "cancelada"
      civil_certificate_type:
        | "estado_civil"
        | "simplificada_junta"
        | "contrato_social"
        | "alteracao_consolidada"
        | "ultima_alteracao"
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
      drive_entity_type: "service" | "client"
      drive_ocr_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "not_applicable"
      drive_subfolder_type:
        | "root"
        | "certidoes_pessoais"
        | "certidoes_internet"
        | "docs_imovel"
        | "contrato"
        | "escritura_final"
        | "docs_recebidos"
        | "docs_gerados"
        | "entrega_final"
        | "docs_pessoais"
        | "historico_servicos"
        | "comunicacoes"
      drive_sync_operation:
        | "folder_created"
        | "folder_deleted"
        | "file_uploaded"
        | "file_deleted"
        | "ocr_processed"
        | "sync_manual"
        | "test_connection"
        | "error"
      drive_sync_status: "success" | "failed" | "partial"
      finance_status: "pago" | "pendente"
      finance_type: "receita" | "despesa"
      internet_certificate_status:
        | "pendente"
        | "solicitada"
        | "emitida"
        | "vencida"
        | "cancelada"
      internet_certificate_type:
        | "tjmg_civel"
        | "trf6_fisico"
        | "trf6_eproc"
        | "tst"
        | "trt3"
        | "receita_federal"
        | "outra"
      itbi_status: "nao_iniciado" | "protocolado" | "pendente_doc" | "emitido"
      notification_type: "critical" | "warning" | "info" | "success"
      ocr_document_type:
        | "rg"
        | "cpf"
        | "cnh"
        | "comprovante_residencia"
        | "contrato_social"
        | "certidao_junta"
        | "alteracao_contratual"
        | "certidao_tjmg"
        | "certidao_trf6_fisico"
        | "certidao_trf6_eproc"
        | "certidao_tst"
        | "certidao_trt3"
        | "certidao_receita_federal"
        | "certidao_estado_civil"
        | "matricula_imovel"
        | "guia_itbi"
        | "outro"
      ocr_extraction_status:
        | "pending"
        | "processing"
        | "completed"
        | "partial"
        | "failed"
      party_person_type: "PF" | "PJ"
      party_role:
        | "comprador"
        | "vendedor"
        | "socio_comprador"
        | "socio_vendedor"
        | "outorgante"
        | "outorgado"
        | "interveniente"
        | "outros"
      property_registration_status:
        | "pendente"
        | "solicitada"
        | "liberada"
        | "vencida"
      property_registration_type:
        | "inteiro_teor"
        | "onus_reais"
        | "transcricao"
        | "somente_onus_reais"
      service_stage:
        | "entrada"
        | "documentacao"
        | "analise"
        | "execucao"
        | "revisao"
        | "concluido"
      service_type: "escritura" | "avulso" | "regularizacao"
      signature_mode: "online" | "presencial" | "hibrida"
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
      civil_certificate_status: [
        "pendente",
        "solicitada",
        "emitida",
        "vencida",
        "cancelada",
      ],
      civil_certificate_type: [
        "estado_civil",
        "simplificada_junta",
        "contrato_social",
        "alteracao_consolidada",
        "ultima_alteracao",
      ],
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
      drive_entity_type: ["service", "client"],
      drive_ocr_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "not_applicable",
      ],
      drive_subfolder_type: [
        "root",
        "certidoes_pessoais",
        "certidoes_internet",
        "docs_imovel",
        "contrato",
        "escritura_final",
        "docs_recebidos",
        "docs_gerados",
        "entrega_final",
        "docs_pessoais",
        "historico_servicos",
        "comunicacoes",
      ],
      drive_sync_operation: [
        "folder_created",
        "folder_deleted",
        "file_uploaded",
        "file_deleted",
        "ocr_processed",
        "sync_manual",
        "test_connection",
        "error",
      ],
      drive_sync_status: ["success", "failed", "partial"],
      finance_status: ["pago", "pendente"],
      finance_type: ["receita", "despesa"],
      internet_certificate_status: [
        "pendente",
        "solicitada",
        "emitida",
        "vencida",
        "cancelada",
      ],
      internet_certificate_type: [
        "tjmg_civel",
        "trf6_fisico",
        "trf6_eproc",
        "tst",
        "trt3",
        "receita_federal",
        "outra",
      ],
      itbi_status: ["nao_iniciado", "protocolado", "pendente_doc", "emitido"],
      notification_type: ["critical", "warning", "info", "success"],
      ocr_document_type: [
        "rg",
        "cpf",
        "cnh",
        "comprovante_residencia",
        "contrato_social",
        "certidao_junta",
        "alteracao_contratual",
        "certidao_tjmg",
        "certidao_trf6_fisico",
        "certidao_trf6_eproc",
        "certidao_tst",
        "certidao_trt3",
        "certidao_receita_federal",
        "certidao_estado_civil",
        "matricula_imovel",
        "guia_itbi",
        "outro",
      ],
      ocr_extraction_status: [
        "pending",
        "processing",
        "completed",
        "partial",
        "failed",
      ],
      party_person_type: ["PF", "PJ"],
      party_role: [
        "comprador",
        "vendedor",
        "socio_comprador",
        "socio_vendedor",
        "outorgante",
        "outorgado",
        "interveniente",
        "outros",
      ],
      property_registration_status: [
        "pendente",
        "solicitada",
        "liberada",
        "vencida",
      ],
      property_registration_type: [
        "inteiro_teor",
        "onus_reais",
        "transcricao",
        "somente_onus_reais",
      ],
      service_stage: [
        "entrada",
        "documentacao",
        "analise",
        "execucao",
        "revisao",
        "concluido",
      ],
      service_type: ["escritura", "avulso", "regularizacao"],
      signature_mode: ["online", "presencial", "hibrida"],
      theme_pref: ["light", "dark"],
    },
  },
} as const
