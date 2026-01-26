-- Add location_based to the notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'location_based';