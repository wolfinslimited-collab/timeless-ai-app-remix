-- Add columns to generations table for background processing
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS task_id TEXT,
ADD COLUMN IF NOT EXISTS provider_endpoint TEXT,
ADD COLUMN IF NOT EXISTS aspect_ratio TEXT,
ADD COLUMN IF NOT EXISTS quality TEXT;

-- Create index for efficient pending generation lookups
CREATE INDEX IF NOT EXISTS idx_generations_pending ON public.generations(user_id, status) WHERE status = 'pending';