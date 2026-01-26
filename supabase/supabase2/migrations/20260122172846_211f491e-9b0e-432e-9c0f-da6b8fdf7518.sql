-- Add function to get weekly stats for dashboard charts
CREATE OR REPLACE FUNCTION public.admin_get_weekly_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  
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
      CURRENT_DATE - INTERVAL '6 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS day
  ) dates
  LEFT JOIN (
    SELECT 
      DATE(created_at) as gen_date,
      COUNT(*) as gen_count,
      SUM(credits_used) as credits_sum
    FROM public.generations
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY DATE(created_at)
  ) gens ON dates.day::date = gens.gen_date
  LEFT JOIN (
    SELECT 
      DATE(created_at) as user_date,
      COUNT(*) as user_count
    FROM public.profiles
    WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY DATE(created_at)
  ) users ON dates.day::date = users.user_date;
  
  RETURN result;
END;
$$;