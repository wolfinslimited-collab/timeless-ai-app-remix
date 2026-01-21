-- Add pinned column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN pinned BOOLEAN NOT NULL DEFAULT false;

-- Create index for faster queries on pinned conversations
CREATE INDEX idx_conversations_pinned ON public.conversations (user_id, pinned, updated_at DESC);