import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model-specific credit costs (Fal.ai + Lovable AI models)
const MODEL_CREDITS: Record<string, number> = {
  // Image models - Lovable AI
  "nano-banana": 4,
  
  // Image models - Fal.ai
  "gpt-image-1.5": 10,
  "flux-1.1-pro": 5,
  "flux-pro-ultra": 8,
  "flux-dev": 3,
  "flux-schnell": 2,
  "ideogram-v2": 6,
  "stable-diffusion-3": 4,
  "sdxl": 3,
  "sdxl-lightning": 2,
  "recraft-v3": 5,
  "aura-flow": 4,
  "playground-v2.5": 4,
  
  // Video models
  "wan-2.6": 15,
  "kling-2.6": 25,
  "veo-3": 30,
  "veo-3-fast": 20,
  "hailuo-02": 18,
  "seedance-1.5": 20,
  "luma": 22,
  "hunyuan-1.5": 18,

  // Music models - Fal.ai
  "sonauto": 15,
  "cassetteai": 10,
  "lyria2": 12,
  "stable-audio": 8,
};

// Fallback costs
const DEFAULT_CREDITS = {
  image: 5,
  video: 15,
  music: 10,
};

// Quality multipliers
const QUALITY_MULTIPLIERS: Record<string, number> = {
  "480p": 0.8,
  "720p": 1.0,
  "1080p": 1.5,
};

const getModelCost = (model: string, type: string, quality?: string): number => {
  const baseCost = MODEL_CREDITS[model] ?? DEFAULT_CREDITS[type as keyof typeof DEFAULT_CREDITS] ?? 5;
  if (quality && QUALITY_MULTIPLIERS[quality]) {
    return Math.round(baseCost * QUALITY_MULTIPLIERS[quality]);
  }
  return baseCost;
};

// Fal.ai API configuration
const FAL_BASE_URL = "https://queue.fal.run";

// Lovable AI configuration
const LOVABLE_AI_BASE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Fal.ai Image Models
const FAL_IMAGE_MODELS: Record<string, string> = {
  "gpt-image-1.5": "fal-ai/gpt-image-1.5",
  "flux-1.1-pro": "fal-ai/flux-pro/v1.1",
  "flux-pro-ultra": "fal-ai/flux-pro/v1.1-ultra",
  "flux-dev": "fal-ai/flux/dev",
  "flux-schnell": "fal-ai/flux/schnell",
  "ideogram-v2": "fal-ai/ideogram/v2",
  "stable-diffusion-3": "fal-ai/stable-diffusion-v3-medium",
  "sdxl": "fal-ai/fast-sdxl",
  "sdxl-lightning": "fal-ai/fast-lightning-sdxl",
  "recraft-v3": "fal-ai/recraft-v3",
  "aura-flow": "fal-ai/aura-flow",
  "playground-v2.5": "fal-ai/playground-v25",
};

// Lovable AI Image Models
const LOVABLE_IMAGE_MODELS: Record<string, string> = {
  "nano-banana": "google/gemini-2.5-flash-image-preview",
};

// Fal.ai Music Models
type FalMusicModelConfig = {
  endpoint: string;
  maxPollingTime: number;
};

const FAL_MUSIC_MODELS: Record<string, FalMusicModelConfig> = {
  "sonauto": {
    endpoint: "sonauto/v2/text-to-music",
    maxPollingTime: 300,
  },
  "cassetteai": {
    endpoint: "cassetteai/music-generator",
    maxPollingTime: 120,
  },
  "lyria2": {
    endpoint: "fal-ai/lyria2",
    maxPollingTime: 180,
  },
  "stable-audio": {
    endpoint: "fal-ai/stable-audio",
    maxPollingTime: 120,
  },
};

// Build Fal.ai music request
const buildFalMusicRequest = (args: {
  prompt: string;
  model: string;
  lyrics?: string;
  duration?: number;
}) => {
  const { prompt, model, lyrics, duration } = args;
  
  // Sonauto uses different parameters
  if (model === "sonauto") {
    const input: Record<string, unknown> = {
      prompt,
      duration: duration ?? 30,
    };
    // Sonauto supports lyrics_prompt for song lyrics
    if (lyrics) {
      input.lyrics_prompt = lyrics;
    }
    return input;
  }
  
  // Default format for other models
  const input: Record<string, unknown> = {
    prompt,
    duration: duration ?? 30,
  };
  
  return input;
};

