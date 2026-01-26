-- Create skin_analyses table to store user skin analysis history
CREATE TABLE public.skin_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT,
  skin_type TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  hydration_level INTEGER,
  oiliness_level INTEGER,
  concerns JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  analysis_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.skin_analyses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own skin analyses" 
ON public.skin_analyses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skin analyses" 
ON public.skin_analyses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skin analyses" 
ON public.skin_analyses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_skin_analyses_user_created ON public.skin_analyses(user_id, created_at DESC);