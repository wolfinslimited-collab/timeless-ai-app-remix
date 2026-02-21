import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// External (primary) Supabase project for auth validation
const TIMELESS_URL = "https://ifesxveahsbjhmrhkhhy.supabase.co";
const TIMELESS_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXN4dmVhaHNiamhtcmhraGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODc4OTQsImV4cCI6MjA4NDQ2Mzg5NH0.uBRcVNQcTdJNk9gstOCW6xRcQsZ8pnQwy5IGxbhZD6g";
const TIMELESS_SERVICE_KEY = Deno.env.get("TIMELESS_SERVICE_ROLE_KEY") || "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user against the EXTERNAL project
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(TIMELESS_URL, TIMELESS_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Use service role client for data operations on the external project
    const serviceClient = createClient(TIMELESS_URL, TIMELESS_SERVICE_KEY || TIMELESS_ANON_KEY);

    // Check user has credits
    const { data: profile, error: profileError } = await serviceClient
      .from("profiles")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (profileError || !profile) {
      console.error("Profile error:", profileError);
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

    // Parse optional body
    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      // No body is fine for token request
    }

    // Credit deduction request
    if (body.action === "deduct_credits") {
      const minutes = Math.max(1, Math.round(Number(body.minutes) || 1));
      const creditsToDeduct = minutes * 2;

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

    // Session save request
    if (body.action === "save_session") {
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

    // Default: return WebSocket URL for Gemini Live
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${googleApiKey}`;

    console.log("Returning websocket_url for user:", userId);

    return new Response(
      JSON.stringify({
        websocket_url: wsUrl,
        model: "models/gemini-2.5-flash-preview-native-audio-dialog",
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
