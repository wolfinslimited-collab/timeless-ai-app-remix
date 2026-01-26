-- Add bedtime reminder settings to sleep_profiles
ALTER TABLE public.sleep_profiles 
ADD COLUMN IF NOT EXISTS bedtime_reminders_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER DEFAULT 30;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_sleep_profiles_reminders 
ON public.sleep_profiles (bedtime_reminders_enabled, bed_goal_time) 
WHERE bedtime_reminders_enabled = true;