// Fal.ai Video Models with text-to-video and image-to-video endpoints
type FalVideoModelConfig = {
  t2v: string;  // text-to-video endpoint
  i2v: string;  // image-to-video endpoint
  duration?: number;
  maxPollingTime: number;
};

const FAL_VIDEO_MODELS: Record<string, FalVideoModelConfig> = {
  "wan-2.6": {
    t2v: "fal-ai/wan/v2.6/text-to-video",
    i2v: "fal-ai/wan/v2.6/image-to-video",
    duration: 5,
    maxPollingTime: 420,
  },
  "kling-2.6": {
    t2v: "fal-ai/kling-video/v2.6/pro/text-to-video",
    i2v: "fal-ai/kling-video/v2.6/pro/image-to-video",
    duration: 5,
    maxPollingTime: 600,
  },
  "veo-3": {
    t2v: "fal-ai/veo3",
    i2v: "fal-ai/veo3.1/image-to-video",
    duration: 8,
    maxPollingTime: 900,
  },
  "veo-3-fast": {
    t2v: "fal-ai/veo3/fast",
    i2v: "fal-ai/veo3/fast/image-to-video",
    duration: 5,
    maxPollingTime: 600,
  },
  "hailuo-02": {
    t2v: "fal-ai/minimax/hailuo-02/standard/text-to-video",
    i2v: "fal-ai/minimax/hailuo-02/standard/image-to-video",
    duration: 5,
    maxPollingTime: 420,
  },
  "seedance-1.5": {
    t2v: "fal-ai/bytedance/seedance/v1.5/pro/text-to-video",
    i2v: "fal-ai/bytedance/seedance/v1.5/pro/image-to-video",
    duration: 5,
    maxPollingTime: 420,
  },
  "luma": {
    t2v: "fal-ai/luma-dream-machine",
    i2v: "fal-ai/luma-dream-machine/image-to-video",
    duration: 5,
    maxPollingTime: 600,
  },
  "hunyuan-1.5": {
    t2v: "fal-ai/hunyuan-video-v1.5/text-to-video",
    i2v: "fal-ai/hunyuan-video-v1.5/image-to-video",
    duration: 5,
    maxPollingTime: 600,
  },
};

// Build Fal.ai video request
const buildFalVideoRequest = (args: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  quality: string;
  duration?: number;
  imageUrl?: string | null;
}) => {
  const { prompt, negativePrompt, aspectRatio, quality, duration, imageUrl } = args;
  
  // Fal.ai uses specific aspect ratio formats
  let falAspectRatio: string = aspectRatio;
  
  // Some models prefer landscape/portrait/square
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: falAspectRatio,
  };
  
  if (negativePrompt) {
    input.negative_prompt = negativePrompt;
  }

  // Duration (seconds)
  if (duration) {
    input.duration = duration;
  }

  // Resolution mapping
  if (quality === "480p") {
    input.resolution = "480p";
  } else if (quality === "1080p") {
    input.resolution = "1080p";
  } else {
    input.resolution = "720p";
  }

  // Image for I2V
  if (imageUrl) {
    input.image_url = imageUrl;
  }
  
  return input;
};

// Build Fal.ai image request
const buildFalImageRequest = (args: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  model: string;
}) => {
  const { prompt, negativePrompt, aspectRatio, model } = args;
  
  const input: Record<string, unknown> = {
    prompt,
  };
  
  if (negativePrompt) {
    input.negative_prompt = negativePrompt;
  }

  // Map aspect ratio to image size
  const sizeMap: Record<string, { width: number; height: number }> = {
    "1:1": { width: 1024, height: 1024 },
    "16:9": { width: 1344, height: 768 },
    "9:16": { width: 768, height: 1344 },
    "4:3": { width: 1152, height: 896 },
    "3:4": { width: 896, height: 1152 },
    "3:2": { width: 1216, height: 832 },
    "2:3": { width: 832, height: 1216 },
  };
  
  const size = sizeMap[aspectRatio] || sizeMap["1:1"];
  
  // GPT Image 1.5 uses string format for size, others use object
  if (model === "gpt-image-1.5") {
    input.size = `${size.width}x${size.height}`;
  } else {
    input.image_size = { width: size.width, height: size.height };
  }
  
  return input;
};

