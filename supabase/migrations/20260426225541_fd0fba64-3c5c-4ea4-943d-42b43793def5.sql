
-- Add protocol, verification code, and email columns to services
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS protocolo TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS codigo_verificador TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_email TEXT,
  ADD COLUMN IF NOT EXISTS solicitante_nome TEXT;

-- Index for fast public lookup
CREATE INDEX IF NOT EXISTS idx_services_protocolo ON public.services(protocolo);

-- Table for status history
CREATE TABLE IF NOT EXISTS public.service_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  stage public.service_stage NOT NULL,
  descricao TEXT,
  data_alteracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES public.profiles(id),
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_status_history_service ON public.service_status_history(service_id, data_alteracao DESC);

ALTER TABLE public.service_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view status history"
  ON public.service_status_history FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Staff insert status history"
  ON public.service_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'administrador'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'colaborador'::app_role)
  );

CREATE POLICY "Admin/manager delete status history"
  ON public.service_status_history FOR DELETE
  TO authenticated USING (is_admin_or_manager(auth.uid()));

-- Function to generate unique protocol: CLM-YYYY-NNNNNN
CREATE OR REPLACE FUNCTION public.generate_protocolo()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq TEXT;
  v_protocolo TEXT;
  v_attempts INT := 0;
BEGIN
  v_year := to_char(now(), 'YYYY');
  LOOP
    v_seq := lpad((floor(random() * 1000000))::int::text, 6, '0');
    v_protocolo := 'CLM-' || v_year || '-' || v_seq;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.services WHERE protocolo = v_protocolo);
    v_attempts := v_attempts + 1;
    IF v_attempts > 50 THEN
      RAISE EXCEPTION 'Não foi possível gerar protocolo único';
    END IF;
  END LOOP;
  RETURN v_protocolo;
END;
$$;

-- Function to generate verification code (8 alphanumeric uppercase)
CREATE OR REPLACE FUNCTION public.generate_codigo_verificador()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, (floor(random() * length(chars)) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Trigger: auto-assign protocol/codigo for NEW services only (skip if stage=concluido)
CREATE OR REPLACE FUNCTION public.assign_service_protocolo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.protocolo IS NULL AND NEW.stage <> 'concluido' THEN
    NEW.protocolo := public.generate_protocolo();
  END IF;
  IF NEW.codigo_verificador IS NULL AND NEW.stage <> 'concluido' THEN
    NEW.codigo_verificador := public.generate_codigo_verificador();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_service_protocolo ON public.services;
CREATE TRIGGER trg_assign_service_protocolo
  BEFORE INSERT ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.assign_service_protocolo();

-- Trigger: log stage changes into history
CREATE OR REPLACE FUNCTION public.log_service_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.service_status_history (service_id, stage, descricao, changed_by)
    VALUES (NEW.id, NEW.stage, 'Serviço cadastrado', auth.uid());
  ELSIF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.service_status_history (service_id, stage, descricao, changed_by)
    VALUES (NEW.id, NEW.stage, 'Etapa alterada para ' || NEW.stage, auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_service_stage_change ON public.services;
CREATE TRIGGER trg_log_service_stage_change
  AFTER INSERT OR UPDATE OF stage ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.log_service_stage_change();
