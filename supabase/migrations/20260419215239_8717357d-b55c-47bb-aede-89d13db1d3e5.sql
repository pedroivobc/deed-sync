-- Enums
CREATE TYPE public.ocr_document_type AS ENUM (
  'rg','cpf','cnh','comprovante_residencia','contrato_social','certidao_junta',
  'alteracao_contratual','certidao_tjmg','certidao_trf6_fisico','certidao_trf6_eproc',
  'certidao_tst','certidao_trt3','certidao_receita_federal','certidao_estado_civil',
  'matricula_imovel','guia_itbi','outro'
);

CREATE TYPE public.ocr_extraction_status AS ENUM (
  'pending','processing','completed','partial','failed'
);

-- Logs de extração
CREATE TABLE public.ocr_extraction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  party_id uuid REFERENCES public.service_parties(id) ON DELETE SET NULL,
  drive_file_id uuid REFERENCES public.drive_files(id) ON DELETE SET NULL,
  document_type public.ocr_document_type NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  extracted_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  gemini_model_used text,
  prompt_tokens_used integer DEFAULT 0,
  response_tokens_used integer DEFAULT 0,
  processing_time_ms integer DEFAULT 0,
  status public.ocr_extraction_status NOT NULL DEFAULT 'pending',
  error_message text,
  user_accepted boolean NOT NULL DEFAULT false,
  user_corrected_fields jsonb,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ocr_logs_created_by ON public.ocr_extraction_logs(created_by);
CREATE INDEX idx_ocr_logs_created_at ON public.ocr_extraction_logs(created_at DESC);
CREATE INDEX idx_ocr_logs_service_id ON public.ocr_extraction_logs(service_id);
CREATE INDEX idx_ocr_logs_party_id ON public.ocr_extraction_logs(party_id);

ALTER TABLE public.ocr_extraction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own OCR logs"
  ON public.ocr_extraction_logs FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated insert OCR logs"
  ON public.ocr_extraction_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users update own OCR logs"
  ON public.ocr_extraction_logs FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin delete OCR logs"
  ON public.ocr_extraction_logs FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Estatísticas de uso mensal
CREATE TABLE public.ocr_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  total_extractions integer NOT NULL DEFAULT 0,
  total_tokens_used integer NOT NULL DEFAULT 0,
  estimated_cost_brl numeric(10,4) NOT NULL DEFAULT 0,
  by_document_type jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ocr_stats_month ON public.ocr_usage_stats(month DESC);

ALTER TABLE public.ocr_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager view usage stats"
  ON public.ocr_usage_stats FOR SELECT TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated upsert usage stats"
  ON public.ocr_usage_stats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update usage stats"
  ON public.ocr_usage_stats FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger updated_at
CREATE TRIGGER trg_ocr_usage_stats_updated_at
  BEFORE UPDATE ON public.ocr_usage_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();