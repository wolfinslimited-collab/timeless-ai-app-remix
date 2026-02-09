-- Create ai_editor_projects table for storing project state
CREATE TABLE public.ai_editor_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Untitled Project',
  thumbnail TEXT, -- Base64 or URL
  editor_state JSONB NOT NULL DEFAULT '{}'::jsonb, -- Complete editor state
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_editor_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own projects"
ON public.ai_editor_projects
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
ON public.ai_editor_projects
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.ai_editor_projects
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.ai_editor_projects
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_editor_projects_updated_at
BEFORE UPDATE ON public.ai_editor_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();