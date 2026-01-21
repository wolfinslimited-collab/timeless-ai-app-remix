import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Video ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
    if (!rapidApiKey) {
      console.error('RAPIDAPI_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Download service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching download links for video: ${videoId}`);

    // Using ytjar API on RapidAPI (reliable YouTube downloader)
    const response = await fetch(
      `https://ytjar.p.rapidapi.com/download?id=${videoId}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'ytjar.p.rapidapi.com',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('RapidAPI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch download links' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Download API response:', JSON.stringify(data).substring(0, 500));

    // Extract the best video download URL
    let downloadUrl = null;
    let quality = null;

    // Try to find the best quality video with audio
    if (data.formats && Array.isArray(data.formats)) {
      // Prefer formats with both video and audio
      const withAudio = data.formats.filter((f: any) => 
        f.hasVideo && f.hasAudio && f.url
      );
      
      if (withAudio.length > 0) {
        // Sort by quality (height) descending
        withAudio.sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
        downloadUrl = withAudio[0].url;
        quality = withAudio[0].qualityLabel || `${withAudio[0].height}p`;
      }
    }

    // Fallback to direct URL if available
    if (!downloadUrl && data.url) {
      downloadUrl = data.url;
      quality = data.quality || 'unknown';
    }

    if (!downloadUrl) {
      return new Response(
        JSON.stringify({ error: 'No download link available for this video' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        downloadUrl,
        quality,
        title: data.title || 'YouTube Video',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in youtube-download function:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
