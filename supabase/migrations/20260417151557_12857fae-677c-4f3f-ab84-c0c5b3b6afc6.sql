-- Tighten DELETE on public.finance_entries:
-- admin: always; gerente: only entries created less than 30 days ago.
DROP POLICY IF EXISTS "Admin/manager delete finance" ON public.finance_entries;

CREATE POLICY "Admin or recent-manager delete finance"
ON public.finance_entries
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'administrador')
  OR (
    public.has_role(auth.uid(), 'gerente')
    AND created_at > (now() - interval '30 days')
  )
);