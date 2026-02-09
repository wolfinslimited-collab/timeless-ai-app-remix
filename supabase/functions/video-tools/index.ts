import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool credit costs
const TOOL_CREDITS: Record<string, number> = {
  "video-upscale": 8,
  "ai-upscale": 12,
  "lip-sync": 15,
  "extend": 12,
  "interpolate": 6,
  "sketch-to-video": 18,
  "draw-to-video": 18,
  "sora-trends": 25,
  "click-to-ad": 20,
  "mixed-media": 15,
  "edit-video": 10,
  "ugc-factory": 20,
};

// Kei AI / Topaz upscale config
const KIE_BASE_URL = "https://api.kie.ai/api/v1";

// AI Upscale resolution presets
const AI_UPSCALE_RESOLUTIONS: Record<string, { width: number; height: number }> = {
  "1080p": { width: 1920, height: 1080 },
  "4k": { width: 3840, height: 2160 },
};

// Fal.ai endpoints for each tool
const FAL_BASE_URL = "https://queue.fal.run";
const FAL_SYNC_URL = "https://fal.run";

const FAL_TOOL_ENDPOINTS: Record<string, string> = {
  "video-upscale": "fal-ai/video-upscaler",
  "lip-sync": "fal-ai/sync-lipsync",
  "extend": "fal-ai/wan/v2.6/text-to-video", // Use video gen with image
  "interpolate": "fal-ai/frame-interpolation",
  "sketch-to-video": "fal-ai/wan/v2.6/image-to-video",
  "draw-to-video": "fal-ai/wan/v2.6/image-to-video",
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
      videoUrl,
      imageUrl,
      audioUrl,
      prompt,
      duration,
      targetFps,
      upscaleFactor,
      resolution,
    } = await req.json();

    console.log(`Video tool request: ${tool}`, { videoUrl, imageUrl, audioUrl, prompt, duration });

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

    let outputUrl: string | undefined;
    let taskId: string | undefined;
    let isAsync = false;
    let providerEndpoint: string | undefined;

    // Process based on tool type
    switch (tool) {
      case "video-upscale": {
        if (!videoUrl) throw new Error("Video URL required for upscaling");
        const result = await submitToFalSync(FAL_TOOL_ENDPOINTS["video-upscale"], {
          video_url: videoUrl,
          upscale_factor: upscaleFactor || 2,
        }, FAL_API_KEY) as { video: { url: string } };
        outputUrl = result.video?.url;
        break;
      }

      case "ai-upscale": {
        // Topaz AI upscale via Kei AI integration
        if (!videoUrl) throw new Error("Video URL required for AI upscaling");
        const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
        if (!KIE_API_KEY) throw new Error("KIE_API_KEY not configured");

        const targetRes = AI_UPSCALE_RESOLUTIONS[resolution || "1080p"] || AI_UPSCALE_RESOLUTIONS["1080p"];
        
        // Submit upscale task to Kei AI
        const kieResponse = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${KIE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "topaz",
            input: {
              video_url: videoUrl,
              target_width: targetRes.width,
              target_height: targetRes.height,
              enhance_quality: true,
            },
          }),
        });

        if (!kieResponse.ok) {
          const errText = await kieResponse.text();
          console.error("Kei AI upscale error:", errText);
          throw new Error(`AI Upscale failed: ${kieResponse.status}`);
        }

        const kieData = await kieResponse.json();
        taskId = kieData.data?.task_id || kieData.task_id;
        providerEndpoint = "kie-ai/topaz-upscale";
        isAsync = true;
        break;
      }

      case "lip-sync": {
        if (!videoUrl || !audioUrl) throw new Error("Video URL and Audio URL required for lip sync");
        providerEndpoint = FAL_TOOL_ENDPOINTS["lip-sync"];
        const queueResult = await submitToFalQueue(providerEndpoint, {
          video_url: videoUrl,
          audio_url: audioUrl,
          sync_mode: "accurate",
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "extend": {
        if (!videoUrl) throw new Error("Video URL required for extending");
        // Use image-to-video with last frame extracted conceptually
        providerEndpoint = "fal-ai/wan/v2.6/image-to-video";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          image_url: videoUrl, // For now, user provides last frame as image
          prompt: prompt || "Continue this scene seamlessly",
          duration: duration || 5,
          aspect_ratio: "16:9",
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "interpolate": {
        if (!videoUrl) throw new Error("Video URL required for interpolation");
        const result = await submitToFalSync(FAL_TOOL_ENDPOINTS["interpolate"], {
          video_url: videoUrl,
          target_fps: targetFps || 60,
        }, FAL_API_KEY) as { video: { url: string } };
        outputUrl = result.video?.url;
        break;
      }

      case "sketch-to-video":
      case "draw-to-video": {
        if (!imageUrl) throw new Error("Sketch/Drawing image required");
        providerEndpoint = FAL_TOOL_ENDPOINTS["sketch-to-video"];
        const queueResult = await submitToFalQueue(providerEndpoint, {
          image_url: imageUrl,
          prompt: prompt || "Animate this sketch with smooth motion",
          duration: duration || 5,
          aspect_ratio: "16:9",
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "sora-trends": {
        // Use latest trending video model
        providerEndpoint = "fal-ai/veo3";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          prompt: prompt || "Trending viral video concept",
          aspect_ratio: "9:16", // Vertical for social
          duration: duration || 5,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "click-to-ad": {
        // Generate product ad video
        providerEndpoint = "fal-ai/wan/v2.6/text-to-video";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          prompt: prompt || "Professional product advertisement video",
          aspect_ratio: "9:16",
          duration: duration || 5,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "ugc-factory": {
        // Generate UGC-style video with avatar
        providerEndpoint = "fal-ai/wan/v2.6/text-to-video";
        const queueResult = await submitToFalQueue(providerEndpoint, {
          prompt: `UGC style video, person speaking to camera, authentic look: ${prompt || "product review"}`,
          aspect_ratio: "9:16",
          duration: duration || 5,
        }, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "mixed-media": {
        // Mixed media generation
        providerEndpoint = "fal-ai/wan/v2.6/text-to-video";
        const input: Record<string, unknown> = {
          prompt: prompt || "Mixed media art style video",
          aspect_ratio: "16:9",
          duration: duration || 5,
        };
        if (imageUrl) {
          input.image_url = imageUrl;
          providerEndpoint = "fal-ai/wan/v2.6/image-to-video";
        }
        const queueResult = await submitToFalQueue(providerEndpoint, input, FAL_API_KEY);
        taskId = queueResult.requestId;
        isAsync = true;
        break;
      }

      case "edit-video": {
        // For now, redirect to inpainting-style editing
        return new Response(
          JSON.stringify({ error: "Edit Video coming soon - use other tools for specific edits" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
          message: "Video is being processed. Check Library for results.",
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
    console.error("Video tool error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
