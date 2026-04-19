-- Campos de arquivo anexado em certidões de internet
ALTER TABLE public.service_internet_certificates
  ADD COLUMN IF NOT EXISTS drive_file_id text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS file_uploaded_by uuid;

-- Campos de arquivo anexado em matrícula do imóvel
ALTER TABLE public.service_property_registration
  ADD COLUMN IF NOT EXISTS drive_file_id text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS file_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS file_uploaded_by uuid;