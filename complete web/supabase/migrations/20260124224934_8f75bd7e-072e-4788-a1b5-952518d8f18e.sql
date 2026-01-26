-- Create enum for notification types
CREATE TYPE notification_type AS ENUM ('time_reminder', 'crypto_price', 'weather', 'custom');

-- Create enum for notification status
CREATE TYPE notification_status AS ENUM ('active', 'paused', 'triggered', 'expired', 'cancelled');

-- Create enum for notification channel
CREATE TYPE notification_channel AS ENUM ('push', 'email', 'both');

-- Create notifications table to store user-created notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  original_request TEXT NOT NULL, -- The original natural language request
  
  -- Condition configuration (stored as JSONB for flexibility)
  condition_config JSONB NOT NULL DEFAULT '{}',
  -- Examples:
  -- Time: {"trigger_at": "2024-01-20T15:00:00Z", "repeat": "daily"}
  -- Crypto: {"symbol": "BTC", "change_percent": 1.5, "direction": "any"}
  -- Weather: {"location": "Tehran", "condition": "rain", "check_date": "tomorrow"}
  -- Custom: {"check_url": "...", "check_type": "...", "keywords": [...]}
  
  channel notification_channel NOT NULL DEFAULT 'both',
  status notification_status NOT NULL DEFAULT 'active',
  
  -- Tracking
  last_checked_at TIMESTAMP WITH TIME ZONE,
  triggered_at TIMESTAMP WITH TIME ZONE,
  trigger_count INTEGER NOT NULL DEFAULT 0,
  max_triggers INTEGER DEFAULT 1, -- null means unlimited
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification history table
CREATE TABLE public.notification_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel notification_channel NOT NULL,
  sent_via TEXT[], -- ['push', 'email']
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notify_conversations table for chat history
CREATE TABLE public.notify_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notify_messages table for conversation messages
CREATE TABLE public.notify_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.notify_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notify_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notification_history
CREATE POLICY "Users can view their own notification history"
  ON public.notification_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification history"
  ON public.notification_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification history"
  ON public.notification_history FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for notify_conversations
CREATE POLICY "Users can view their own notify conversations"
  ON public.notify_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notify conversations"
  ON public.notify_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notify conversations"
  ON public.notify_conversations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notify conversations"
  ON public.notify_conversations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for notify_messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.notify_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.notify_conversations
    WHERE id = notify_messages.conversation_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their conversations"
  ON public.notify_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.notify_conversations
    WHERE id = notify_messages.conversation_id
    AND user_id = auth.uid()
  ));

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notification_history_user_id ON public.notification_history(user_id);
CREATE INDEX idx_notification_history_notification_id ON public.notification_history(notification_id);
CREATE INDEX idx_notify_conversations_user_id ON public.notify_conversations(user_id);
CREATE INDEX idx_notify_messages_conversation_id ON public.notify_messages(conversation_id);

-- Trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notify_conversations_updated_at
  BEFORE UPDATE ON public.notify_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();