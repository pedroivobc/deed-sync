-- Tokens de acesso à API Cora
CREATE TABLE public.cora_auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL CHECK (environment IN ('stage', 'production')),
  access_token text NOT NULL,
  token_type text DEFAULT 'bearer',
  expires_at timestamptz NOT NULL,
  scope text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(environment)
);

-- Log de chamadas à API Cora
CREATE TABLE public.cora_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment text NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  request_payload jsonb,
  response_status int,
  response_body jsonb,
  error_message text,
  duration_ms int,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cora_api_logs_created ON public.cora_api_logs(created_at DESC);
CREATE INDEX idx_cora_api_logs_endpoint ON public.cora_api_logs(endpoint);

-- RLS
ALTER TABLE public.cora_auth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cora_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/manager manage cora_auth_tokens"
ON public.cora_auth_tokens
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Admin/manager manage cora_api_logs"
ON public.cora_api_logs
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

-- Trigger updated_at
CREATE TRIGGER set_cora_auth_tokens_updated_at
BEFORE UPDATE ON public.cora_auth_tokens
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();