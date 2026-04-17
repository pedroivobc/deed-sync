
-- ============= ENUMS =============
CREATE TYPE public.party_role AS ENUM (
  'comprador','vendedor','socio_comprador','socio_vendedor',
  'outorgante','outorgado','interveniente','outros'
);

CREATE TYPE public.party_person_type AS ENUM ('PF','PJ');

CREATE TYPE public.signature_mode AS ENUM ('online','presencial','hibrida');

CREATE TYPE public.civil_certificate_type AS ENUM (
  'estado_civil','simplificada_junta','contrato_social',
  'alteracao_consolidada','ultima_alteracao'
);

CREATE TYPE public.civil_certificate_status AS ENUM (
  'pendente','solicitada','emitida','vencida','cancelada'
);

CREATE TYPE public.internet_certificate_type AS ENUM (
  'tjmg_civel','trf6_fisico','trf6_eproc','tst','trt3','receita_federal','outra'
);

CREATE TYPE public.internet_certificate_status AS ENUM (
  'pendente','solicitada','emitida','vencida','cancelada'
);

CREATE TYPE public.itbi_status AS ENUM (
  'nao_iniciado','protocolado','pendente_doc','emitido'
);

CREATE TYPE public.property_registration_type AS ENUM (
  'inteiro_teor','onus_reais','transcricao','somente_onus_reais'
);

CREATE TYPE public.property_registration_status AS ENUM (
  'pendente','solicitada','liberada','vencida'
);

-- ============= service_parties =============
CREATE TABLE public.service_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  role public.party_role NOT NULL,
  person_type public.party_person_type NOT NULL DEFAULT 'PF',
  name text NOT NULL,
  cpf_cnpj text,
  rg text,
  cnh text,
  email text,
  phone text,
  profession text,
  address text,
  marital_status text,
  nationality text DEFAULT 'Brasileira',
  signature_mode public.signature_mode NOT NULL DEFAULT 'presencial',
  has_digital_certificate boolean,
  company_state text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_service_parties_service ON public.service_parties(service_id);
ALTER TABLE public.service_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view parties" ON public.service_parties
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert parties" ON public.service_parties
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Staff update parties" ON public.service_parties
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  ) WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Admin/manager delete parties" ON public.service_parties
  FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_parties_updated_at BEFORE UPDATE ON public.service_parties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= service_civil_certificates =============
CREATE TABLE public.service_civil_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES public.service_parties(id) ON DELETE CASCADE,
  certificate_type public.civil_certificate_type NOT NULL,
  request_date date,
  issued_date date,
  initial_payment numeric(10,2),
  complementary_payment numeric(10,2),
  total_paid numeric(10,2) GENERATED ALWAYS AS (
    COALESCE(initial_payment,0) + COALESCE(complementary_payment,0)
  ) STORED,
  is_issued boolean NOT NULL DEFAULT false,
  status public.civil_certificate_status NOT NULL DEFAULT 'pendente',
  validity_days int NOT NULL DEFAULT 30,
  expiration_date date,
  file_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_civil_cert_service ON public.service_civil_certificates(service_id);
CREATE INDEX idx_civil_cert_party ON public.service_civil_certificates(party_id);
CREATE INDEX idx_civil_cert_expiration ON public.service_civil_certificates(expiration_date) WHERE status = 'emitida';

ALTER TABLE public.service_civil_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view civil_certs" ON public.service_civil_certificates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert civil_certs" ON public.service_civil_certificates
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Staff update civil_certs" ON public.service_civil_certificates
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  ) WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Admin/manager delete civil_certs" ON public.service_civil_certificates
  FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_civil_cert_updated_at BEFORE UPDATE ON public.service_civil_certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger para validity_days e expiration_date automáticos
CREATE OR REPLACE FUNCTION public.compute_civil_certificate_validity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.certificate_type = 'estado_civil' THEN
    NEW.validity_days := 90;
  ELSE
    NEW.validity_days := 30;
  END IF;

  IF NEW.issued_date IS NOT NULL THEN
    NEW.expiration_date := NEW.issued_date + NEW.validity_days;
  ELSE
    NEW.expiration_date := NULL;
  END IF;

  -- Auto-marca status emitida se is_issued true e issued_date presente
  IF NEW.is_issued = true AND NEW.issued_date IS NOT NULL AND NEW.status NOT IN ('vencida','cancelada') THEN
    NEW.status := 'emitida';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_civil_cert_validity
  BEFORE INSERT OR UPDATE ON public.service_civil_certificates
  FOR EACH ROW EXECUTE FUNCTION public.compute_civil_certificate_validity();

