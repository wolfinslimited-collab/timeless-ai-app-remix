-- Create featured_items table
CREATE TABLE public.featured_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT 'Featured',
  video_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.featured_items ENABLE ROW LEVEL SECURITY;

-- Public read access for active items
CREATE POLICY "Anyone can view active featured items"
ON public.featured_items
FOR SELECT
USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage featured items"
ON public.featured_items
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for ordering
CREATE INDEX idx_featured_items_order ON public.featured_items(display_order);

-- Trigger for updated_at
CREATE TRIGGER update_featured_items_updated_at
BEFORE UPDATE ON public.featured_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 4 featured items
INSERT INTO public.featured_items (title, description, tag, video_url, display_order) VALUES
('Cinema Studio', 'Professional cinematic video creation with AI', 'Featured', '/videos/cinema-studio.mp4', 1),
('Video Upscale', 'Enhance video quality up to 4K resolution', 'Popular', '/videos/video-upscale.mp4', 2),
('Draw to Video', 'Transform sketches into animated videos', 'New', '/videos/draw-to-video.mp4', 3),
('Music Studio', 'AI-powered music creation and remixing', 'Hot', '/videos/music-studio.mp4', 4);