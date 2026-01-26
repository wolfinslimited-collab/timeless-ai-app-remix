-- Drop and recreate admin_get_all_profiles to include user email
DROP FUNCTION IF EXISTS public.admin_get_all_profiles();

CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
 RETURNS TABLE(id uuid, user_id uuid, email text, display_name text, avatar_url text, credits integer, plan text, subscription_status text, subscription_end_date timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.id,
    p.user_id,
    u.email::text,
    p.display_name,
    p.avatar_url,
    p.credits,
    p.plan,
    p.subscription_status,
    p.subscription_end_date,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE public.has_role(auth.uid(), 'admin')
$function$;