-- Create a dedicated function to get subscribed users with proper filtering
CREATE OR REPLACE FUNCTION public.admin_get_subscribed_users(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_source text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  plan text,
  subscription_status text,
  subscription_end_date timestamp with time zone,
  source text,
  created_at timestamp with time zone,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_count bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  -- Get total count of subscribed users with filters
  SELECT COUNT(*) INTO v_total_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE 
    p.subscription_status IS NOT NULL 
    AND p.subscription_status != 'none'
    AND p.plan IS NOT NULL 
    AND p.plan != 'free'
    AND (p_search IS NULL OR p_search = '' OR
         p.display_name ILIKE '%' || p_search || '%' OR
         u.email::text ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p_status = '' OR p.subscription_status = p_status)
    AND (p_source IS NULL OR p_source = '' OR p.source = p_source);

  -- Return paginated results
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    u.email::text,
    p.display_name,
    p.plan,
    p.subscription_status,
    p.subscription_end_date,
    p.source,
    p.created_at,
    v_total_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE 
    p.subscription_status IS NOT NULL 
    AND p.subscription_status != 'none'
    AND p.plan IS NOT NULL 
    AND p.plan != 'free'
    AND (p_search IS NULL OR p_search = '' OR
         p.display_name ILIKE '%' || p_search || '%' OR
         u.email::text ILIKE '%' || p_search || '%')
    AND (p_status IS NULL OR p_status = '' OR p.subscription_status = p_status)
    AND (p_source IS NULL OR p_source = '' OR p.source = p_source)
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;