-- 1) Enum: categoria da etapa (agrupamento Active / Done / Closed)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'service_stage_category') THEN
    CREATE TYPE public.service_stage_category AS ENUM ('active', 'done', 'closed');
  END IF;
END$$;

-- 2) Tabela de etapas configuráveis
CREATE TABLE IF NOT EXISTS public.service_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_servico public.service_type NOT NULL,
  name text NOT NULL,
  description text,
  color text NOT NULL DEFAULT '#64748b',
  category public.service_stage_category NOT NULL DEFAULT 'active',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT service_stages_unique_name_per_type UNIQUE (tipo_servico, name)
);

CREATE INDEX IF NOT EXISTS idx_service_stages_tipo ON public.service_stages(tipo_servico, display_order);
CREATE INDEX IF NOT EXISTS idx_service_stages_active ON public.service_stages(is_active);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_service_stages_updated_at ON public.service_stages;
CREATE TRIGGER trg_service_stages_updated_at
BEFORE UPDATE ON public.service_stages
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- created_by trigger
DROP TRIGGER IF EXISTS trg_service_stages_created_by ON public.service_stages;
CREATE TRIGGER trg_service_stages_created_by
BEFORE INSERT ON public.service_stages
FOR EACH ROW EXECUTE FUNCTION public.set_created_by();

-- RLS
ALTER TABLE public.service_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view service_stages"
  ON public.service_stages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin/manager insert service_stages"
  ON public.service_stages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager update service_stages"
  ON public.service_stages FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin delete service_stages"
  ON public.service_stages FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3) Coluna em services apontando para a etapa dinâmica
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS service_stage_id uuid REFERENCES public.service_stages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_services_service_stage_id ON public.services(service_stage_id);

-- 4) Seed das etapas iniciais para "escritura"
--    Cores em HSL-friendly hex (mantemos hex no banco; UI converte conforme tema)
INSERT INTO public.service_stages (tipo_servico, name, description, color, category, display_order)
VALUES
  ('escritura', 'Entrada',       'Cadastro inicial e triagem do serviço',                        '#64748b', 'active', 10),
  ('escritura', 'Documentação',  'Coleta de documentos pessoais e do imóvel',                    '#0ea5e9', 'active', 20),
  ('escritura', 'ITBI',          'Lançamento e pagamento do ITBI na prefeitura',                 '#f59e0b', 'active', 30),
  ('escritura', 'Certidões',     'Solicitação e acompanhamento de certidões',                    '#a855f7', 'active', 40),
  ('escritura', 'Minuta',        'Elaboração da minuta da escritura',                            '#6366f1', 'active', 50),
  ('escritura', 'Revisão',       'Revisão interna e ajustes finais antes da assinatura',         '#ec4899', 'active', 60),
  ('escritura', 'Assinatura',    'Coleta de assinaturas no cartório / ClickSign',                '#14b8a6', 'active', 70),
  ('escritura', 'Registro',      'Registro da escritura no Cartório de Registro de Imóveis',     '#2563eb', 'done',   80),
  ('escritura', 'Concluído',     'Serviço finalizado e entregue ao cliente',                     '#16a34a', 'closed', 90)
ON CONFLICT (tipo_servico, name) DO NOTHING;

-- 5) Mapear serviços de escritura existentes para a etapa equivalente
--    Mapeamento: enum service_stage -> nome da etapa cadastrada
UPDATE public.services s
SET service_stage_id = ss.id
FROM public.service_stages ss
WHERE s.type = 'escritura'
  AND s.service_stage_id IS NULL
  AND ss.tipo_servico = 'escritura'
  AND ss.name = CASE s.stage
    WHEN 'entrada'      THEN 'Entrada'
    WHEN 'documentacao' THEN 'Documentação'
    WHEN 'analise'      THEN 'Certidões'
    WHEN 'execucao'     THEN 'Minuta'
    WHEN 'revisao'      THEN 'Revisão'
    WHEN 'concluido'    THEN 'Concluído'
  END;

-- 6) Validação de integridade: só "escritura" pode usar etapa dinâmica,
--    e a etapa precisa ser do mesmo tipo do serviço.
CREATE OR REPLACE FUNCTION public.validate_service_stage_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stage_tipo public.service_type;
BEGIN
  IF NEW.service_stage_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tipo_servico INTO v_stage_tipo
  FROM public.service_stages
  WHERE id = NEW.service_stage_id;

  IF v_stage_tipo IS NULL THEN
    RAISE EXCEPTION 'Etapa dinâmica % não existe', NEW.service_stage_id;
  END IF;

  IF v_stage_tipo <> NEW.type THEN
    RAISE EXCEPTION 'Etapa dinâmica pertence ao tipo % e não pode ser usada em um serviço do tipo %',
      v_stage_tipo, NEW.type;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_service_stage_consistency ON public.services;
CREATE TRIGGER trg_validate_service_stage_consistency
BEFORE INSERT OR UPDATE OF service_stage_id, type ON public.services
FOR EACH ROW EXECUTE FUNCTION public.validate_service_stage_consistency();