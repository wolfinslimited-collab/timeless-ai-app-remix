import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Check user has credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profile.credits < 1) {
      return new Response(JSON.stringify({ error: "Insufficient credits" }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const googleApiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!googleApiKey) {
      return new Response(JSON.stringify({ error: "Google API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse optional body for session end / credit deduction
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine for token request
    }

    // If this is a credit deduction request (called periodically by client)
    if (body.action === "deduct_credits") {
      const minutes = Math.max(1, Math.round(Number(body.minutes) || 1));
      const creditsToDeduct = minutes * 2; // 2 credits per minute

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: deductError } = await serviceClient.rpc("", {}).catch(() => ({ error: null }));
      
      // Direct update since we don't have an RPC
      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({ credits: Math.max(0, profile.credits - creditsToDeduct) })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Credit deduction failed:", updateError);
      }

      return new Response(
        JSON.stringify({ success: true, credits_deducted: creditsToDeduct }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If this is a session save request
    if (body.action === "save_session") {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { error: saveError } = await serviceClient
        .from("voice_sessions")
        .insert({
          user_id: userId,
          title: body.title || "Voice Session",
          transcript: body.transcript || [],
        });

      if (saveError) {
        console.error("Session save failed:", saveError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: return the API key and WebSocket URL for Gemini Live
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${googleApiKey}`;

    return new Response(
      JSON.stringify({
        websocket_url: wsUrl,
        model: "models/gemini-2.5-flash-native-audio-preview-12-2025",
        user_id: userId,
        credits: profile.credits,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("gemini-live-token error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
