-- Add calendar_event to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'calendar_event';

-- Create table to store Google Calendar OAuth tokens per user
CREATE TABLE public.user_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT DEFAULT 'primary',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE public.user_calendar_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own calendar connections"
ON public.user_calendar_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own calendar connections"
ON public.user_calendar_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own calendar connections"
ON public.user_calendar_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own calendar connections"
ON public.user_calendar_connections FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_calendar_connections_updated_at
BEFORE UPDATE ON public.user_calendar_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();