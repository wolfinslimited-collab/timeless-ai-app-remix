
-- Update complete_referral to only award credits to the referrer
CREATE OR REPLACE FUNCTION public.complete_referral(p_user_id uuid)
 RETURNS void
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
    -- Award credits to referrer only
    UPDATE profiles SET credits = credits + bonus_credits WHERE id = v_referrer_id;
    
    -- Update referral status
    UPDATE referrals 
    SET status = 'completed', credits_awarded = bonus_credits, completed_at = now()
    WHERE id = v_referral_id;

    -- Log transaction for referrer only
    INSERT INTO credit_transactions (user_id, type, amount, description, reference_id)
    VALUES (v_referrer_user_id, 'referral', bonus_credits, 'Referral bonus - friend subscribed', v_referral_id::text);
  END IF;
END;
$function$;
