-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.profiles(id);

-- Create referrals tracking table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_id)
);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer)
CREATE POLICY "Users can view their referrals" ON public.referrals
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = referrer_id
  ));

-- Generate unique referral code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $function$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$function$;

-- Update handle_new_user to generate referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_referral_code TEXT;
  referrer_profile_id UUID;
  referrer_user_id UUID;
BEGIN
  -- Generate unique referral code
  LOOP
    new_referral_code := generate_referral_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE referral_code = new_referral_code);
  END LOOP;

  -- Check if user was referred
  IF NEW.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT id, user_id INTO referrer_profile_id, referrer_user_id
    FROM profiles 
    WHERE referral_code = NEW.raw_user_meta_data->>'referral_code';
  END IF;

  -- Insert new profile
  INSERT INTO public.profiles (user_id, display_name, credits, referral_code, referred_by)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), 
    25,
    new_referral_code,
    referrer_profile_id
  );

  -- If referred, create referral record
  IF referrer_profile_id IS NOT NULL THEN
    INSERT INTO public.referrals (referrer_id, referred_id, status)
    VALUES (referrer_profile_id, (SELECT id FROM profiles WHERE user_id = NEW.id), 'pending');
  END IF;

  RETURN NEW;
END;
$function$;

-- Function to complete referral and award credits (called after first generation)
CREATE OR REPLACE FUNCTION public.complete_referral(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id UUID;
  v_referral_id UUID;
  v_referrer_id UUID;
  v_referrer_user_id UUID;
  bonus_credits INTEGER := 50;
BEGIN
  -- Get profile id
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = p_user_id;
  
  -- Find pending referral
  SELECT r.id, r.referrer_id, p.user_id 
  INTO v_referral_id, v_referrer_id, v_referrer_user_id
  FROM referrals r
  JOIN profiles p ON p.id = r.referrer_id
  WHERE r.referred_id = v_profile_id AND r.status = 'pending';

  IF v_referral_id IS NOT NULL THEN
    -- Award credits to referrer
    UPDATE profiles SET credits = credits + bonus_credits WHERE id = v_referrer_id;
    
    -- Award credits to referred user
    UPDATE profiles SET credits = credits + bonus_credits WHERE id = v_profile_id;
    
    -- Update referral status
    UPDATE referrals 
    SET status = 'completed', credits_awarded = bonus_credits, completed_at = now()
    WHERE id = v_referral_id;

    -- Log transactions
    INSERT INTO credit_transactions (user_id, type, amount, description, reference_id)
    VALUES 
      (v_referrer_user_id, 'referral', bonus_credits, 'Referral bonus - friend signed up', v_referral_id::text),
      (p_user_id, 'referral', bonus_credits, 'Welcome bonus - referred by friend', v_referral_id::text);
  END IF;
END;
$function$;