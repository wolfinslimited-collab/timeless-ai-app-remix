-- Allow users (and authenticated edge functions acting as the user) to update their own generations
CREATE POLICY "Users can update their own generations"
ON public.generations
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);