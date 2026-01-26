-- Create table for saved financial reports
CREATE TABLE public.financial_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL DEFAULT 'crypto',
  analysis_content TEXT NOT NULL,
  price_data JSONB,
  technical_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reports"
ON public.financial_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
ON public.financial_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
ON public.financial_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
ON public.financial_reports FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_financial_reports_user_id ON public.financial_reports(user_id);
CREATE INDEX idx_financial_reports_symbol ON public.financial_reports(symbol);