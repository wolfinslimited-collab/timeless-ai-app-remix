-- Function to get top credit usage users within a date range
CREATE OR REPLACE FUNCTION public.admin_get_top_credit_usage(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  total_credits_used bigint,
  generation_count bigint,
  plan text,
  subscription_status text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  v_start_date := COALESCE(p_start_date, '1970-01-01'::timestamp with time zone);
  v_end_date := COALESCE(p_end_date, now() + interval '1 day');

  RETURN QUERY
  SELECT 
    g.user_id,
    u.email::text,
    p.display_name,
    p.avatar_url,
    SUM(g.credits_used)::bigint as total_credits_used,
    COUNT(g.id)::bigint as generation_count,
    p.plan,
    p.subscription_status
  FROM public.generations g
  LEFT JOIN auth.users u ON u.id = g.user_id
  LEFT JOIN public.profiles p ON p.user_id = g.user_id
  WHERE g.created_at >= v_start_date 
    AND g.created_at <= v_end_date
    AND g.credits_used > 0
  GROUP BY g.user_id, u.email, p.display_name, p.avatar_url, p.plan, p.subscription_status
  ORDER BY total_credits_used DESC
  LIMIT p_limit;
END;
$$;