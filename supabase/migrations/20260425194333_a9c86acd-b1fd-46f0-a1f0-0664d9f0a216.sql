-- ============================================================
-- 1) NOTIFICATIONS: dismissed_at + category
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'sistema';

CREATE INDEX IF NOT EXISTS idx_notifications_user_dismissed
  ON public.notifications (user_id, dismissed_at);

CREATE INDEX IF NOT EXISTS idx_notifications_category
  ON public.notifications (category);

-- ============================================================
-- 2) CALENDAR EVENTS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.calendar_event_type AS ENUM (
    'vencimento_certidao',
    'assinatura_prevista',
    'assinatura_realizada',
    'atendimento_cliente',
    'prazo_servico',
    'reuniao',
    'outro'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.calendar_event_source AS ENUM ('manual', 'auto');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_type public.calendar_event_type NOT NULL DEFAULT 'outro',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  source public.calendar_event_source NOT NULL DEFAULT 'manual',
  source_ref TEXT,
  color TEXT,
  location TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_start_at ON public.calendar_events (start_at);
CREATE INDEX IF NOT EXISTS idx_calendar_events_service ON public.calendar_events (service_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_owner ON public.calendar_events (owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_events_source_unique
  ON public.calendar_events (source_ref) WHERE source = 'auto' AND source_ref IS NOT NULL;

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated view calendar_events" ON public.calendar_events;
CREATE POLICY "Authenticated view calendar_events"
  ON public.calendar_events FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff insert calendar_events" ON public.calendar_events;
CREATE POLICY "Staff insert calendar_events"
  ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'administrador'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'colaborador'::app_role)
  );

DROP POLICY IF EXISTS "Staff update calendar_events" ON public.calendar_events;
CREATE POLICY "Staff update calendar_events"
  ON public.calendar_events FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'administrador'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'colaborador'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'administrador'::app_role)
    OR has_role(auth.uid(), 'gerente'::app_role)
    OR has_role(auth.uid(), 'colaborador'::app_role)
  );

DROP POLICY IF EXISTS "Owner or admin delete calendar_events" ON public.calendar_events;
CREATE POLICY "Owner or admin delete calendar_events"
  ON public.calendar_events FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_admin_or_manager(auth.uid()));

DROP TRIGGER IF EXISTS trg_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_calendar_events_set_created_by ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_set_created_by
  BEFORE INSERT ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- ============================================================
-- 3) AUTO-NOTIFICATIONS: stage change, assignment, due date
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_service_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user UUID;
  v_actor UUID := auth.uid();
BEGIN
  -- Stage change
  IF TG_OP = 'UPDATE' AND NEW.stage IS DISTINCT FROM OLD.stage THEN
    v_target_user := COALESCE(NEW.assigned_to, NEW.created_by);
    IF v_target_user IS NOT NULL AND v_target_user <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id, category)
      VALUES (
        v_target_user,
        'info'::notification_type,
        'Etapa do serviço alterada',
        'O serviço "' || NEW.subject || '" passou para a etapa: ' || NEW.stage,
        '/servicos',
        'service',
        NEW.id,
        'tarefa'
      );
    END IF;
  END IF;

  -- Assignment change
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    IF NEW.assigned_to <> COALESCE(v_actor, '00000000-0000-0000-0000-000000000000'::uuid) THEN
      INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id, category)
      VALUES (
        NEW.assigned_to,
        'info'::notification_type,
        'Novo serviço atribuído a você',
        'Você foi atribuído ao serviço "' || NEW.subject || '"',
        '/servicos',
        'service',
        NEW.id,
        'tarefa'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_service_changes ON public.services;
CREATE TRIGGER trg_notify_service_changes
  AFTER UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.notify_service_changes();

-- Extend check_document_expirations to include service due_date proximity
CREATE OR REPLACE FUNCTION public.check_document_expirations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.service_civil_certificates
    SET status = 'vencida'
    WHERE expiration_date < CURRENT_DATE AND status = 'emitida';

  UPDATE public.service_internet_certificates
    SET status = 'vencida'
    WHERE expected_validity_date < CURRENT_DATE AND status = 'emitida';

  UPDATE public.service_property_registration
    SET status = 'vencida'
    WHERE expiration_date < CURRENT_DATE AND status = 'liberada';

  INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id, category)
  SELECT
    s.created_by,
    'warning'::notification_type,
    'Certidão pessoal vence em breve',
    'Certidão (' || sc.certificate_type || ') vence em ' || (sc.expiration_date - CURRENT_DATE) || ' dias',
    '/servicos',
    'civil_certificate',
    sc.id,
    'agenda'
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

  INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id, category)
  SELECT
    s.created_by,
    'warning'::notification_type,
    'Certidão de internet vence em breve',
    'Certidão (' || ic.certificate_type || ') vence em ' || (ic.expected_validity_date - CURRENT_DATE) || ' dias',
    '/servicos',
    'internet_certificate',
    ic.id,
    'agenda'
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

  INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id, category)
  SELECT
    s.created_by,
    'warning'::notification_type,
    'Matrícula do imóvel vence em breve',
    'Matrícula vence em ' || (pr.expiration_date - CURRENT_DATE) || ' dias',
    '/servicos',
    'property_registration',
    pr.id,
    'agenda'
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

  -- NEW: service due_date proximity (5 days)
  INSERT INTO public.notifications (user_id, type, title, description, link, related_entity_type, related_entity_id, category)
  SELECT
    COALESCE(s.assigned_to, s.created_by),
    'warning'::notification_type,
    'Prazo do serviço se aproxima',
    'O serviço "' || s.subject || '" vence em ' || (s.due_date - CURRENT_DATE) || ' dias',
    '/servicos',
    'service',
    s.id,
    'tarefa'
  FROM public.services s
  WHERE s.due_date IS NOT NULL
    AND s.due_date - CURRENT_DATE BETWEEN 1 AND 5
    AND s.stage <> 'concluido'
    AND COALESCE(s.assigned_to, s.created_by) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications n
      WHERE n.related_entity_id = s.id
        AND n.related_entity_type = 'service'
        AND n.title = 'Prazo do serviço se aproxima'
        AND n.created_at > CURRENT_DATE - INTERVAL '3 days'
    );
END;
$$;