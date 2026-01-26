-- Brain AI profiles table for user baseline and settings
CREATE TABLE public.brain_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  occupation TEXT,
  work_schedule TEXT DEFAULT 'regular',
  sleep_goal_hours NUMERIC DEFAULT 8.0,
  focus_goals TEXT[] DEFAULT '{}',
  baseline_established BOOLEAN DEFAULT false,
  baseline_start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT brain_profiles_user_id_unique UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.brain_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own brain profile" ON public.brain_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own brain profile" ON public.brain_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own brain profile" ON public.brain_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own brain profile" ON public.brain_profiles FOR DELETE USING (auth.uid() = user_id);

-- Brain daily metrics table for storing daily aggregated data
CREATE TABLE public.brain_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  metric_date DATE NOT NULL,
  -- Core scores (0-100)
  brain_performance_score INTEGER,
  focus_score INTEGER,
  stress_load INTEGER,
  mood_stability INTEGER,
  reaction_speed INTEGER,
  cognitive_consistency INTEGER,
  -- Raw behavioral data
  total_screen_time_minutes INTEGER DEFAULT 0,
  app_switches INTEGER DEFAULT 0,
  deep_work_minutes INTEGER DEFAULT 0,
  night_usage_minutes INTEGER DEFAULT 0,
  notification_interactions INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  avg_session_length_minutes NUMERIC DEFAULT 0,
  -- Self-reported data
  self_reported_mood INTEGER,
  self_reported_energy INTEGER,
  self_reported_focus INTEGER,
  mood_notes TEXT,
  -- Calculated insights
  insights JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT brain_metrics_user_date_unique UNIQUE (user_id, metric_date)
);

-- Enable RLS
ALTER TABLE public.brain_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own brain metrics" ON public.brain_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own brain metrics" ON public.brain_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own brain metrics" ON public.brain_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own brain metrics" ON public.brain_metrics FOR DELETE USING (auth.uid() = user_id);

-- Brain mood check-ins for quick mood logging
CREATE TABLE public.brain_mood_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mood_score INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 10),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  focus_level INTEGER CHECK (focus_level >= 1 AND focus_level <= 10),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
  notes TEXT,
  context TEXT, -- 'morning', 'afternoon', 'evening', 'night'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brain_mood_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own mood logs" ON public.brain_mood_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own mood logs" ON public.brain_mood_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mood logs" ON public.brain_mood_logs FOR DELETE USING (auth.uid() = user_id);

-- Brain app usage sessions for detailed tracking
CREATE TABLE public.brain_app_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL,
  session_end TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  app_category TEXT, -- 'productivity', 'social', 'entertainment', 'education', 'other'
  app_switches_during INTEGER DEFAULT 0,
  is_deep_work BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brain_app_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own app sessions" ON public.brain_app_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own app sessions" ON public.brain_app_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own app sessions" ON public.brain_app_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own app sessions" ON public.brain_app_sessions FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_brain_profiles_updated_at
  BEFORE UPDATE ON public.brain_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brain_metrics_updated_at
  BEFORE UPDATE ON public.brain_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();