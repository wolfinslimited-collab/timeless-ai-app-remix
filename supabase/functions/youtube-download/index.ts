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

    // Using YTStream API on RapidAPI (reliable YouTube downloader)
    const response = await fetch(
      `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${videoId}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': rapidApiKey,
          'x-rapidapi-host': 'ytstream-download-youtube-videos.p.rapidapi.com',
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
    console.log('Download API response keys:', Object.keys(data));

    // Extract the best video download URL from YTStream response
    let downloadUrl = null;
    let quality = null;

    // YTStream returns formats in different structure
    // Check for adaptiveFormats or formats array
    const formats = data.adaptiveFormats || data.formats || [];
    
    if (Array.isArray(formats) && formats.length > 0) {
      // Find video+audio formats (typically in formats array)
      const videoFormats = formats.filter((f: any) => 
        f.mimeType?.startsWith('video/') && f.url
      );
      
      if (videoFormats.length > 0) {
        // Sort by quality (height or qualityLabel) descending
        videoFormats.sort((a: any, b: any) => {
          const heightA = a.height || parseInt(a.qualityLabel) || 0;
          const heightB = b.height || parseInt(b.qualityLabel) || 0;
          return heightB - heightA;
        });
        downloadUrl = videoFormats[0].url;
        quality = videoFormats[0].qualityLabel || `${videoFormats[0].height}p`;
      }
    }

    // Fallback: check for direct link property
    if (!downloadUrl && data.link) {
      downloadUrl = data.link;
      quality = 'best';
    }

    // Another fallback: check for links array
    if (!downloadUrl && data.links && Array.isArray(data.links)) {
      const mp4Links = data.links.filter((l: any) => l.mimeType?.includes('video'));
      if (mp4Links.length > 0) {
        downloadUrl = mp4Links[0].url;
        quality = mp4Links[0].qualityLabel || 'video';
      }
    }

    if (!downloadUrl) {
      console.log('No download URL found in response:', JSON.stringify(data).substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'No download link available for this video' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found download URL with quality: ${quality}`);

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
