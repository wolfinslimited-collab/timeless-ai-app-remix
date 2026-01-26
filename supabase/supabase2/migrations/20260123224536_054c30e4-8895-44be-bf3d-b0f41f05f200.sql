-- Create a function to get credit statistics efficiently
CREATE OR REPLACE FUNCTION public.admin_get_credit_stats()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'total_credits', (SELECT COALESCE(SUM(credits), 0) FROM public.profiles),
    'average_credits', (SELECT COALESCE(ROUND(AVG(credits)), 0) FROM public.profiles),
    'users_with_credits', (SELECT COUNT(*) FROM public.profiles WHERE credits > 0),
    'top_users', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          p.id,
          p.user_id,
          u.email::text as email,
          p.display_name,
          p.avatar_url,
          p.credits,
          p.plan,
          p.subscription_status
        FROM public.profiles p
        LEFT JOIN auth.users u ON u.id = p.user_id
        ORDER BY p.credits DESC
        LIMIT 5
      ) t
    )
  ) INTO result;

  RETURN result;
END;
$$;