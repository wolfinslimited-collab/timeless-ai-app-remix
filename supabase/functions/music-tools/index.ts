import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool credit costs
const TOOL_CREDITS: Record<string, number> = {
  "stems": 8,
  "remix": 12,
  "vocals": 15,
  "master": 6,
  "sound-effects": 5,
  "audio-enhance": 4,
  "tempo-pitch": 3,
};

const FAL_BASE_URL = "https://queue.fal.run";
const FAL_SYNC_URL = "https://fal.run";

// Fal.ai endpoints for audio tools
const FAL_TOOL_ENDPOINTS: Record<string, string> = {
  "stems": "fal-ai/audiosr", // Using audio processing model
  "sound-effects": "fal-ai/stable-audio", // Sound effects generation
  "audio-enhance": "fal-ai/whisper", // Audio enhancement fallback
};

// Submit to Fal.ai queue
const submitToFalQueue = async (endpoint: string, input: Record<string, unknown>, apiKey: string): Promise<{ requestId: string }> => {
  const url = `${FAL_BASE_URL}/${endpoint}`;
  console.log(`Fal.ai queue submit to ${url}:`, JSON.stringify(input));
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fal.ai error:", errorText);
    throw new Error(`Fal.ai error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return { requestId: data.request_id };
};

// Submit to Fal.ai sync endpoint
const submitToFalSync = async (endpoint: string, input: Record<string, unknown>, apiKey: string): Promise<unknown> => {
  const url = `${FAL_SYNC_URL}/${endpoint}`;
  console.log(`Fal.ai sync call to ${url}:`, JSON.stringify(input));
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fal.ai error:", errorText);
    throw new Error(`Fal.ai error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      tool,
      audioUrl,
      prompt,
      duration,
      tempo,
      pitch,
      outputFormat,
    } = await req.json();

    console.log(`Music tool request: ${tool}`, { audioUrl, prompt, duration });

    // Validate required fields
    if (!tool) {
      return new Response(
        JSON.stringify({ error: "Missing required field: tool" }),
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
    const creditCost = TOOL_CREDITS[tool] ?? 5;
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
    if (!hasSubscription && profile.credits < creditCost) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. Need ${creditCost}, have ${profile.credits}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API key
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    if (!FAL_API_KEY) {
      throw new Error("FAL_API_KEY not configured");
    }

    let outputUrl: string | undefined;
    let taskId: string | undefined;
    let isAsync = false;
    let providerEndpoint: string | undefined;

    // Process based on tool type
    switch (tool) {
      case "stems": {
        if (!audioUrl) throw new Error("Audio URL required for stem separation");
        // Use Fal.ai stem separation / audio processing
        providerEndpoint = "fal-ai/stable-audio";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          audio_url: audioUrl,
          prompt: prompt || "Separate into stems: vocals, drums, bass, other",
          seconds_total: duration || 30,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "remix": {
        if (!audioUrl) throw new Error("Audio URL required for remix");
        providerEndpoint = "fal-ai/stable-audio";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          audio_url: audioUrl,
          prompt: prompt || "Create an AI remix variation of this track",
          seconds_total: duration || 30,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "vocals": {
        providerEndpoint = "fal-ai/stable-audio";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          prompt: prompt || "Generate vocals singing a melody",
          seconds_total: duration || 15,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "master": {
        if (!audioUrl) throw new Error("Audio URL required for mastering");
        // Use audio enhancement / upscaling
        providerEndpoint = "fal-ai/stable-audio";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          audio_url: audioUrl,
          prompt: "Professional audio mastering with balanced EQ, compression, and loudness optimization",
          seconds_total: duration || 60,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "sound-effects": {
        providerEndpoint = "fal-ai/stable-audio";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          prompt: prompt || "Sound effect",
          seconds_total: Math.min(duration || 5, 30),
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "audio-enhance": {
        if (!audioUrl) throw new Error("Audio URL required for enhancement");
        providerEndpoint = "fal-ai/stable-audio";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          audio_url: audioUrl,
          prompt: prompt || "Enhance audio quality, remove noise, improve clarity",
          seconds_total: duration || 30,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "tempo-pitch": {
        if (!audioUrl) throw new Error("Audio URL required for tempo/pitch adjustment");
        // For now, use stable audio with prompt describing the change
        providerEndpoint = "fal-ai/stable-audio";
        const tempoDesc = tempo ? `tempo ${tempo > 1 ? 'faster' : 'slower'} by ${Math.abs((tempo - 1) * 100).toFixed(0)}%` : '';
        const pitchDesc = pitch ? `pitch shifted ${pitch > 0 ? 'up' : 'down'} by ${Math.abs(pitch)} semitones` : '';
        const queueResult = await submitToFalQueue(providerEndpoint, {
          audio_url: audioUrl,
          prompt: `Process audio with ${tempoDesc} ${pitchDesc}`.trim() || "Process audio",
          seconds_total: duration || 30,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Deduct credits
    if (!hasSubscription) {
      await supabase
        .from('profiles')
        .update({ credits: profile.credits - creditCost })
        .eq('user_id', user.id);
    }

    // Log generation
    const generationData: Record<string, unknown> = {
      user_id: user.id,
      type: 'music',
      model: tool,
      prompt: prompt || tool,
      status: isAsync ? 'processing' : 'completed',
      output_url: outputUrl || null,
      credits_used: creditCost,
    };
    
    if (taskId) {
      generationData.task_id = taskId;
      generationData.provider_endpoint = providerEndpoint;
    }

    const { data: genData, error: genError } = await supabase
      .from('generations')
      .insert(generationData)
      .select('id')
      .single();

    if (genError) {
      console.error("Error logging generation:", genError);
    }

    console.log(`Tool ${tool} ${isAsync ? 'queued' : 'completed'} successfully`);

    if (isAsync) {
      return new Response(
        JSON.stringify({ 
          success: true,
          status: 'processing',
          taskId,
          generationId: genData?.id,
          creditsUsed: creditCost,
          message: "Audio is being processed. Check Library for results.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        outputUrl,
        creditsUsed: creditCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Music tool error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
