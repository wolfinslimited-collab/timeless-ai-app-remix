-- Create skin profiles table for onboarding data
CREATE TABLE public.skin_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  skin_type TEXT NOT NULL CHECK (skin_type IN ('oily', 'dry', 'combination', 'normal', 'sensitive')),
  primary_concerns TEXT[] DEFAULT '{}',
  skin_goals TEXT[] DEFAULT '{}',
  current_routine TEXT CHECK (current_routine IN ('minimal', 'basic', 'moderate', 'advanced')),
  sun_exposure TEXT CHECK (sun_exposure IN ('minimal', 'moderate', 'high')),
  water_intake TEXT CHECK (water_intake IN ('low', 'moderate', 'high')),
  sleep_quality TEXT CHECK (sleep_quality IN ('poor', 'average', 'good')),
  stress_level TEXT CHECK (stress_level IN ('low', 'moderate', 'high')),
  diet_type TEXT CHECK (diet_type IN ('balanced', 'vegetarian', 'vegan', 'keto', 'other')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.skin_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own skin profile"
ON public.skin_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own skin profile"
ON public.skin_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skin profile"
ON public.skin_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skin profile"
ON public.skin_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_skin_profiles_updated_at
BEFORE UPDATE ON public.skin_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();