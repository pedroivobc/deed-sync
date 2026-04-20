-- =========================================================
-- ClickSign Integration: enums, tables, indexes, RLS, triggers
-- =========================================================

-- Enums
CREATE TYPE public.clicksign_envelope_type AS ENUM (
  'procuracao_itbi',
  'contrato_assessoria',
  'declaracao',
  'outro'
);

CREATE TYPE public.clicksign_envelope_status AS ENUM (
  'draft',
  'running',
  'signed',
  'cancelled',
  'refused',
  'expired',
  'error'
);

CREATE TYPE public.clicksign_signer_role AS ENUM (
  'signatario',
  'testemunha',
  'anuente',
  'acusador'
);

CREATE TYPE public.clicksign_signer_status AS ENUM (
  'pending',
  'signed',
  'refused'
);

-- =========================================================
-- Table: clicksign_templates
-- =========================================================
CREATE TABLE public.clicksign_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.clicksign_envelope_type NOT NULL,
  description text,
  content_html text NOT NULL,
  variables_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clicksign_templates_type ON public.clicksign_templates(type) WHERE is_active;

ALTER TABLE public.clicksign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view templates"
  ON public.clicksign_templates FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin/manager insert templates"
  ON public.clicksign_templates FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager update templates"
  ON public.clicksign_templates FOR UPDATE TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin delete templates"
  ON public.clicksign_templates FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_clicksign_templates_updated_at
  BEFORE UPDATE ON public.clicksign_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Table: clicksign_envelopes
-- =========================================================
CREATE TABLE public.clicksign_envelopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  party_id uuid REFERENCES public.service_parties(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  envelope_type public.clicksign_envelope_type NOT NULL DEFAULT 'procuracao_itbi',
  clicksign_envelope_id text NOT NULL UNIQUE,
  clicksign_document_id text,
  status public.clicksign_envelope_status NOT NULL DEFAULT 'draft',
  document_name text NOT NULL,
  document_path_drive text,
  signed_document_drive_id text,
  template_used text,
  custom_variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  deadline_at timestamptz,
  sent_at timestamptz,
  signed_at timestamptz,
  cancelled_at timestamptz,
  last_error text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clicksign_envelopes_service ON public.clicksign_envelopes(service_id);
CREATE INDEX idx_clicksign_envelopes_status ON public.clicksign_envelopes(status);
CREATE INDEX idx_clicksign_envelopes_created ON public.clicksign_envelopes(created_at DESC);

ALTER TABLE public.clicksign_envelopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view envelopes"
  ON public.clicksign_envelopes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff insert envelopes"
  ON public.clicksign_envelopes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::app_role) OR
    public.has_role(auth.uid(), 'gerente'::app_role) OR
    public.has_role(auth.uid(), 'colaborador'::app_role)
  );

CREATE POLICY "Staff update envelopes"
  ON public.clicksign_envelopes FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador'::app_role) OR
    public.has_role(auth.uid(), 'gerente'::app_role) OR
    public.has_role(auth.uid(), 'colaborador'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::app_role) OR
    public.has_role(auth.uid(), 'gerente'::app_role) OR
    public.has_role(auth.uid(), 'colaborador'::app_role)
  );

CREATE POLICY "Admin/manager delete envelopes"
  ON public.clicksign_envelopes FOR DELETE TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_clicksign_envelopes_updated_at
  BEFORE UPDATE ON public.clicksign_envelopes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- Table: clicksign_signers
-- =========================================================
CREATE TABLE public.clicksign_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id uuid NOT NULL REFERENCES public.clicksign_envelopes(id) ON DELETE CASCADE,
  clicksign_signer_id text NOT NULL,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signer_cpf_cnpj text,
  signer_phone text,
  signer_role public.clicksign_signer_role NOT NULL DEFAULT 'signatario',
  signer_order integer NOT NULL DEFAULT 1,
  authentication_methods text[] NOT NULL DEFAULT ARRAY['email']::text[],
  status public.clicksign_signer_status NOT NULL DEFAULT 'pending',
  signed_at timestamptz,
  signed_ip text,
  sign_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clicksign_signers_envelope ON public.clicksign_signers(envelope_id);
CREATE INDEX idx_clicksign_signers_clicksign_id ON public.clicksign_signers(clicksign_signer_id);

ALTER TABLE public.clicksign_signers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view signers"
  ON public.clicksign_signers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Staff insert signers"
  ON public.clicksign_signers FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::app_role) OR
    public.has_role(auth.uid(), 'gerente'::app_role) OR
    public.has_role(auth.uid(), 'colaborador'::app_role)
  );

CREATE POLICY "Staff update signers"
  ON public.clicksign_signers FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador'::app_role) OR
    public.has_role(auth.uid(), 'gerente'::app_role) OR
    public.has_role(auth.uid(), 'colaborador'::app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::app_role) OR
    public.has_role(auth.uid(), 'gerente'::app_role) OR
    public.has_role(auth.uid(), 'colaborador'::app_role)
  );

