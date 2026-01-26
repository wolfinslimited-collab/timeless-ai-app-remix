-- Create user_devices table for FCM tokens and device tracking
CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fcm_token text NOT NULL,
  device_type text DEFAULT 'web', -- web, android, ios
  device_name text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, fcm_token)
);

-- Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own devices
CREATE POLICY "Users can view their own devices"
ON public.user_devices FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own devices
CREATE POLICY "Users can insert their own devices"
ON public.user_devices FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own devices
CREATE POLICY "Users can update their own devices"
ON public.user_devices FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own devices
CREATE POLICY "Users can delete their own devices"
ON public.user_devices FOR DELETE
USING (auth.uid() = user_id);

-- Admins can view all devices
CREATE POLICY "Admins can view all devices"
ON public.user_devices FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_user_devices_updated_at
BEFORE UPDATE ON public.user_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_user_devices_user_id ON public.user_devices(user_id);
CREATE INDEX idx_user_devices_fcm_token ON public.user_devices(fcm_token);

-- Comment
COMMENT ON TABLE public.user_devices IS 'Stores FCM tokens and device info for push notifications';