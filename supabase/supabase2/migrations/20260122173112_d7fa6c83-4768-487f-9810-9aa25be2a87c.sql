-- Update function to accept date range parameters
CREATE OR REPLACE FUNCTION public.admin_get_stats_by_range(
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
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
    'total_users', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= v_start_date AND created_at <= v_end_date),
    'total_generations', (SELECT COUNT(*) FROM public.generations WHERE created_at >= v_start_date AND created_at <= v_end_date),
    'total_credits_used', (SELECT COALESCE(SUM(credits_used), 0) FROM public.generations WHERE created_at >= v_start_date AND created_at <= v_end_date),
    'active_subscriptions', (SELECT COUNT(*) FROM public.profiles WHERE subscription_status = 'active'),
    'generations_today', (SELECT COUNT(*) FROM public.generations WHERE created_at >= CURRENT_DATE AND created_at <= v_end_date),
    'new_users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE AND created_at <= v_end_date),
    'generations_by_type', (
      SELECT json_object_agg(type, count)
      FROM (SELECT type, COUNT(*) as count FROM public.generations WHERE created_at >= v_start_date AND created_at <= v_end_date GROUP BY type) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Update weekly stats function to accept date range
CREATE OR REPLACE FUNCTION public.admin_get_weekly_stats_by_range(
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
  v_start_date date;
  v_end_date date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  
  -- Default to last 7 days if no dates provided
  v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '6 days');
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);
  
  SELECT json_agg(
    json_build_object(
      'date', day::date,
      'generations', COALESCE(gen_count, 0),
      'users', COALESCE(user_count, 0),
      'credits', COALESCE(credits_sum, 0)
    )
    ORDER BY day
  )
  INTO result
  FROM (
    SELECT generate_series(
      v_start_date::timestamp,
      v_end_date::timestamp,
      INTERVAL '1 day'
    ) AS day
  ) dates
  LEFT JOIN (
    SELECT 
      DATE(created_at) as gen_date,
      COUNT(*) as gen_count,
      SUM(credits_used) as credits_sum
    FROM public.generations
    WHERE created_at >= v_start_date AND created_at <= v_end_date + INTERVAL '1 day'
    GROUP BY DATE(created_at)
  ) gens ON dates.day::date = gens.gen_date
  LEFT JOIN (
    SELECT 
      DATE(created_at) as user_date,
      COUNT(*) as user_count
    FROM public.profiles
    WHERE created_at >= v_start_date AND created_at <= v_end_date + INTERVAL '1 day'
    GROUP BY DATE(created_at)
  ) users ON dates.day::date = users.user_date;
  
  RETURN result;
END;
$$;