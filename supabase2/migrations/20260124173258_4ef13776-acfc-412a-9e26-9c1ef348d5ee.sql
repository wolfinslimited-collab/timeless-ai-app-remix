-- Create meal_logs table to track food entries
CREATE TABLE public.meal_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  meal_type TEXT DEFAULT 'snack',
  foods JSONB NOT NULL DEFAULT '[]',
  total_calories INTEGER NOT NULL DEFAULT 0,
  total_protein NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_carbs NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_fat NUMERIC(10,2) NOT NULL DEFAULT 0,
  health_score INTEGER DEFAULT 5,
  meal_description TEXT,
  image_url TEXT,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own meal logs"
  ON public.meal_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal logs"
  ON public.meal_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal logs"
  ON public.meal_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal logs"
  ON public.meal_logs FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster queries by user and date
CREATE INDEX idx_meal_logs_user_logged_at ON public.meal_logs (user_id, logged_at DESC);