-- ============= service_internet_certificates =============
CREATE TABLE public.service_internet_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  party_id uuid REFERENCES public.service_parties(id) ON DELETE SET NULL,
  certificate_type public.internet_certificate_type NOT NULL,
  custom_name text,
  issuer_url text,
  comarca text,
  state text DEFAULT 'MG',
  request_date date,
  expected_validity_date date,
  issued_date date,
  status public.internet_certificate_status NOT NULL DEFAULT 'pendente',
  protocol_number text,
  file_url text,
  infosimples_request_id text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_inet_cert_service ON public.service_internet_certificates(service_id);
CREATE INDEX idx_inet_cert_validity ON public.service_internet_certificates(expected_validity_date) WHERE status = 'emitida';

ALTER TABLE public.service_internet_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view inet_certs" ON public.service_internet_certificates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert inet_certs" ON public.service_internet_certificates
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Staff update inet_certs" ON public.service_internet_certificates
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  ) WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Admin/manager delete inet_certs" ON public.service_internet_certificates
  FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_inet_cert_updated_at BEFORE UPDATE ON public.service_internet_certificates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger para expected_validity_date e issuer_url default
CREATE OR REPLACE FUNCTION public.compute_internet_certificate_validity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.request_date IS NOT NULL THEN
    NEW.expected_validity_date := NEW.request_date + 30;
  END IF;

  -- Pré-popula URL padrão quando não customizada
  IF NEW.issuer_url IS NULL OR NEW.issuer_url = '' THEN
    NEW.issuer_url := CASE NEW.certificate_type
      WHEN 'tjmg_civel' THEN 'https://rupe.tjmg.jus.br/rupe/justica/publico/certidoes/criarSolicitacaoCertidao.rupe?solicitacaoPublica=true'
      WHEN 'trf6_fisico' THEN 'https://sistemas.trf6.jus.br/certidao/#/solicitacao'
      WHEN 'trf6_eproc' THEN 'https://portal.trf6.jus.br/certidao-online7/'
      WHEN 'tst' THEN 'https://www.tst.jus.br/certidao1'
      WHEN 'trt3' THEN 'https://certidao.trt3.jus.br/certidao/feitosTrabalhistas/aba1.emissao.htm'
      WHEN 'receita_federal' THEN 'https://servicos.receitafederal.gov.br/servico/certidoes/#/home'
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inet_cert_validity
  BEFORE INSERT OR UPDATE ON public.service_internet_certificates
  FOR EACH ROW EXECUTE FUNCTION public.compute_internet_certificate_validity();

-- ============= service_property_itbi =============
CREATE TABLE public.service_property_itbi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL UNIQUE REFERENCES public.services(id) ON DELETE CASCADE,
  prefecture_url text,
  protocol_number text,
  protocol_date date,
  status public.itbi_status NOT NULL DEFAULT 'nao_iniciado',
  is_issued boolean NOT NULL DEFAULT false,
  itbi_value numeric(12,2),
  issuance_date date,
  payment_date date,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.service_property_itbi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view itbi" ON public.service_property_itbi
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert itbi" ON public.service_property_itbi
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Staff update itbi" ON public.service_property_itbi
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  ) WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Admin/manager delete itbi" ON public.service_property_itbi
  FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_itbi_updated_at BEFORE UPDATE ON public.service_property_itbi
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============= service_property_registration =============
CREATE TABLE public.service_property_registration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  registration_type public.property_registration_type NOT NULL DEFAULT 'inteiro_teor',
  request_date date,
  issued_date date,
  onr_protocol text,
  is_released boolean NOT NULL DEFAULT false,
  amount_paid numeric(10,2),
  expiration_date date,
  status public.property_registration_status NOT NULL DEFAULT 'pendente',
  file_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prop_reg_service ON public.service_property_registration(service_id);
CREATE INDEX idx_prop_reg_expiration ON public.service_property_registration(expiration_date) WHERE status = 'liberada';

ALTER TABLE public.service_property_registration ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view prop_reg" ON public.service_property_registration
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff insert prop_reg" ON public.service_property_registration
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Staff update prop_reg" ON public.service_property_registration
  FOR UPDATE TO authenticated USING (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  ) WITH CHECK (
    has_role(auth.uid(),'administrador') OR has_role(auth.uid(),'gerente') OR has_role(auth.uid(),'colaborador')
  );
CREATE POLICY "Admin/manager delete prop_reg" ON public.service_property_registration
  FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid()));

