-- Enum for contact channels
CREATE TYPE public.contact_channel AS ENUM ('whatsapp', 'telefone', 'email', 'presencial', 'outros');

-- Table to track per-client contact history (timeline)
CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_date timestamptz NOT NULL DEFAULT now(),
  channel public.contact_channel NOT NULL DEFAULT 'whatsapp',
  description text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_client_contacts_date ON public.client_contacts(contact_date DESC);

ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated view client_contacts"
  ON public.client_contacts FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create their own contact entries
CREATE POLICY "Authenticated insert client_contacts"
  ON public.client_contacts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND (created_by = auth.uid() OR created_by IS NULL));

-- Creator OR admin/manager can update
CREATE POLICY "Creator or admin update client_contacts"
  ON public.client_contacts FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));

-- Creator OR admin/manager can delete
CREATE POLICY "Creator or admin delete client_contacts"
  ON public.client_contacts FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));