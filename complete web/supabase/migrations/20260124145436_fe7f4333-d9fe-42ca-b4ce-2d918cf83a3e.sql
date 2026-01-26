-- Add country column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS country TEXT;

-- Create email_verifications table for storing OTP codes
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  country TEXT,
  referral_code TEXT,
  password_hash TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '15 minutes'),
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON public.email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON public.email_verifications(code);

-- Enable RLS
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert verification requests
CREATE POLICY "Anyone can create verification requests"
ON public.email_verifications
FOR INSERT
WITH CHECK (true);

-- Allow reading own verification by email (for verification process)
CREATE POLICY "Anyone can read verifications by email"
ON public.email_verifications
FOR SELECT
USING (true);

-- Allow updating verification status
CREATE POLICY "Anyone can update verification status"
ON public.email_verifications
FOR UPDATE
USING (true);

-- Create function to clean up expired verifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void AS $$
BEGIN
  DELETE FROM public.email_verifications WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update handle_new_user to include country from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, country)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'country'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;