CREATE TRIGGER trg_prop_reg_updated_at BEFORE UPDATE ON public.service_property_registration
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger para expiration_date e auto-status
CREATE OR REPLACE FUNCTION public.compute_property_registration_validity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.issued_date IS NOT NULL THEN
    NEW.expiration_date := NEW.issued_date + 30;
  END IF;
  IF NEW.is_released = true AND NEW.issued_date IS NOT NULL AND NEW.status NOT IN ('vencida') THEN
    NEW.status := 'liberada';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prop_reg_validity
  BEFORE INSERT OR UPDATE ON public.service_property_registration
  FOR EACH ROW EXECUTE FUNCTION public.compute_property_registration_validity();

-- ============= service_reminders =============
CREATE TABLE public.service_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  expiration_date date NOT NULL,
  reminder_date date NOT NULL,
  is_sent boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_reminders_service ON public.service_reminders(service_id);
CREATE INDEX idx_reminders_pending ON public.service_reminders(reminder_date) WHERE is_sent = false AND is_dismissed = false;

ALTER TABLE public.service_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view reminders" ON public.service_reminders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert reminders" ON public.service_reminders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated update reminders" ON public.service_reminders
  FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin/manager delete reminders" ON public.service_reminders
  FOR DELETE TO authenticated USING (is_admin_or_manager(auth.uid()));

-- ============= Função de checagem diária =============
CREATE OR REPLACE FUNCTION public.check_document_expirations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Marca vencidas
  UPDATE public.service_civil_certificates
    SET status = 'vencida'
    WHERE expiration_date < CURRENT_DATE AND status = 'emitida';

  UPDATE public.service_internet_certificates
    SET status = 'vencida'
    WHERE expected_validity_date < CURRENT_DATE AND status = 'emitida';

  UPDATE public.service_property_registration
    SET status = 'vencida'
    WHERE expiration_date < CURRENT_DATE AND status = 'liberada';

  -- Notificações para certidões pessoais vencendo em 7 dias
  INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id)
  SELECT
    s.created_by,
    'warning'::notification_type,
    'Certidão pessoal vence em breve',
    'Certidão (' || sc.certificate_type || ') vence em ' || (sc.expiration_date - CURRENT_DATE) || ' dias',
    '/servicos',
    'civil_certificate',
    sc.id
  FROM public.service_civil_certificates sc
  JOIN public.services s ON s.id = sc.service_id
  WHERE sc.expiration_date - CURRENT_DATE BETWEEN 1 AND 7
    AND sc.status = 'emitida'
    AND s.created_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_entity_id = sc.id
        AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    );

  -- Notificações certidões internet
  INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id)
  SELECT
    s.created_by,
    'warning'::notification_type,
    'Certidão de internet vence em breve',
    'Certidão (' || ic.certificate_type || ') vence em ' || (ic.expected_validity_date - CURRENT_DATE) || ' dias',
    '/servicos',
    'internet_certificate',
    ic.id
  FROM public.service_internet_certificates ic
  JOIN public.services s ON s.id = ic.service_id
  WHERE ic.expected_validity_date - CURRENT_DATE BETWEEN 1 AND 7
    AND ic.status = 'emitida'
    AND s.created_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_entity_id = ic.id
        AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    );

  -- Notificações matrícula
  INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id)
  SELECT
    s.created_by,
    'warning'::notification_type,
    'Matrícula do imóvel vence em breve',
    'Matrícula vence em ' || (pr.expiration_date - CURRENT_DATE) || ' dias',
    '/servicos',
    'property_registration',
    pr.id
  FROM public.service_property_registration pr
  JOIN public.services s ON s.id = pr.service_id
  WHERE pr.expiration_date - CURRENT_DATE BETWEEN 1 AND 7
    AND pr.status = 'liberada'
    AND s.created_by IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_entity_id = pr.id
        AND n.created_at > CURRENT_DATE - INTERVAL '7 days'
    );
END;
$$;

-- ============= Audit log triggers para novas tabelas =============
CREATE TRIGGER audit_service_parties AFTER INSERT OR UPDATE OR DELETE ON public.service_parties
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
CREATE TRIGGER audit_civil_certs AFTER INSERT OR UPDATE OR DELETE ON public.service_civil_certificates
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
CREATE TRIGGER audit_inet_certs AFTER INSERT OR UPDATE OR DELETE ON public.service_internet_certificates
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
CREATE TRIGGER audit_itbi AFTER INSERT OR UPDATE OR DELETE ON public.service_property_itbi
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
CREATE TRIGGER audit_prop_reg AFTER INSERT OR UPDATE OR DELETE ON public.service_property_registration
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();
