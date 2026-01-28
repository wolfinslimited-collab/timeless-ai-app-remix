import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CREDIT_COST = 20;
const FAL_BASE_URL = "https://queue.fal.run";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt,
      title,
      styles,
      duration,
    } = await req.json();

    console.log(`Music generation request:`, { prompt, styles, duration });

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check credits
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, subscription_status')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasSubscription = profile.subscription_status === 'active';
    if (!hasSubscription && profile.credits < CREDIT_COST) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. Need ${CREDIT_COST}, have ${profile.credits}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY not configured");
    }

    // Build full prompt including styles
    let fullPrompt = prompt || "Create an instrumental track";
    if (styles && Array.isArray(styles) && styles.length > 0) {
      fullPrompt += `\n\nStyle: ${styles.join(', ')}`;
    }

    // Submit to Fal.ai for music generation
    const providerEndpoint = "fal-ai/stable-audio";
    const response = await fetch(`${FAL_BASE_URL}/${providerEndpoint}`, {
      method: "POST",
      headers: {
        "Authorization": `Key ${FAL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        seconds_total: duration || 30,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Fal.ai error:", errorText);
      throw new Error(`Music generation failed: ${response.status}`);
    }

    const falData = await response.json();
    const taskId = falData.request_id;

    // Deduct credits
    if (!hasSubscription) {
      await supabase
        .from('profiles')
        .update({ credits: profile.credits - CREDIT_COST })
        .eq('user_id', user.id);
    }

    // Log generation
    const { data: genData, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        type: 'music',
        model: 'stable-audio',
        prompt: fullPrompt,
        title: title || null,
        status: 'processing',
        task_id: taskId,
        provider_endpoint: providerEndpoint,
        credits_used: CREDIT_COST,
      })
      .select('id')
      .single();

    if (genError) {
      console.error("Error logging generation:", genError);
    }

    console.log("Music generation queued successfully:", taskId);

    return new Response(
      JSON.stringify({ 
        success: true,
        status: 'processing',
        taskId,
        generationId: genData?.id,
        creditsUsed: CREDIT_COST,
        message: "Music is being generated. Check Library for results.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Music generation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
