import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CREDIT_COST = 25;

// Fal.ai queue URL
const FAL_QUEUE_URL = "https://queue.fal.run";

// Language mapping for Fal.ai dubbing API
const LANGUAGE_MAP: Record<string, string> = {
  english: "en",
  spanish: "es",
  french: "fr",
  german: "de",
  italian: "it",
  portuguese: "pt",
  russian: "ru",
  japanese: "ja",
  korean: "ko",
  chinese: "zh",
  arabic: "ar",
  hindi: "hi",
  turkish: "tr",
  farsi: "fa",
  persian: "fa",
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

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

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
    const { data: profile, error: profileError } = await supabaseClient
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

    // Map target language
    const langKey = targetLanguage.toLowerCase();
    const mappedLang = LANGUAGE_MAP[langKey] || langKey;

    console.log(`Starting video translation for user ${user.id}`);
    console.log(`YouTube URL: ${youtubeUrl}`);
    console.log(`Target Language: ${targetLanguage} -> ${mappedLang}`);
    console.log(`Voice Type: ${voiceType}`);

    // Submit to Fal.ai queue for dubbing
    const falResponse = await fetch(`${FAL_QUEUE_URL}/fal-ai/dubbing`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        video_url: youtubeUrl,
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
    const { data: generation, error: genError } = await supabaseClient
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
      const { error: creditError } = await supabaseClient
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
