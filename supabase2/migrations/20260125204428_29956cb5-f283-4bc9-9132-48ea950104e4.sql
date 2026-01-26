-- Add email campaign support to marketing_campaigns table
ALTER TABLE public.marketing_campaigns 
ADD COLUMN campaign_type text NOT NULL DEFAULT 'push',
ADD COLUMN email_subject text,
ADD COLUMN email_from_name text DEFAULT 'Timeless';

-- Add index for campaign type filtering
CREATE INDEX idx_marketing_campaigns_type ON public.marketing_campaigns(campaign_type);

-- Create email campaign logs table
CREATE TABLE public.marketing_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  opened_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_email_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "Admins can view email logs" ON public.marketing_email_logs
FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage email logs" ON public.marketing_email_logs
FOR ALL USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for efficient queries
CREATE INDEX idx_marketing_email_logs_campaign ON public.marketing_email_logs(campaign_id);
CREATE INDEX idx_marketing_email_logs_status ON public.marketing_email_logs(status);