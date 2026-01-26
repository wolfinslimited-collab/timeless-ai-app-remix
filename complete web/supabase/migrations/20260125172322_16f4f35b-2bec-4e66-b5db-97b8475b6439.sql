-- Create table for storing game session results
CREATE TABLE public.brain_game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  game_type TEXT NOT NULL, -- 'reaction_time', 'memory_pairs', 'n_back'
  score INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC,
  avg_reaction_time_ms INTEGER,
  best_reaction_time_ms INTEGER,
  level_reached INTEGER,
  moves_made INTEGER,
  correct_responses INTEGER,
  incorrect_responses INTEGER,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.brain_game_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own game sessions"
ON public.brain_game_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions"
ON public.brain_game_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own game sessions"
ON public.brain_game_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_brain_game_sessions_user_game ON public.brain_game_sessions(user_id, game_type);
CREATE INDEX idx_brain_game_sessions_created ON public.brain_game_sessions(created_at DESC);