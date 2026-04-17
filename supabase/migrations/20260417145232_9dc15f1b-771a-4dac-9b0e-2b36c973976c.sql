-- Add missing columns to finance_entries (idempotent)
ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS document_number text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Helpful indexes for filters and aggregations
CREATE INDEX IF NOT EXISTS idx_finance_entries_date ON public.finance_entries (date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_entries_due_date ON public.finance_entries (due_date);
CREATE INDEX IF NOT EXISTS idx_finance_entries_status ON public.finance_entries (status);
CREATE INDEX IF NOT EXISTS idx_finance_entries_type ON public.finance_entries (type);
CREATE INDEX IF NOT EXISTS idx_finance_entries_service_id ON public.finance_entries (service_id);
CREATE INDEX IF NOT EXISTS idx_finance_entries_client_id ON public.finance_entries (client_id);

-- Enable realtime
ALTER TABLE public.finance_entries REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'finance_entries'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.finance_entries';
  END IF;
END $$;