CREATE POLICY "Admin/manager delete signers"
  ON public.clicksign_signers FOR DELETE TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- =========================================================
-- Table: clicksign_webhooks_log
-- =========================================================
CREATE TABLE public.clicksign_webhooks_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  envelope_id uuid REFERENCES public.clicksign_envelopes(id) ON DELETE SET NULL,
  clicksign_envelope_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_clicksign_webhooks_envelope ON public.clicksign_webhooks_log(envelope_id);
CREATE INDEX idx_clicksign_webhooks_received ON public.clicksign_webhooks_log(received_at DESC);

ALTER TABLE public.clicksign_webhooks_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager view webhook logs"
  ON public.clicksign_webhooks_log FOR SELECT TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- INSERT/UPDATE feito apenas pela edge function (service role bypassa RLS)

-- =========================================================
-- Seed: Template padrão de Procuração ITBI
-- =========================================================
INSERT INTO public.clicksign_templates (name, type, description, content_html, variables_schema, is_active)
VALUES (
  'Procuração ITBI - Padrão',
  'procuracao_itbi',
  'Template padrão para procuração de emissão de guia de ITBI. Pode ser editado pelo admin.',
  '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Procuração ITBI</title><style>body{font-family:Georgia,serif;font-size:12pt;line-height:1.6;color:#000;padding:40px;max-width:800px;margin:0 auto}h1{text-align:center;font-size:14pt;margin-bottom:30px;text-transform:uppercase}p{text-align:justify;margin-bottom:14px}.signature{margin-top:80px;text-align:center}.signature-line{border-top:1px solid #000;width:60%;margin:0 auto;padding-top:6px}ul{margin:8px 0 14px 30px}strong{font-weight:bold}</style></head><body><h1>Procuração para Emissão de Guia de ITBI</h1><p><strong>OUTORGANTE:</strong> {{nome_outorgante}}, {{nacionalidade_outorgante}}, {{estado_civil_outorgante}}, {{profissao_outorgante}}, portador(a) do documento de identidade {{rg_outorgante}} e inscrito(a) no CPF/CNPJ sob o nº {{cpf_cnpj_outorgante}}, residente e domiciliado(a) em {{endereco_outorgante}}.</p><p><strong>OUTORGADO:</strong> {{nome_outorgado}}, brasileiro, inscrito no CPF/CNPJ sob o nº {{cpf_cnpj_outorgado}}, com endereço profissional em {{endereco_outorgado}}.</p><p><strong>PODERES:</strong> O(a) Outorgante confere ao(à) Outorgado(a) poderes específicos para, em seu nome e por sua conta, praticar todos os atos necessários à emissão da Guia de ITBI - Imposto sobre Transmissão de Bens Imóveis, junto à Prefeitura Municipal de {{municipio_imovel}}, referente ao imóvel localizado em {{endereco_imovel}}, inscrição municipal/IPTU nº {{inscricao_iptu}}, matrícula nº {{numero_matricula}}, podendo para tanto:</p><ul><li>Preencher, protocolar e retirar guias, formulários e documentos;</li><li>Apresentar declarações, representar o(a) Outorgante perante órgãos municipais;</li><li>Requerer segundas vias, correções e retificações;</li><li>Assinar toda documentação necessária ao cumprimento do presente mandato;</li><li>Praticar todos os demais atos necessários ao fiel cumprimento deste instrumento.</li></ul><p>{{cidade_assinatura}}, {{data_assinatura}}.</p><div class="signature"><div class="signature-line">{{nome_outorgante}}<br>Outorgante</div></div></body></html>',
  '{
    "nome_outorgante": { "label": "Nome do Outorgante", "required": true },
    "nacionalidade_outorgante": { "label": "Nacionalidade", "default": "brasileiro(a)" },
    "estado_civil_outorgante": { "label": "Estado Civil", "required": true },
    "profissao_outorgante": { "label": "Profissão", "required": false },
    "rg_outorgante": { "label": "RG ou CNH", "required": false },
    "cpf_cnpj_outorgante": { "label": "CPF/CNPJ", "required": true },
    "endereco_outorgante": { "label": "Endereço", "required": true },
    "nome_outorgado": { "label": "Nome do Outorgado", "default": "Clemente Assessoria" },
    "cpf_cnpj_outorgado": { "label": "CNPJ do Outorgado", "default": "" },
    "endereco_outorgado": { "label": "Endereço do Outorgado", "default": "" },
    "municipio_imovel": { "label": "Município do Imóvel", "default": "Juiz de Fora/MG" },
    "endereco_imovel": { "label": "Endereço do Imóvel", "required": true },
    "inscricao_iptu": { "label": "Inscrição IPTU", "required": true },
    "numero_matricula": { "label": "Nº da Matrícula", "required": false },
    "cidade_assinatura": { "label": "Cidade de Assinatura", "default": "Juiz de Fora/MG" },
    "data_assinatura": { "label": "Data (auto preenchido)", "auto": "today" }
  }'::jsonb,
  true
);
