-- Create storage bucket for generation input images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generation-inputs', 'generation-inputs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload generation inputs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generation-inputs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access for processing
CREATE POLICY "Generation inputs are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'generation-inputs');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their generation inputs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'generation-inputs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);