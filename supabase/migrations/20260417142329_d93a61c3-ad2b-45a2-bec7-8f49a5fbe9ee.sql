
-- ============================================================
-- 1. Triggers para preencher created_by automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_created_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clients_set_created_by ON public.clients;
CREATE TRIGGER clients_set_created_by
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

DROP TRIGGER IF EXISTS services_set_created_by ON public.services;
CREATE TRIGGER services_set_created_by
BEFORE INSERT ON public.services
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

DROP TRIGGER IF EXISTS finance_set_created_by ON public.finance_entries;
CREATE TRIGGER finance_set_created_by
BEFORE INSERT ON public.finance_entries
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

DROP TRIGGER IF EXISTS client_contacts_set_created_by ON public.client_contacts;
CREATE TRIGGER client_contacts_set_created_by
BEFORE INSERT ON public.client_contacts
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- ============================================================
-- 2. CLIENTS - drop existing & recreate with role-based checks
-- ============================================================
DROP POLICY IF EXISTS "Admin/manager can delete clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated can view clients" ON public.clients;

CREATE POLICY "Authenticated can view clients"
ON public.clients FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff can insert clients"
ON public.clients FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrador')
  OR has_role(auth.uid(), 'gerente')
  OR has_role(auth.uid(), 'colaborador')
);

CREATE POLICY "Staff can update clients"
ON public.clients FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'administrador')
  OR has_role(auth.uid(), 'gerente')
  OR has_role(auth.uid(), 'colaborador')
)
WITH CHECK (
  has_role(auth.uid(), 'administrador')
  OR has_role(auth.uid(), 'gerente')
  OR has_role(auth.uid(), 'colaborador')
);

CREATE POLICY "Admin and manager can delete clients"
ON public.clients FOR DELETE TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- ============================================================
-- 3. SERVICES
-- ============================================================
DROP POLICY IF EXISTS "Admin/manager delete services" ON public.services;
DROP POLICY IF EXISTS "Authenticated insert services" ON public.services;
DROP POLICY IF EXISTS "Authenticated update services" ON public.services;
DROP POLICY IF EXISTS "Authenticated view services" ON public.services;

CREATE POLICY "Authenticated view services"
ON public.services FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff can insert services"
ON public.services FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'administrador')
  OR has_role(auth.uid(), 'gerente')
  OR has_role(auth.uid(), 'colaborador')
);

CREATE POLICY "Staff can update services"
ON public.services FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'administrador')
  OR has_role(auth.uid(), 'gerente')
  OR has_role(auth.uid(), 'colaborador')
)
WITH CHECK (
  has_role(auth.uid(), 'administrador')
  OR has_role(auth.uid(), 'gerente')
  OR has_role(auth.uid(), 'colaborador')
);

CREATE POLICY "Admin and manager delete services"
ON public.services FOR DELETE TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- ============================================================
-- 4. FINANCE_ENTRIES - colaborador apenas SELECT
-- ============================================================
DROP POLICY IF EXISTS "Admin/manager delete finance" ON public.finance_entries;
DROP POLICY IF EXISTS "Admin/manager insert finance" ON public.finance_entries;
DROP POLICY IF EXISTS "Admin/manager update finance" ON public.finance_entries;
DROP POLICY IF EXISTS "Authenticated view finance" ON public.finance_entries;

CREATE POLICY "Authenticated view finance"
ON public.finance_entries FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admin/manager insert finance"
ON public.finance_entries FOR INSERT TO authenticated
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager update finance"
ON public.finance_entries FOR UPDATE TO authenticated
USING (is_admin_or_manager(auth.uid()))
WITH CHECK (is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager delete finance"
ON public.finance_entries FOR DELETE TO authenticated
USING (is_admin_or_manager(auth.uid()));

-- ============================================================
-- 5. CLIENT_CONTACTS - already correct, ensure baseline
-- ============================================================
DROP POLICY IF EXISTS "Authenticated insert client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Authenticated view client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Creator or admin delete client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Creator or admin update client_contacts" ON public.client_contacts;

CREATE POLICY "Authenticated view client_contacts"
ON public.client_contacts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated insert client_contacts"
ON public.client_contacts FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Creator or admin update client_contacts"
ON public.client_contacts FOR UPDATE TO authenticated
USING ((created_by = auth.uid()) OR is_admin_or_manager(auth.uid()))
WITH CHECK ((created_by = auth.uid()) OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Creator or admin delete client_contacts"
ON public.client_contacts FOR DELETE TO authenticated
USING ((created_by = auth.uid()) OR is_admin_or_manager(auth.uid()));
