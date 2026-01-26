-- Create a table for credit transactions (purchases and usage)
CREATE TABLE public.credit_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- positive for credits added, negative for credits used
  type TEXT NOT NULL, -- 'purchase', 'subscription', 'usage', 'refund', 'bonus'
  description TEXT,
  reference_id TEXT, -- stripe session id, generation id, etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own transactions
CREATE POLICY "Users can view their own transactions" 
ON public.credit_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create policy for service role to insert transactions (edge functions)
CREATE POLICY "Service role can insert transactions"
ON public.credit_transactions
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);