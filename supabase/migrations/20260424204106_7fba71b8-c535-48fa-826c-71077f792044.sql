-- 1. Adiciona coluna para valor final do cálculo no serviço
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS valor_calculo_final numeric;

-- 2. Remove tabela de cálculos (estava vazia)
DROP TABLE IF EXISTS public.calculos;

-- 3. Remove enum exclusivo do módulo removido
DROP TYPE IF EXISTS public.calculo_tipo;