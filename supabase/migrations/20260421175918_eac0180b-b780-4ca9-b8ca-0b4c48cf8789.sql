-- Enum dos tipos de cálculo
CREATE TYPE public.calculo_tipo AS ENUM (
  'valor_venal',
  'escritura',
  'doacao',
  'correcao_incc',
  'financiamento_caixa',
  'financiamento_privado',
  'regularizacao'
);

-- Tabela principal de cálculos
CREATE TABLE public.calculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  tipo public.calculo_tipo NOT NULL,
  subtipo text,
  inscricao text,
  endereco text,
  valor_base numeric,
  valor_total numeric,
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX calculos_user_id_idx ON public.calculos(user_id);
CREATE INDEX calculos_service_id_idx ON public.calculos(service_id);
CREATE INDEX calculos_client_id_idx ON public.calculos(client_id);
CREATE INDEX calculos_tipo_idx ON public.calculos(tipo);
CREATE INDEX calculos_created_at_idx ON public.calculos(created_at DESC);

-- RLS
ALTER TABLE public.calculos ENABLE ROW LEVEL SECURITY;

-- Admin/Gerente veem todos; Colaborador vê só os próprios
CREATE POLICY "View calculos by role"
  ON public.calculos FOR SELECT
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR user_id = auth.uid()
  );

-- Qualquer autenticado cria os próprios
CREATE POLICY "Insert own calculos"
  ON public.calculos FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin/Gerente atualizam qualquer; Colaborador só os próprios
CREATE POLICY "Update calculos by role"
  ON public.calculos FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_or_manager(auth.uid())
    OR user_id = auth.uid()
  )
  WITH CHECK (
    public.is_admin_or_manager(auth.uid())
    OR user_id = auth.uid()
  );

-- Só admin apaga
CREATE POLICY "Admin delete calculos"
  ON public.calculos FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Trigger updated_at (reutiliza função existente)
CREATE TRIGGER calculos_set_updated_at
  BEFORE UPDATE ON public.calculos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();