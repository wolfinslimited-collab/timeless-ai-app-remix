-- Create calorie profiles table for personalized nutrition goals
CREATE TABLE public.calorie_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female', 'other')),
  height_cm NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  activity_level TEXT NOT NULL CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal TEXT NOT NULL CHECK (goal IN ('lose', 'maintain', 'gain')),
  target_weight_kg NUMERIC,
  calculated_bmr NUMERIC NOT NULL,
  calculated_tdee NUMERIC NOT NULL,
  recommended_calories INTEGER NOT NULL,
  recommended_protein INTEGER NOT NULL,
  recommended_carbs INTEGER NOT NULL,
  recommended_fat INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.calorie_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own calorie profile" 
ON public.calorie_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calorie profile" 
ON public.calorie_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calorie profile" 
ON public.calorie_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calorie profile" 
ON public.calorie_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_calorie_profiles_user ON public.calorie_profiles (user_id);