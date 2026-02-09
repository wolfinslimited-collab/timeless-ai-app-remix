import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Credit cost for AI video editing
const AI_EDIT_CREDITS = 5;

// AI effect categories and their visual representations
const AI_EFFECT_CATEGORIES: Record<string, { category: string; intensity: number; color: string }> = {
  "sky": { category: "environment", intensity: 80, color: "#4B9CD3" },
  "sunset": { category: "color-grade", intensity: 70, color: "#FF6B35" },
  "night": { category: "environment", intensity: 90, color: "#1A1A2E" },
  "rain": { category: "weather", intensity: 60, color: "#6B7B8C" },
  "snow": { category: "weather", intensity: 65, color: "#E8E8E8" },
  "glow": { category: "lighting", intensity: 75, color: "#7CFC00" },
  "neon": { category: "lighting", intensity: 85, color: "#FF00FF" },
  "cinematic": { category: "color-grade", intensity: 70, color: "#2C3E50" },
  "vintage": { category: "color-grade", intensity: 65, color: "#D4A574" },
  "futuristic": { category: "environment", intensity: 80, color: "#00D4FF" },
  "particles": { category: "effects", intensity: 50, color: "#FFD700" },
  "blur": { category: "effects", intensity: 40, color: "#9B59B6" },
  "default": { category: "ai-generated", intensity: 70, color: "#8B5CF6" },
};

// Analyze prompt to determine effect type
function analyzePrompt(prompt: string): { category: string; intensity: number; color: string; effectName: string } {
  const promptLower = prompt.toLowerCase();
  
  // Check for specific keywords
  for (const [keyword, config] of Object.entries(AI_EFFECT_CATEGORIES)) {
    if (promptLower.includes(keyword)) {
      return {
        ...config,
        effectName: `AI: ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`,
      };
    }
  }
  
  // Default AI effect
  return {
    ...AI_EFFECT_CATEGORIES.default,
    effectName: `AI: ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}`,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      prompt,
      clipId,
      clipStartTime,
      clipEndTime,
    } = await req.json();

    console.log(`AI video edit request:`, { prompt, clipId, clipStartTime, clipEndTime });

    // Validate required fields
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the primary Timeless AI Supabase project for auth verification
    const primaryUrl = Deno.env.get("SUPABASE_URL") || "https://ifesxveahsbjhmrhkhhy.supabase.co";
    const primaryServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(primaryUrl, primaryServiceKey);

    // Verify user against primary project
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log("Auth error:", authError?.message);
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
    if (!hasSubscription && profile.credits < AI_EDIT_CREDITS) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. Need ${AI_EDIT_CREDITS}, have ${profile.credits}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Analyze the prompt to determine effect type
    const effectAnalysis = analyzePrompt(prompt);

    // Use Lovable AI to interpret the prompt and generate effect parameters
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // Call AI to enhance the effect interpretation
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a video effects expert. Given a user's natural language description, suggest specific effect parameters. Respond with JSON only.
            
Available effect categories: environment, color-grade, weather, lighting, effects, ai-generated
Intensity range: 0-100

Return format:
{
  "effectName": "short descriptive name",
  "category": "one of the categories",
  "intensity": number,
  "description": "brief description of what the effect does",
  "colorHex": "hex color representing the effect"
}`
          },
          {
            role: "user",
            content: `User prompt: "${prompt}". Generate appropriate effect parameters.`
          }
        ],
      }),
    });

    let aiEffectParams = effectAnalysis;
    
    if (aiResponse.ok) {
      try {
        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (content) {
          // Try to parse JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            aiEffectParams = {
              effectName: parsed.effectName || effectAnalysis.effectName,
              category: parsed.category || effectAnalysis.category,
              intensity: parsed.intensity || effectAnalysis.intensity,
              color: parsed.colorHex || effectAnalysis.color,
            };
          }
        }
      } catch (parseError) {
        console.log("Using fallback effect params due to parse error:", parseError);
      }
    }

    // Deduct credits
    if (!hasSubscription) {
      await supabase
        .from('profiles')
        .update({ credits: profile.credits - AI_EDIT_CREDITS })
        .eq('user_id', user.id);
    }

    // Log generation
    await supabase
      .from('generations')
      .insert({
        user_id: user.id,
        type: 'video',
        model: 'ai-video-edit',
        prompt: prompt,
        status: 'completed',
        credits_used: AI_EDIT_CREDITS,
      });

    console.log(`AI video edit completed for user ${user.id}`);

    // Return the effect layer data
    return new Response(
      JSON.stringify({ 
        success: true,
        effect: {
          id: `ai-effect-${Date.now()}`,
          effectId: `ai-${aiEffectParams.category}`,
          name: aiEffectParams.effectName,
          category: aiEffectParams.category,
          intensity: aiEffectParams.intensity,
          color: aiEffectParams.color,
          startTime: clipStartTime || 0,
          endTime: clipEndTime || 5,
          prompt: prompt,
          isAIGenerated: true,
        },
        creditsUsed: AI_EDIT_CREDITS,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("AI video edit error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
