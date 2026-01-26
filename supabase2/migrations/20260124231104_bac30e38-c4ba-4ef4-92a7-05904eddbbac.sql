-- Add new notification types to the enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'sports_match';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'news_monitoring';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'social_media';