-- =========================
-- NOTIFICATIONS
-- =========================
CREATE TYPE public.notification_type AS ENUM ('critical', 'warning', 'info', 'success');

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'info',
  title text NOT NULL,
  description text,
  link text,
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own notifications"
  ON public.notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Authenticated insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- =========================
-- AUDIT LOG
-- =========================
CREATE TYPE public.audit_action AS ENUM ('create', 'update', 'delete', 'login', 'logout');

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email text,
  action public.audit_action NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_resource ON public.audit_log(resource_type, resource_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view audit log"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated insert audit log"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Generic trigger to log changes
CREATE OR REPLACE FUNCTION public.log_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action public.audit_action;
  v_resource_id uuid;
  v_payload jsonb;
  v_email text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_resource_id := (to_jsonb(NEW)->>'id')::uuid;
    v_payload := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_resource_id := (to_jsonb(NEW)->>'id')::uuid;
    v_payload := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_resource_id := (to_jsonb(OLD)->>'id')::uuid;
    v_payload := to_jsonb(OLD);
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = auth.uid();

  INSERT INTO public.audit_log (user_id, user_email, action, resource_type, resource_id, payload)
  VALUES (auth.uid(), v_email, v_action, TG_TABLE_NAME, v_resource_id, v_payload);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER audit_services
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER audit_finance_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_table_change();

-- =========================
-- USER PREFERENCES
-- =========================
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'light',
  language text NOT NULL DEFAULT 'pt-BR',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  email_daily_digest boolean NOT NULL DEFAULT false,
  email_overdue_alerts boolean NOT NULL DEFAULT true,
  email_followup_reminders boolean NOT NULL DEFAULT true,
  email_new_assignments boolean NOT NULL DEFAULT true,
  monthly_revenue_goal numeric,
  recent_searches jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();