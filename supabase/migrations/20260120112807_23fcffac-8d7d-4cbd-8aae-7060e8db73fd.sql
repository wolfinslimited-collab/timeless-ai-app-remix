-- Update the default credits for new profiles to 50
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 50;

-- Update the handle_new_user function to explicitly set 50 starter credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, credits)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), 50);
  RETURN NEW;
END;
$function$;