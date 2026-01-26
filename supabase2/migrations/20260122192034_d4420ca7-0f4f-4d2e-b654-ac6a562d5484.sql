-- Add source column to profiles table to track user origin (web/android/ios)
ALTER TABLE public.profiles 
ADD COLUMN source text DEFAULT 'web';

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.source IS 'User registration source: web, android, or ios';