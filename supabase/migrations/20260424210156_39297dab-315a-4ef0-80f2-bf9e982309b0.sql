-- Limpa valores Infosimples nas 5 linhas existentes de service_internet_certificates
UPDATE public.service_internet_certificates
SET
  infosimples_request_id = NULL,
  classification = NULL,
  validation_status = NULL,
  gemini_validation_result = NULL;

-- Dropa colunas exclusivas do Infosimples (mantém auto_emitted como flag genérica)
ALTER TABLE public.service_internet_certificates
  DROP COLUMN IF EXISTS infosimples_request_id,
  DROP COLUMN IF EXISTS classification,
  DROP COLUMN IF EXISTS validation_status,
  DROP COLUMN IF EXISTS gemini_validation_result;

-- Dropa tabelas exclusivas
DROP TABLE IF EXISTS public.infosimples_requests CASCADE;
DROP TABLE IF EXISTS public.infosimples_usage_stats CASCADE;

-- Dropa enums exclusivos (já sem referências após DROP COLUMN acima)
DROP TYPE IF EXISTS public.infosimples_consultation_type;
DROP TYPE IF EXISTS public.infosimples_request_status;
DROP TYPE IF EXISTS public.infosimples_certificate_result;
DROP TYPE IF EXISTS public.infosimples_validation_status;