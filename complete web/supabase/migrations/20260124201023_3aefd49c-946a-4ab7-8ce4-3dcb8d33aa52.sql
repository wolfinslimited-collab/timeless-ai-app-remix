-- Create sleep profiles table for user preferences and goals
CREATE TABLE public.sleep_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  work_schedule TEXT DEFAULT 'regular' CHECK (work_schedule IN ('regular', 'shift', 'flexible', 'remote')),
  sleep_goal_hours NUMERIC(3,1) DEFAULT 8.0,
  wake_goal_time TIME DEFAULT '07:00',
  bed_goal_time TIME DEFAULT '23:00',
  caffeine_intake TEXT DEFAULT 'moderate' CHECK (caffeine_intake IN ('none', 'low', 'moderate', 'high')),
  exercise_frequency TEXT DEFAULT 'moderate' CHECK (exercise_frequency IN ('none', 'light', 'moderate', 'intense')),
  screen_time_before_bed TEXT DEFAULT 'moderate' CHECK (screen_time_before_bed IN ('none', 'low', 'moderate', 'high')),
  sleep_environment TEXT DEFAULT 'good' CHECK (sleep_environment IN ('poor', 'fair', 'good', 'excellent')),
  stress_level TEXT DEFAULT 'moderate' CHECK (stress_level IN ('low', 'moderate', 'high', 'very_high')),
  sleep_issues TEXT[] DEFAULT '{}',
  sleep_goals TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sleep logs table for daily sleep entries
CREATE TABLE public.sleep_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sleep_date DATE NOT NULL,
  bed_time TIMESTAMP WITH TIME ZONE,
  wake_time TIMESTAMP WITH TIME ZONE,
  sleep_duration_hours NUMERIC(4,2),
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  deep_sleep_percent INTEGER,
  rem_sleep_percent INTEGER,
  light_sleep_percent INTEGER,
  awakenings INTEGER DEFAULT 0,
  sleep_latency_minutes INTEGER,
  mood_on_wake TEXT CHECK (mood_on_wake IN ('terrible', 'poor', 'okay', 'good', 'great')),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 10),
  notes TEXT,
  factors JSON DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sleep analyses table for AI-generated insights
CREATE TABLE public.sleep_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('daily', 'weekly', 'monthly')),
  sleep_score INTEGER NOT NULL CHECK (sleep_score >= 0 AND sleep_score <= 100),
  consistency_score INTEGER CHECK (consistency_score >= 0 AND consistency_score <= 100),
  efficiency_score INTEGER CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
  avg_sleep_duration NUMERIC(4,2),
  avg_sleep_quality NUMERIC(3,1),
  insights JSON,
  recommendations TEXT[],
  analysis_summary TEXT,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sleep_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sleep_profiles
CREATE POLICY "Users can view their own sleep profile" 
ON public.sleep_profiles FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep profile" 
ON public.sleep_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep profile" 
ON public.sleep_profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for sleep_logs
CREATE POLICY "Users can view their own sleep logs" 
ON public.sleep_logs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep logs" 
ON public.sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sleep logs" 
ON public.sleep_logs FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep logs" 
ON public.sleep_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for sleep_analyses
CREATE POLICY "Users can view their own sleep analyses" 
ON public.sleep_analyses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sleep analyses" 
ON public.sleep_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sleep analyses" 
ON public.sleep_analyses FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updating sleep_profiles updated_at
CREATE TRIGGER update_sleep_profiles_updated_at
BEFORE UPDATE ON public.sleep_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique constraint on sleep_logs for one entry per day per user
CREATE UNIQUE INDEX idx_sleep_logs_user_date ON public.sleep_logs(user_id, sleep_date);