-- Enums
CREATE TYPE public.drive_entity_type AS ENUM ('service', 'client');
CREATE TYPE public.drive_subfolder_type AS ENUM (
  'root',
  'certidoes_pessoais',
  'certidoes_internet',
  'docs_imovel',
  'contrato',
  'escritura_final',
  'docs_recebidos',
  'docs_gerados',
  'entrega_final',
  'docs_pessoais',
  'historico_servicos',
  'comunicacoes'
);
CREATE TYPE public.drive_ocr_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'not_applicable');
CREATE TYPE public.drive_sync_operation AS ENUM (
  'folder_created',
  'folder_deleted',
  'file_uploaded',
  'file_deleted',
  'ocr_processed',
  'sync_manual',
  'test_connection',
  'error'
);
CREATE TYPE public.drive_sync_status AS ENUM ('success', 'failed', 'partial');

-- drive_folders
CREATE TABLE public.drive_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.drive_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  drive_folder_id text NOT NULL,
  drive_folder_url text NOT NULL,
  folder_path text NOT NULL,
  parent_folder_id text,
  subfolder_type public.drive_subfolder_type NOT NULL DEFAULT 'root',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX drive_folders_entity_subfolder_idx
  ON public.drive_folders (entity_type, entity_id, subfolder_type);
CREATE INDEX drive_folders_entity_idx ON public.drive_folders (entity_type, entity_id);

ALTER TABLE public.drive_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view drive_folders"
  ON public.drive_folders FOR SELECT TO authenticated USING (true);

-- INSERT/UPDATE/DELETE: only service role (edge function) — no policies = no access for authenticated users

CREATE TRIGGER drive_folders_updated_at
  BEFORE UPDATE ON public.drive_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- drive_files
CREATE TABLE public.drive_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id text NOT NULL UNIQUE,
  drive_folder_id text NOT NULL,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  related_entity_type text,
  related_entity_id uuid,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  thumbnail_url text,
  preview_url text,
  download_url text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  ocr_status public.drive_ocr_status NOT NULL DEFAULT 'not_applicable',
  ocr_extracted_data jsonb,
  tags text[],
  notes text
);

CREATE INDEX drive_files_service_idx ON public.drive_files (service_id);
CREATE INDEX drive_files_client_idx ON public.drive_files (client_id);
CREATE INDEX drive_files_related_idx ON public.drive_files (related_entity_type, related_entity_id);

ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view drive_files"
  ON public.drive_files FOR SELECT TO authenticated USING (true);

-- drive_sync_logs
CREATE TABLE public.drive_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation public.drive_sync_operation NOT NULL,
  status public.drive_sync_status NOT NULL,
  entity_type text,
  entity_id uuid,
  drive_resource_id text,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX drive_sync_logs_created_idx ON public.drive_sync_logs (created_at DESC);
CREATE INDEX drive_sync_logs_operation_idx ON public.drive_sync_logs (operation);

ALTER TABLE public.drive_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view drive_sync_logs"
  ON public.drive_sync_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));