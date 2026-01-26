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

    // Using YTStream API on RapidAPI
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

    let downloadUrl = null;
    let quality = null;

    // PRIORITY 1: Look for "formats" array - these have BOTH video AND audio
    // (adaptiveFormats are video-only or audio-only)
    if (data.formats && Array.isArray(data.formats) && data.formats.length > 0) {
      console.log('Found formats with video+audio:', data.formats.length);
      
      // Filter for mp4 video formats with audio
      const mp4Formats = data.formats.filter((f: any) => 
        f.mimeType?.includes('video/mp4') && f.url
      );
      
      if (mp4Formats.length > 0) {
        // Sort by quality (height) descending - get best quality with audio
        mp4Formats.sort((a: any, b: any) => {
          const heightA = a.height || parseInt(a.qualityLabel) || 0;
          const heightB = b.height || parseInt(b.qualityLabel) || 0;
          return heightB - heightA;
        });
        downloadUrl = mp4Formats[0].url;
        quality = mp4Formats[0].qualityLabel || `${mp4Formats[0].height}p`;
        console.log(`Selected format with audio: ${quality}`);
      }
    }

    // PRIORITY 2: Check for direct link property
    if (!downloadUrl && data.link) {
      downloadUrl = data.link;
      quality = 'best';
      console.log('Using direct link');
    }

    // PRIORITY 3: Check for links array
    if (!downloadUrl && data.links && Array.isArray(data.links)) {
      // Prefer links that explicitly have audio
      const videoLinks = data.links.filter((l: any) => 
        l.mimeType?.includes('video') && l.hasAudio !== false
      );
      if (videoLinks.length > 0) {
        downloadUrl = videoLinks[0].url;
        quality = videoLinks[0].qualityLabel || 'video';
        console.log('Using links array');
      }
    }

    if (!downloadUrl) {
      console.log('No download URL found. Response structure:', JSON.stringify(data).substring(0, 1000));
      return new Response(
        JSON.stringify({ error: 'No download link available for this video' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Success - download URL with quality: ${quality}`);

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
