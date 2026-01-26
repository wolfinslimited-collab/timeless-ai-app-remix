-- Add weekly email notification preference to sleep_profiles
ALTER TABLE public.sleep_profiles 
ADD COLUMN IF NOT EXISTS weekly_email_enabled BOOLEAN DEFAULT false;