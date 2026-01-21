import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool credit costs
const TOOL_CREDITS: Record<string, number> = {
  "camera-control": 15,
  "motion-path": 18,
  "depth-control": 12,
  "lens-effects": 10,
  "color-grade": 8,
  "stabilize": 8,
};

const FAL_BASE_URL = "https://queue.fal.run";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      tool,
      videoUrl,
      imageUrl,
      prompt,
      intensity,
      duration,
      movements,
      lensType,
      colorPreset,
      stabilizationMode,
    } = await req.json();

    console.log(`Cinema tool request: ${tool}`, { videoUrl, imageUrl, prompt, duration });

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
    const creditCost = TOOL_CREDITS[tool] ?? 10;
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

    let taskId: string | undefined;
    let providerEndpoint: string | undefined;

    // Build cinematic prompt based on tool
    const buildCinemaPrompt = (basePrompt: string, options: Record<string, unknown>) => {
      let cinematicPrompt = basePrompt;
      
      if (options.movements && Array.isArray(options.movements)) {
        cinematicPrompt += ` Camera movements: ${options.movements.join(", ")}.`;
      }
      if (options.lensType) {
        cinematicPrompt += ` Shot on ${options.lensType} lens.`;
      }
      if (options.colorPreset) {
        cinematicPrompt += ` ${options.colorPreset} color grading.`;
      }
      
      return cinematicPrompt;
    };

    // Process based on tool type
    switch (tool) {
      case "camera-control": {
        providerEndpoint = imageUrl 
          ? "fal-ai/wan/v2.6/image-to-video"
          : "fal-ai/wan/v2.6/text-to-video";
        
        const cinematicPrompt = buildCinemaPrompt(
          prompt || "Cinematic shot with precise camera movement",
          { movements }
        );
        
        const input: Record<string, unknown> = {
          prompt: cinematicPrompt,
          aspect_ratio: "16:9",
          duration: duration || 5,
        };
        
        if (imageUrl) {
          input.image_url = imageUrl;
        }
        
        const queueResult = await submitToFalQueue(providerEndpoint, input, FAL_API_KEY);
        taskId = queueResult.requestId;
        break;
      }

      case "motion-path": {
        providerEndpoint = "fal-ai/wan/v2.6/image-to-video";
        
        if (!imageUrl) {
          throw new Error("Image required for motion path");
        }
        
        const cinematicPrompt = buildCinemaPrompt(
          prompt || "Smooth camera motion following a custom path",
          {}
        );
        
        const queueResult = await submitToFalQueue(providerEndpoint, {
          image_url: imageUrl,
          prompt: cinematicPrompt,
          aspect_ratio: "16:9",
          duration: duration || 5,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        break;
      }

      case "depth-control": {
        providerEndpoint = imageUrl 
          ? "fal-ai/wan/v2.6/image-to-video"
          : "fal-ai/wan/v2.6/text-to-video";
        
        const cinematicPrompt = `${prompt || "Cinematic shot"}, shallow depth of field, bokeh background, professional cinematography`;
        
        const input: Record<string, unknown> = {
          prompt: cinematicPrompt,
          aspect_ratio: "16:9",
          duration: duration || 5,
        };
        
        if (imageUrl) {
          input.image_url = imageUrl;
        }
        
        const queueResult = await submitToFalQueue(providerEndpoint, input, FAL_API_KEY);
        taskId = queueResult.requestId;
        break;
      }

      case "lens-effects": {
        providerEndpoint = imageUrl 
          ? "fal-ai/wan/v2.6/image-to-video"
          : "fal-ai/wan/v2.6/text-to-video";
        
        const lensPrompt = buildCinemaPrompt(
          prompt || "Cinematic shot",
          { lensType: lensType || "anamorphic" }
        );
        
        const cinematicPrompt = `${lensPrompt}, lens flare, cinematic lighting, film grain, vignette`;
        
        const input: Record<string, unknown> = {
          prompt: cinematicPrompt,
          aspect_ratio: "21:9",
          duration: duration || 5,
        };
        
        if (imageUrl) {
          input.image_url = imageUrl;
        }
        
        const queueResult = await submitToFalQueue(providerEndpoint, input, FAL_API_KEY);
        taskId = queueResult.requestId;
        break;
      }

      case "color-grade": {
        providerEndpoint = imageUrl 
          ? "fal-ai/wan/v2.6/image-to-video"
          : "fal-ai/wan/v2.6/text-to-video";
        
        const colorPrompt = buildCinemaPrompt(
          prompt || "Cinematic shot",
          { colorPreset: colorPreset || "cinematic" }
        );
        
        const input: Record<string, unknown> = {
          prompt: colorPrompt,
          aspect_ratio: "16:9",
          duration: duration || 5,
        };
        
        if (imageUrl) {
          input.image_url = imageUrl;
        }
        
        const queueResult = await submitToFalQueue(providerEndpoint, input, FAL_API_KEY);
        taskId = queueResult.requestId;
        break;
      }

      case "stabilize": {
        if (!videoUrl) {
          throw new Error("Video required for stabilization");
        }
        
        // Use video upscaler as stabilization approximation
        providerEndpoint = "fal-ai/video-upscaler";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          video_url: videoUrl,
          upscale_factor: 1, // Just process without upscaling
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
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
      type: 'video',
      model: `cinema-${tool}`,
      prompt: prompt || tool,
      status: 'processing',
      credits_used: creditCost,
      task_id: taskId,
      provider_endpoint: providerEndpoint,
    };

    const { data: genData, error: genError } = await supabase
      .from('generations')
      .insert(generationData)
      .select('id')
      .single();

    if (genError) {
      console.error("Error logging generation:", genError);
    }

    console.log(`Cinema tool ${tool} queued successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        status: 'processing',
        taskId,
        generationId: genData?.id,
        creditsUsed: creditCost,
        message: "Video is being processed. Check Library for results.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Cinema tool error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
