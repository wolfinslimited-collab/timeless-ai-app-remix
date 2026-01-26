-- Add link_url column
ALTER TABLE public.featured_items ADD COLUMN link_url TEXT;

-- Update links for existing items
UPDATE public.featured_items SET link_url = '/create?type=cinema' WHERE title = 'Cinema Studio';
UPDATE public.featured_items SET link_url = '/create?app=video-upscale' WHERE title = 'Video Upscale';
UPDATE public.featured_items SET link_url = '/create?app=draw-to-video' WHERE title = 'Draw to Video';
UPDATE public.featured_items SET link_url = '/create?type=music' WHERE title = 'Music Studio';