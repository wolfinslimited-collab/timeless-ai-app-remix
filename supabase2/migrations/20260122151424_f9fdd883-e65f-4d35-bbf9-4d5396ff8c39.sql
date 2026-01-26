-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create function for admin to view all profiles
CREATE OR REPLACE FUNCTION public.admin_get_all_profiles()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    credits INTEGER,
    plan TEXT,
    subscription_status TEXT,
    subscription_end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.display_name,
    p.avatar_url,
    p.credits,
    p.plan,
    p.subscription_status,
    p.subscription_end_date,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin')
$$;

-- Create function for admin to view all generations
CREATE OR REPLACE FUNCTION public.admin_get_all_generations(
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    prompt TEXT,
    type TEXT,
    model TEXT,
    status TEXT,
    output_url TEXT,
    thumbnail_url TEXT,
    credits_used INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    g.id,
    g.user_id,
    g.prompt,
    g.type,
    g.model,
    g.status,
    g.output_url,
    g.thumbnail_url,
    g.credits_used,
    g.created_at
  FROM public.generations g
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY g.created_at DESC
  LIMIT p_limit
  OFFSET p_offset
$$;

-- Create function to update user credits (admin only)
CREATE OR REPLACE FUNCTION public.admin_update_credits(
    p_user_id UUID,
    p_credits INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN FALSE;
  END IF;
  
  UPDATE public.profiles
  SET credits = p_credits, updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Create function to get admin stats
CREATE OR REPLACE FUNCTION public.admin_get_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN NULL;
  END IF;
  
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'total_generations', (SELECT COUNT(*) FROM public.generations),
    'total_credits_used', (SELECT COALESCE(SUM(credits_used), 0) FROM public.generations),
    'active_subscriptions', (SELECT COUNT(*) FROM public.profiles WHERE subscription_status = 'active'),
    'generations_today', (SELECT COUNT(*) FROM public.generations WHERE created_at >= CURRENT_DATE),
    'new_users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'generations_by_type', (
      SELECT json_object_agg(type, count)
      FROM (SELECT type, COUNT(*) as count FROM public.generations GROUP BY type) t
    )
  ) INTO result;
  
  RETURN result;
END;
$$;