-- Drop the overly permissive INSERT policy
DROP POLICY "Service role can insert transactions" ON public.credit_transactions;

-- Note: Service role bypasses RLS, so we don't need an INSERT policy for edge functions
-- Users should not be able to insert transactions directly - only through edge functions