// Submit to Fal.ai queue
const submitToFal = async (endpoint: string, input: Record<string, unknown>, apiKey: string): Promise<{ requestId: string }> => {
  const url = `${FAL_BASE_URL}/${endpoint}`;
  console.log(`Fal.ai submit to ${url}:`, JSON.stringify(input));
  
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
    console.error("Fal.ai submit error:", errorText);
    throw new Error(`Fal.ai error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log("Fal.ai submit response:", JSON.stringify(data));
  return { requestId: data.request_id };
};

// Check Fal.ai queue status
const checkFalStatus = async (endpoint: string, requestId: string, apiKey: string): Promise<{
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  error?: string;
}> => {
  // Extract base path for status check
  const basePath = endpoint.split('/').slice(0, 2).join('/');
  const url = `${FAL_BASE_URL}/${basePath}/requests/${requestId}/status`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Key ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fal.ai status error:", errorText);
    return { status: "FAILED", error: errorText };
  }
  
  const data = await response.json();
  return { status: data.status };
};

// Get Fal.ai result
const getFalResult = async (endpoint: string, requestId: string, apiKey: string): Promise<{
  video?: { url: string };
  images?: Array<{ url: string }>;
}> => {
  const basePath = endpoint.split('/').slice(0, 2).join('/');
  const url = `${FAL_BASE_URL}/${basePath}/requests/${requestId}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Key ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Fal.ai result error:", errorText);
    throw new Error(`Failed to get Fal.ai result: ${errorText}`);
  }
  
  return await response.json();
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, negativePrompt, type, model, aspectRatio = "1:1", quality = "720p", imageUrl, stream = false, background = false, lyrics, instrumental } = await req.json();

    // SSE streaming response for real-time progress (video)
    if (stream && type === "video") {
      const encoder = new TextEncoder();
      const streamHeaders = {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };

      const readableStream = new ReadableStream({
        async start(controller) {
          const sendEvent = (event: string, data: any) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            sendEvent('status', { stage: 'auth', message: 'Authenticating...' });

            const authHeader = req.headers.get('Authorization');
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
            const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
            
            const supabase = createClient(supabaseUrl, supabaseKey, {
              global: { headers: { Authorization: authHeader || '' } }
            });

            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
              sendEvent('error', { message: 'Unauthorized' });
              controller.close();
              return;
            }

            sendEvent('status', { stage: 'credits', message: 'Checking credits...' });

            const creditCost = getModelCost(model, type, quality);
            
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("credits, subscription_status")
              .eq("user_id", user.id)
              .single();

            if (profileError) {
              sendEvent('error', { message: 'Could not fetch user profile' });
              controller.close();
              return;
            }

            const currentCredits = profile?.credits ?? 0;
            const hasActiveSubscription = profile?.subscription_status === 'active';

            if (!hasActiveSubscription && currentCredits < creditCost) {
              sendEvent('error', { message: 'Insufficient credits', required: creditCost, available: currentCredits });
              controller.close();
              return;
            }

            if (!hasActiveSubscription) {
              await supabase.from("profiles").update({ credits: currentCredits - creditCost }).eq("user_id", user.id);
            }

            const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
            if (!FAL_API_KEY) {
              if (!hasActiveSubscription) {
                await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
              }
              sendEvent('error', { message: 'FAL_API_KEY not configured' });
              controller.close();
              return;
            }

            const modelConfig = FAL_VIDEO_MODELS[model];
            if (!modelConfig) {
              if (!hasActiveSubscription) {
                await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
              }
              sendEvent('error', { message: `Unknown video model: ${model}` });
              controller.close();
              return;
            }

            sendEvent('status', { stage: 'submitting', message: 'Submitting to Fal.ai...', progress: 5 });

            // Choose T2V or I2V endpoint
            const endpoint = imageUrl ? modelConfig.i2v : modelConfig.t2v;
            
            const falInput = buildFalVideoRequest({
              prompt,
              negativePrompt,
              aspectRatio,
              quality,
              duration: modelConfig.duration,
              imageUrl,
            });

            let taskId: string;
            try {
              const result = await submitToFal(endpoint, falInput, FAL_API_KEY);
              taskId = result.requestId;
              console.log(`Fal.ai task submitted: ${taskId}`);
            } catch (error) {
              if (!hasActiveSubscription) {
                await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
              }
              const errorMsg = error instanceof Error ? error.message : 'Unknown error';
              sendEvent('error', { message: errorMsg });
              controller.close();
              return;
            }

            sendEvent('status', { stage: 'queued', message: 'Video queued for processing...', progress: 10, taskId });

            // If background mode, save pending generation and return immediately
            if (background) {
              const { data: generation } = await supabase
                .from("generations")
                .insert({
                  user_id: user.id,
                  prompt: prompt,
                  type: type,
                  model: model,
                  status: "pending",
                  task_id: taskId,
                  provider_endpoint: `fal:${endpoint}`,
                  aspect_ratio: aspectRatio,
                  quality: quality,
                  credits_used: creditCost,
                })
                .select()
                .single();

              sendEvent('background', { 
                message: 'Generation started in background. You can leave this page.',
                generation,
                taskId,
              });
              controller.close();
              return;
            }

            // Poll for result
            const pollInterval = 5000;
            const maxPollingTime = modelConfig.maxPollingTime;
            const maxAttempts = Math.ceil(maxPollingTime / (pollInterval / 1000));

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await new Promise(resolve => setTimeout(resolve, pollInterval));
              
              const elapsedSeconds = (attempt + 1) * (pollInterval / 1000);
              const progress = Math.min(10 + Math.round((attempt / maxAttempts) * 85), 95);
              sendEvent('status', { 
                stage: 'processing', 
                message: `Generating video... (${elapsedSeconds}s / ~${maxPollingTime}s)`, 
                progress,
                attempt: attempt + 1,
                maxAttempts
              });

              try {
                const statusResult = await checkFalStatus(endpoint, taskId, FAL_API_KEY);
                console.log(`Fal.ai poll attempt ${attempt + 1}: status=${statusResult.status}`);

                if (statusResult.status === "COMPLETED") {
                  const result = await getFalResult(endpoint, taskId, FAL_API_KEY);
                  const videoUrl = result.video?.url;
                  
                  if (videoUrl) {
                    const { data: generation } = await supabase
                      .from("generations")
                      .insert({
                        user_id: user.id,
                        prompt: prompt,
                        type: type,
                        model: model,
                        status: "completed",
                        output_url: videoUrl,
                        thumbnail_url: videoUrl,
                        credits_used: creditCost,
                        provider_endpoint: `fal:${endpoint}`,
                      })
                      .select()
                      .single();

                    sendEvent('complete', { 
                      result: { type: 'video', output_url: videoUrl, thumbnail_url: videoUrl },
                      generation,
                      credits_remaining: hasActiveSubscription ? currentCredits : currentCredits - creditCost
                    });
                    controller.close();
                    return;
                  }
                } else if (statusResult.status === "FAILED") {
                  if (!hasActiveSubscription) {
                    await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                  }
                  sendEvent('error', { message: statusResult.error || 'Video generation failed' });
                  controller.close();
                  return;
                }
                // IN_QUEUE and IN_PROGRESS continue polling
              } catch (error) {
                console.error(`Fal.ai poll error:`, error);
              }
            }

            // Timeout - save as pending
            const { data: pendingGen } = await supabase
              .from("generations")
              .insert({
                user_id: user.id,
                prompt: prompt,
                type: type,
                model: model,
                status: "pending",
                task_id: taskId,
                provider_endpoint: `fal:${endpoint}`,
                aspect_ratio: aspectRatio,
                quality: quality,
                credits_used: creditCost,
              })
              .select()
              .single();

            sendEvent('timeout_pending', { 
              message: 'Generation is taking longer than expected. It will continue in the background.',
              generation: pendingGen,
              taskId,
            });
            controller.close();

          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            sendEvent('error', { message: errorMessage });
            controller.close();
          }
        }
      });

      return new Response(readableStream, { headers: streamHeaders });
    }
    
    // Non-streaming mode (images)
    console.log(`Generation request - Type: ${type}, Model: ${model}, Aspect: ${aspectRatio}, Quality: ${quality}, Prompt: ${prompt?.substring(0, 50)}...`);

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.log("Auth error:", authError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User authenticated: ${user.id}`);

    // Check user profile for credits and subscription
    const creditCost = getModelCost(model, type);
    
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError.message);
      return new Response(
        JSON.stringify({ error: "Could not fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentCredits = profile?.credits ?? 0;
    const hasActiveSubscription = profile?.subscription_status === 'active';
    
    console.log(`User credits: ${currentCredits}, Subscription: ${hasActiveSubscription}, Cost: ${creditCost}`);

    // If user has active subscription, skip credit check
    if (!hasActiveSubscription) {
      if (currentCredits < creditCost) {
        return new Response(
          JSON.stringify({ 
            error: "Insufficient credits",
            required: creditCost,
            available: currentCredits
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Deduct credits before generation
      const { error: deductError } = await supabase
        .from("profiles")
        .update({ credits: currentCredits - creditCost })
        .eq("user_id", user.id);

      if (deductError) {
        console.error("Credit deduction error:", deductError.message);
        return new Response(
          JSON.stringify({ error: "Failed to deduct credits" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Credits deducted: ${creditCost}, Remaining: ${currentCredits - creditCost}`);
    } else {
      console.log("User has active subscription - no credits deducted");
    }

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    if (!FAL_API_KEY) {
      // Refund credits
      if (!hasActiveSubscription) {
        await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
      }
      return new Response(
        JSON.stringify({ error: "FAL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // IMAGE GENERATION
    if (type === "image") {
      // Check if it's a Lovable AI model (e.g., Nano Banana)
      const lovableModel = LOVABLE_IMAGE_MODELS[model];
      if (lovableModel) {
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
        if (!LOVABLE_API_KEY) {
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          return new Response(
            JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          console.log(`Using Lovable AI model: ${lovableModel}`);
          
          const response = await fetch(LOVABLE_AI_BASE_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: lovableModel,
              messages: [
                {
                  role: "user",
                  content: `Generate an image: ${prompt}${aspectRatio ? `. Aspect ratio: ${aspectRatio}` : ""}`
                }
              ],
              modalities: ["image", "text"]
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Lovable AI error: ${errorText}`);
          }

          const data = await response.json();
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (!imageUrl) {
            throw new Error("No image generated from Lovable AI");
          }

          // Save to generations
          await supabase.from("generations").insert({
            user_id: user.id,
            prompt: prompt,
            type: type,
            model: model,
            status: "completed",
            output_url: imageUrl,
            thumbnail_url: imageUrl,
            credits_used: creditCost,
            provider_endpoint: `lovable:${lovableModel}`,
          });

          return new Response(
            JSON.stringify({
              success: true,
              result: { type: 'image', output_url: imageUrl },
              credits_remaining: hasActiveSubscription ? currentCredits : currentCredits - creditCost
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } catch (error) {
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          return new Response(
            JSON.stringify({ error: errorMessage }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Fal.ai image models
      const imageEndpoint = FAL_IMAGE_MODELS[model];
      if (!imageEndpoint) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({ error: `Unknown image model: ${model}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const falInput = buildFalImageRequest({
        prompt,
        negativePrompt,
        aspectRatio,
        model,
      });

      try {
        const { requestId } = await submitToFal(imageEndpoint, falInput, FAL_API_KEY);
        
        // Poll for result (images are usually fast)
        const maxAttempts = 60;
        const pollInterval = 2000;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          const status = await checkFalStatus(imageEndpoint, requestId, FAL_API_KEY);
          console.log(`Image poll attempt ${attempt + 1}: status=${status.status}`);
          
          if (status.status === "COMPLETED") {
            const result = await getFalResult(imageEndpoint, requestId, FAL_API_KEY);
            const imageUrl = result.images?.[0]?.url;
            
            if (imageUrl) {
              // Save to generations
              await supabase.from("generations").insert({
                user_id: user.id,
                prompt: prompt,
                type: type,
                model: model,
                status: "completed",
                output_url: imageUrl,
                thumbnail_url: imageUrl,
                credits_used: creditCost,
                provider_endpoint: `fal:${imageEndpoint}`,
              });

              return new Response(
                JSON.stringify({
                  success: true,
                  result: { type: 'image', output_url: imageUrl },
                  credits_remaining: hasActiveSubscription ? currentCredits : currentCredits - creditCost
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else if (status.status === "FAILED") {
            if (!hasActiveSubscription) {
              await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
            }
            return new Response(
              JSON.stringify({ error: status.error || "Image generation failed" }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Timeout
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({ error: "Image generation timed out" }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // VIDEO GENERATION (non-streaming fallback)
    if (type === "video") {
      const modelConfig = FAL_VIDEO_MODELS[model];
      if (!modelConfig) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({ error: `Unknown video model: ${model}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const endpoint = imageUrl ? modelConfig.i2v : modelConfig.t2v;
      const falInput = buildFalVideoRequest({
        prompt,
        negativePrompt,
        aspectRatio,
        quality,
        duration: modelConfig.duration,
        imageUrl,
      });

      try {
        const { requestId } = await submitToFal(endpoint, falInput, FAL_API_KEY);
        
        // Save as pending for background check
        await supabase.from("generations").insert({
          user_id: user.id,
          prompt: prompt,
          type: type,
          model: model,
          status: "pending",
          task_id: requestId,
          provider_endpoint: `fal:${endpoint}`,
          aspect_ratio: aspectRatio,
          quality: quality,
          credits_used: creditCost,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Video generation started",
            taskId: requestId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // MUSIC GENERATION
    if (type === "music") {
      const musicConfig = FAL_MUSIC_MODELS[model];
      if (!musicConfig) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({ error: `Unknown music model: ${model}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const falInput = buildFalMusicRequest({
        prompt,
        model,
        lyrics,
      });

      try {
        const { requestId } = await submitToFal(musicConfig.endpoint, falInput, FAL_API_KEY);
        
        // Poll for result
        const maxAttempts = 90;
        const pollInterval = 2000;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          const status = await checkFalStatus(musicConfig.endpoint, requestId, FAL_API_KEY);
          console.log(`Music poll attempt ${attempt + 1}: status=${status.status}`);
          
          if (status.status === "COMPLETED") {
            const result = await getFalResult(musicConfig.endpoint, requestId, FAL_API_KEY);
            console.log("Music result:", JSON.stringify(result));
            // CassetteAI returns audio_file.url, Lyria2/Stable Audio may use audio.url or audio_url
            const audioUrl = (result as any).audio_file?.url || (result as any).audio?.url || (result as any).audio_url || (result as any).output?.url;
            
            if (audioUrl) {
              await supabase.from("generations").insert({
                user_id: user.id,
                prompt: prompt,
                type: type,
                model: model,
                status: "completed",
                output_url: audioUrl,
                credits_used: creditCost,
                provider_endpoint: `fal:${musicConfig.endpoint}`,
              });

              return new Response(
                JSON.stringify({
                  success: true,
                  result: { type: 'music', output_url: audioUrl },
                  credits_remaining: hasActiveSubscription ? currentCredits : currentCredits - creditCost
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          } else if (status.status === "FAILED") {
            if (!hasActiveSubscription) {
              await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
            }
            return new Response(
              JSON.stringify({ error: status.error || "Music generation failed" }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Timeout
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({ error: "Music generation timed out" }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return new Response(
          JSON.stringify({ error: errorMessage }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: "Invalid generation type" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Generate error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});