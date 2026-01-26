-- Update admin_get_stats_by_range to include provider usage statistics
CREATE OR REPLACE FUNCTION public.admin_get_stats_by_range(p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  
  v_start_date := COALESCE(p_start_date, '1970-01-01'::timestamp with time zone);
  v_end_date := COALESCE(p_end_date, now() + interval '1 day');
  
  SELECT json_build_object(
    -- ALL-TIME counts
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'active_subscriptions', (SELECT COUNT(*) FROM public.profiles WHERE subscription_status = 'active'),
    
    -- Platform breakdown (all-time)
    'android_users', (SELECT COUNT(*) FROM public.profiles WHERE source = 'android'),
    'ios_users', (SELECT COUNT(*) FROM public.profiles WHERE source = 'ios'),
    'web_users', (SELECT COUNT(*) FROM public.profiles WHERE source = 'web'),
    
    -- Provider usage (period-filtered)
    'kie_generations', (SELECT COUNT(*) FROM public.generations WHERE (provider_endpoint LIKE 'kie:%' OR model LIKE 'kie-%') AND created_at >= v_start_date AND created_at <= v_end_date),
    'kie_credits_used', (SELECT COALESCE(SUM(credits_used), 0) FROM public.generations WHERE (provider_endpoint LIKE 'kie:%' OR model LIKE 'kie-%') AND created_at >= v_start_date AND created_at <= v_end_date),
    'fal_generations', (SELECT COUNT(*) FROM public.generations WHERE provider_endpoint LIKE 'fal:%' AND created_at >= v_start_date AND created_at <= v_end_date),
    'fal_credits_used', (SELECT COALESCE(SUM(credits_used), 0) FROM public.generations WHERE provider_endpoint LIKE 'fal:%' AND created_at >= v_start_date AND created_at <= v_end_date),
    
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
$function$;