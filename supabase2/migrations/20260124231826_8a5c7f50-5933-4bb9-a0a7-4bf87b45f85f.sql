-- Add stock_price to the notification_type enum
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'stock_price';