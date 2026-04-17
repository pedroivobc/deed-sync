
-- Allow colaborador to delete only services they created
DROP POLICY IF EXISTS "Admin and manager delete services" ON public.services;

CREATE POLICY "Admin/manager or creator delete services"
ON public.services FOR DELETE TO authenticated
USING (
  is_admin_or_manager(auth.uid()) OR created_by = auth.uid()
);

-- Enable realtime for services table
ALTER TABLE public.services REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
