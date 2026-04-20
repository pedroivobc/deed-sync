-- Enums
CREATE TYPE public.infosimples_consultation_type AS ENUM (
  'trf6_certidao',
  'tst_cndt',
  'trt3_ceat',
  'receita_federal_pgfn',
  'receita_federal_situacao',
  'outro'
);

CREATE TYPE public.infosimples_request_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'retrying'
);

CREATE TYPE public.infosimples_certificate_result AS ENUM (
  'negativa',
  'positiva',
  'positiva_com_efeito_negativa',
  'inconclusiva'
);

CREATE TYPE public.infosimples_validation_status AS ENUM (
  'pending',
  'validated',
  'mismatch',
  'error'
);

-- infosimples_requests
CREATE TABLE public.infosimples_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  party_id uuid REFERENCES public.service_parties(id) ON DELETE SET NULL,
  certificate_id uuid REFERENCES public.service_internet_certificates(id) ON DELETE SET NULL,
  consultation_type public.infosimples_consultation_type NOT NULL,
  request_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_url text,
  response_status integer,
  response_body jsonb,
  pdf_drive_file_id text,
  pdf_drive_file_url text,
  certificate_result public.infosimples_certificate_result,
  protocol_number text,
  issued_date timestamptz,
  validity_date date,
  processing_time_ms integer,
  cost_estimated_brl numeric(10,4) NOT NULL DEFAULT 0,
  status public.infosimples_request_status NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_infosimples_requests_service ON public.infosimples_requests(service_id);
CREATE INDEX idx_infosimples_requests_party ON public.infosimples_requests(party_id);
CREATE INDEX idx_infosimples_requests_certificate ON public.infosimples_requests(certificate_id);
CREATE INDEX idx_infosimples_requests_status ON public.infosimples_requests(status);
CREATE INDEX idx_infosimples_requests_created_at ON public.infosimples_requests(created_at DESC);

ALTER TABLE public.infosimples_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view infosimples_requests"
  ON public.infosimples_requests FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Staff insert infosimples_requests"
  ON public.infosimples_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    OR public.has_role(auth.uid(), 'gerente'::public.app_role)
    OR public.has_role(auth.uid(), 'colaborador'::public.app_role)
  );

CREATE POLICY "Staff update infosimples_requests"
  ON public.infosimples_requests FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    OR public.has_role(auth.uid(), 'gerente'::public.app_role)
    OR public.has_role(auth.uid(), 'colaborador'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    OR public.has_role(auth.uid(), 'gerente'::public.app_role)
    OR public.has_role(auth.uid(), 'colaborador'::public.app_role)
  );

CREATE POLICY "Admin delete infosimples_requests"
  ON public.infosimples_requests FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- infosimples_usage_stats
CREATE TABLE public.infosimples_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL UNIQUE,
  total_requests integer NOT NULL DEFAULT 0,
  successful_requests integer NOT NULL DEFAULT 0,
  failed_requests integer NOT NULL DEFAULT 0,
  estimated_cost_brl numeric(10,2) NOT NULL DEFAULT 0,
  by_consultation_type jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.infosimples_usage_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager view infosimples_usage"
  ON public.infosimples_usage_stats FOR SELECT
  TO authenticated USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated upsert infosimples_usage"
  ON public.infosimples_usage_stats FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated update infosimples_usage"
  ON public.infosimples_usage_stats FOR UPDATE
  TO authenticated USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- service_internet_certificates: novas colunas
ALTER TABLE public.service_internet_certificates
  ADD COLUMN IF NOT EXISTS auto_emitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS infosimples_request_id uuid REFERENCES public.infosimples_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gemini_validation_result jsonb,
  ADD COLUMN IF NOT EXISTS validation_status public.infosimples_validation_status,
  ADD COLUMN IF NOT EXISTS classification public.infosimples_certificate_result;

CREATE INDEX IF NOT EXISTS idx_inet_certs_infosimples_req
  ON public.service_internet_certificates(infosimples_request_id);