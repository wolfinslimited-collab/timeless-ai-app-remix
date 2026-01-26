-- Fix admin_get_stats_by_range to return all-time totals for users/subscriptions
-- while filtering generations/credits by date range
CREATE OR REPLACE FUNCTION public.admin_get_stats_by_range(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  
  -- Default to all time if no dates provided
  v_start_date := COALESCE(p_start_date, '1970-01-01'::timestamp with time zone);
  v_end_date := COALESCE(p_end_date, now() + interval '1 day');
  
  SELECT json_build_object(
    -- ALL-TIME counts (not filtered by date range)
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'active_subscriptions', (SELECT COUNT(*) FROM public.profiles WHERE subscription_status = 'active'),
    
    -- PERIOD-FILTERED counts
    'total_generations', (SELECT COUNT(*) FROM public.generations WHERE created_at >= v_start_date AND created_at <= v_end_date),
    'total_credits_used', (SELECT COALESCE(SUM(credits_used), 0) FROM public.generations WHERE created_at >= v_start_date AND created_at <= v_end_date),
    'generations_today', (SELECT COUNT(*) FROM public.generations WHERE created_at >= CURRENT_DATE),
    'new_users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'generations_by_type', (
      SELECT json_object_agg(type, count)
      FROM (SELECT type, COUNT(*) as count FROM public.generations WHERE created_at >= v_start_date AND created_at <= v_end_date GROUP BY type) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;