-- Create table for fingerprint search history
CREATE TABLE public.fingerprint_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_query TEXT,
  search_mode TEXT NOT NULL DEFAULT 'text',
  image_url TEXT,
  additional_info TEXT,
  summary TEXT,
  profiles JSONB DEFAULT '[]'::jsonb,
  sources JSONB DEFAULT '[]'::jsonb,
  credits_used INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fingerprint_searches ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own searches"
  ON public.fingerprint_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches"
  ON public.fingerprint_searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searches"
  ON public.fingerprint_searches FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_fingerprint_searches_user_id ON public.fingerprint_searches(user_id);
CREATE INDEX idx_fingerprint_searches_created_at ON public.fingerprint_searches(created_at DESC);