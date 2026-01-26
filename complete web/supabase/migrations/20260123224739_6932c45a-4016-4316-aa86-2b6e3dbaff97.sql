-- Create a function to get users sorted by credits with pagination
CREATE OR REPLACE FUNCTION public.admin_get_users_by_credits(
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_search text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  display_name text,
  avatar_url text,
  credits integer,
  plan text,
  subscription_status text,
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

  -- Get total count with search filter
  IF p_search IS NOT NULL AND p_search != '' THEN
    SELECT COUNT(*) INTO v_total_count
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.user_id
    WHERE 
      p.display_name ILIKE '%' || p_search || '%' OR
      u.email::text ILIKE '%' || p_search || '%';
  ELSE
    SELECT COUNT(*) INTO v_total_count FROM public.profiles;
  END IF;

  -- Return paginated results sorted by credits DESC
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    u.email::text,
    p.display_name,
    p.avatar_url,
    p.credits,
    p.plan,
    p.subscription_status,
    p.created_at,
    v_total_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE 
    (p_search IS NULL OR p_search = '' OR
     p.display_name ILIKE '%' || p_search || '%' OR
     u.email::text ILIKE '%' || p_search || '%')
  ORDER BY p.credits DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;