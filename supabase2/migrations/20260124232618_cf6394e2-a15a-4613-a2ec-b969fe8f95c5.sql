-- Add flight_status to the notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'flight_status';