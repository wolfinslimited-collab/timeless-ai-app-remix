import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CREDIT_COST = 25;

// Fal.ai queue URL
const FAL_QUEUE_URL = "https://queue.fal.run";

// Fal.ai dubbing API currently supports a limited enum set for `target_language`.
// Docs: https://fal.ai/models/fal-ai/dubbing/api
const TARGET_LANGUAGE_MAP: Record<string, "english" | "turkish" | "hindi"> = {
  english: "english",
  en: "english",
  turkish: "turkish",
  tr: "turkish",
  hindi: "hindi",
  hi: "hindi",
};

interface TranslateRequest {
  youtubeUrl: string;
  targetLanguage: string;
  voiceType: "male" | "female";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Backend not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Auth-scoped client: validate user token
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client: perform DB + Storage operations reliably (RLS bypass)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAuthClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { youtubeUrl, targetLanguage, voiceType } = await req.json() as TranslateRequest;

    if (!youtubeUrl || !targetLanguage) {
      return new Response(
        JSON.stringify({ error: "YouTube URL and target language are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate YouTube URL
    const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)/;
    if (!youtubePattern.test(youtubeUrl)) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("credits, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasActiveSubscription = profile.subscription_status === "active" || 
                                   profile.subscription_status === "trialing";

    if (!hasActiveSubscription && (profile.credits ?? 0) < CREDIT_COST) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. Need ${CREDIT_COST} credits.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const falApiKey = Deno.env.get("FAL_API_KEY");
    if (!falApiKey) {
      console.error("FAL_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Translation service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize/validate target language
    const langKey = targetLanguage.toLowerCase().trim();
    const mappedLang = TARGET_LANGUAGE_MAP[langKey];

    if (!mappedLang) {
      return new Response(
        JSON.stringify({
          error:
            "Unsupported target language for dubbing. Currently supported: English, Turkish, Hindi.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting video translation for user ${user.id}`);
    console.log(`YouTube URL: ${youtubeUrl}`);
    console.log(`Target Language: ${targetLanguage} -> ${mappedLang}`);
    console.log(`Voice Type: ${voiceType}`);

    // Extract video ID from YouTube URL
    const extractVideoId = (url: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&\s?]+)/,
        /youtube\.com\/embed\/([^&\s?]+)/,
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match?.[1]) return match[1];
      }
      return null;
    };

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Could not extract video ID from YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get direct video download URL using RapidAPI
    const rapidApiKey = Deno.env.get("RAPIDAPI_KEY");
    if (!rapidApiKey) {
      console.error("RAPIDAPI_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Download service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Fetching direct download URL for video: ${videoId}`);

    const ytResponse = await fetch(
      `https://ytstream-download-youtube-videos.p.rapidapi.com/dl?id=${videoId}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": rapidApiKey,
          "x-rapidapi-host": "ytstream-download-youtube-videos.p.rapidapi.com",
        },
      }
    );

    if (!ytResponse.ok) {
      const errorText = await ytResponse.text();
      console.error("YouTube download API error:", ytResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch video download link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ytData = await ytResponse.json();
    let directVideoUrl: string | null = null;

    // Look for formats with video+audio (mp4)
    if (ytData.formats && Array.isArray(ytData.formats)) {
      const mp4Formats = ytData.formats.filter((f: any) =>
        f.mimeType?.includes("video/mp4") && f.url
      );
      if (mp4Formats.length > 0) {
        // Sort by quality descending
        mp4Formats.sort((a: any, b: any) => {
          const heightA = a.height || parseInt(a.qualityLabel) || 0;
          const heightB = b.height || parseInt(b.qualityLabel) || 0;
          return heightB - heightA;
        });
        directVideoUrl = mp4Formats[0].url;
        console.log(`Found direct video URL with quality: ${mp4Formats[0].qualityLabel || mp4Formats[0].height}`);
      }
    }

    // Fallback to direct link
    if (!directVideoUrl && ytData.link) {
      directVideoUrl = ytData.link;
      console.log("Using direct link fallback");
    }

    if (!directVideoUrl) {
      console.error("No direct video URL found for:", videoId);
      return new Response(
        JSON.stringify({ error: "Could not get video download link. The video may be restricted." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Upload the MP4 to our public storage so Fal.ai can reliably fetch it.
    // (Many YouTube-derived URLs are short-lived or blocked for non-browser clients.)
    console.log("Direct video URL obtained. Downloading and uploading to storage...");

    const videoFetchResp = await fetch(directVideoUrl, {
      headers: {
        // Some hosts block generic user agents.
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "*/*",
      },
    });

    if (!videoFetchResp.ok) {
      const errText = await videoFetchResp.text().catch(() => "");
      console.error(
        "Failed to download MP4 from direct URL:",
        videoFetchResp.status,
        errText
      );
      return new Response(
        JSON.stringify({ error: "Failed to download the source video for translation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentType = videoFetchResp.headers.get("content-type") || "";
    const contentLength = Number(videoFetchResp.headers.get("content-length") || "0");

    // Prevent excessive memory use in edge runtime
    const MAX_BYTES = 80 * 1024 * 1024; // 80MB
    if (contentLength && contentLength > MAX_BYTES) {
      console.error("Video too large to process:", contentLength);
      return new Response(
        JSON.stringify({
          error:
            "This video is too large to process right now. Please try a shorter or lower-quality video.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (contentType && !contentType.includes("video")) {
      console.warn("Unexpected content-type for MP4 download:", contentType);
    }

    const videoBytes = await videoFetchResp.arrayBuffer();
    if (videoBytes.byteLength > MAX_BYTES) {
      console.error("Video too large after download:", videoBytes.byteLength);
      return new Response(
        JSON.stringify({
          error:
            "This video is too large to process right now. Please try a shorter or lower-quality video.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const objectPath = `translate-ai/${user.id}/${videoId}-${Date.now()}.mp4`;
    const uploadBody = new Blob([videoBytes], { type: "video/mp4" });

    const { error: uploadError } = await supabaseAdmin.storage
      .from("generation-inputs")
      .upload(objectPath, uploadBody, {
        contentType: "video/mp4",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to stage the video for translation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicData } = supabaseAdmin.storage
      .from("generation-inputs")
      .getPublicUrl(objectPath);

    const stableVideoUrl = publicData?.publicUrl;
    if (!stableVideoUrl) {
      console.error("Failed to get public URL for uploaded video");
      return new Response(
        JSON.stringify({ error: "Failed to stage the video for translation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Uploaded staged video URL:", stableVideoUrl);
    console.log("Submitting to Fal.ai dubbing...");

    // Step 3: Submit to Fal.ai queue for dubbing with the stable public URL
    const falResponse = await fetch(`${FAL_QUEUE_URL}/fal-ai/dubbing`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_url: stableVideoUrl,
        target_language: mappedLang,
        do_lipsync: true,
      }),
    });

    const responseText = await falResponse.text();
    console.log("Fal.ai initial response:", responseText);

    if (!falResponse.ok) {
      console.error("Fal.ai error:", falResponse.status, responseText);
      return new Response(
        JSON.stringify({ error: "Failed to start video translation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let falData;
    try {
      falData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse Fal.ai response");
      return new Response(
        JSON.stringify({ error: "Invalid response from translation service" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create generation record with task_id for polling
    const { data: generation, error: genError } = await supabaseAdmin
      .from("generations")
      .insert({
        user_id: user.id,
        type: "video",
        model: "translate-ai",
        prompt: `Translate video to ${targetLanguage} with ${voiceType} voice`,
        status: "pending",
        credits_used: hasActiveSubscription ? 0 : CREDIT_COST,
          // Must match check-generation's expected provider format
          provider_endpoint: "fal:fal-ai/dubbing",
        task_id: falData.request_id || null,
      })
      .select()
      .single();

    if (genError) {
      console.error("Generation insert error:", genError);
    }

    // Deduct credits after successful submission
    if (!hasActiveSubscription) {
      const { error: creditError } = await supabaseAdmin
        .from("profiles")
        .update({ credits: (profile.credits ?? 0) - CREDIT_COST })
        .eq("user_id", user.id);

      if (creditError) {
        console.error("Credit deduction error:", creditError);
      }
    }

    console.log(`Video translation queued, request_id: ${falData.request_id}, generation ID: ${generation?.id}`);

    return new Response(
      JSON.stringify({
        status: "processing",
        message: "Video translation started. Check your Library for results.",
        generationId: generation?.id,
        requestId: falData.request_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Translate video error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
