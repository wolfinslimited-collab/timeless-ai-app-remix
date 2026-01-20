import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model-specific credit costs
const MODEL_CREDITS: Record<string, number> = {
  // Image models
  "flux-1.1-pro": 5,
  "flux-1.1-pro-ultra": 10,
  "ideogram-v2": 5,
  "ideogram-v2-turbo": 3,
  "recraft-v3": 5,
  "stable-diffusion-3.5": 4,
  "dall-e-3": 8,
  "midjourney": 10,
  
  // Video models (matching frontend catalog)
  "wan-2.6": 15,
  "kling-2.6": 22,
  "veo-3.1": 30,
  "sora-2-pro": 35,
  "hailuo-2.3": 18,
  "veo-3": 25,
  "sora-2": 28,
  "seedance-1.5": 20,
};

// Fallback costs
const DEFAULT_CREDITS = {
  image: 5,
  video: 15,
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

// Kie.ai API endpoints and model mappings
const KIE_IMAGE_MODELS: Record<string, { endpoint: string; model: string }> = {
  "flux-1.1-pro": { endpoint: "/flux/generate", model: "flux-1.1-pro" },
  "flux-1.1-pro-ultra": { endpoint: "/flux/generate", model: "flux-1.1-pro-ultra" },
  "ideogram-v2": { endpoint: "/ideogram/generate", model: "ideogram-v2" },
  "ideogram-v2-turbo": { endpoint: "/ideogram/generate", model: "ideogram-v2-turbo" },
  "recraft-v3": { endpoint: "/recraft/generate", model: "recraft-v3" },
  "stable-diffusion-3.5": { endpoint: "/stable-diffusion/generate", model: "sd3.5-large" },
  "dall-e-3": { endpoint: "/openai/generate", model: "dall-e-3" },
  "midjourney": { endpoint: "/midjourney/generate", model: "midjourney" },
};

type JobsImageField = "image_url" | "image_urls";

type KieVideoModelConfig = {
  endpoint: string;
  detailEndpoint: string;
  model: string;
  duration?: number;
  useAspectUnderscore?: boolean;
  maxPollingTime?: number;
  useJobsCreateTask?: boolean;
  jobsRequiresSoundFlag?: boolean;
  jobsImageField?: JobsImageField;
};

// All 8 video models with Kie.ai /jobs/createTask unified endpoint
const KIE_VIDEO_MODELS: Record<string, KieVideoModelConfig> = {
  // Wan 2.6 - Alibaba's latest model
  "wan-2.6": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "wan/wan2.1-t2v-turbo", 
    duration: 5, 
    maxPollingTime: 420, 
    useJobsCreateTask: true 
  },
  
  // Kling 2.6 - Kuaishou's model with audio sync
  "kling-2.6": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "kling-2.6/text-to-video", 
    duration: 5, 
    maxPollingTime: 420, 
    useJobsCreateTask: true, 
    jobsRequiresSoundFlag: true 
  },
  
  // Veo 3.1 - Google's latest video model
  "veo-3.1": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "veo/veo-3.1", 
    duration: 5, 
    maxPollingTime: 900, 
    useJobsCreateTask: true 
  },
  
  // Sora 2 Pro - OpenAI premium video
  "sora-2-pro": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "sora/sora-2-pro", 
    duration: 5, 
    maxPollingTime: 900, 
    useJobsCreateTask: true 
  },
  
  // Hailuo 2.3 - Fast generation model
  "hailuo-2.3": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "hailuo/hailuo-2.3", 
    duration: 5, 
    maxPollingTime: 420, 
    useJobsCreateTask: true 
  },
  
  // Veo 3 - Google video model
  "veo-3": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "veo/veo-3", 
    duration: 5, 
    maxPollingTime: 900, 
    useJobsCreateTask: true 
  },
  
  // Sora 2 - OpenAI video model
  "sora-2": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "sora/sora-2", 
    duration: 5, 
    maxPollingTime: 900, 
    useJobsCreateTask: true 
  },
  
  // Seedance 1.5 - Creative motion model
  "seedance-1.5": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "seedance/seedance-1.5", 
    duration: 5, 
    maxPollingTime: 420, 
    useJobsCreateTask: true 
  },
};

const getTaskIdFromKieResponse = (payload: any): string | null => {
  return (
    payload?.data?.taskId ??
    payload?.data?.task_id ??
    payload?.taskId ??
    payload?.task_id ??
    null
  );
};

const buildKieVideoRequestBody = (args: {
  model: string;
  modelConfig: KieVideoModelConfig;
  prompt: string;
  negativePrompt?: string;
  aspectRatio: string;
  quality: string;
  imageUrl?: string | null;
}) => {
  const { model, modelConfig, prompt, negativePrompt, aspectRatio, quality, imageUrl } = args;

  if (modelConfig.useJobsCreateTask) {
    const imageField: JobsImageField = modelConfig.jobsImageField ?? "image_url";
    const input: Record<string, unknown> = {
      prompt,
      duration: String(modelConfig.duration || 5),
      aspect_ratio: aspectRatio,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    };

    // Kling 2.6 docs require an explicit sound flag.
    if (modelConfig.jobsRequiresSoundFlag) {
      input.sound = false;
    }

    // Some providers expect resolution/quality on jobs endpoint; safe for Kling 2.6
    if (quality) {
      input.resolution = quality;
    }

    if (imageUrl) {
      if (imageField === "image_urls") {
        input.image_urls = [imageUrl];
      } else {
        input.image_url = imageUrl;
      }
    }

    return {
      model: modelConfig.model,
      input,
    };
  }

  return {
    prompt,
    model: modelConfig.model,
    ...(modelConfig.useAspectUnderscore ? { aspect_ratio: aspectRatio } : { aspectRatio }),
    quality,
    duration: modelConfig.duration || 5,
    ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    ...(imageUrl ? { image_url: imageUrl } : {}),
  };
};

const KIE_BASE_URL = "https://api.kie.ai/api/v1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, negativePrompt, type, model, aspectRatio = "1:1", quality = "720p", imageUrl, stream = false, background = false } = await req.json();

    // SSE streaming response for real-time progress
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

            const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
            if (!KIE_API_KEY) {
              if (!hasActiveSubscription) {
                await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
              }
              sendEvent('error', { message: 'API key not configured' });
              controller.close();
              return;
            }

            sendEvent('status', { stage: 'submitting', message: 'Submitting to AI...', progress: 5 });

            const modelConfig = KIE_VIDEO_MODELS[model];
            if (!modelConfig) {
              sendEvent('error', { message: `Unknown video model: ${model}` });
              controller.close();
              return;
            }

            // Build request body - Kling uses /jobs/createTask with nested input object
            const requestBody = buildKieVideoRequestBody({
              model,
              modelConfig,
              prompt,
              negativePrompt,
              aspectRatio,
              quality,
              imageUrl,
            });

            console.log(`Kling/Video request to ${modelConfig.endpoint}:`, JSON.stringify(requestBody));

            const generateResponse = await fetch(`${KIE_BASE_URL}${modelConfig.endpoint}`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${KIE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody)
            });

            if (!generateResponse.ok) {
              if (!hasActiveSubscription) {
                await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
              }
              sendEvent('error', { message: `API error: ${generateResponse.status}` });
              controller.close();
              return;
            }

            const generateData = await generateResponse.json();
            const taskId = getTaskIdFromKieResponse(generateData);

            if (!taskId) {
              const errorMsg = generateData?.msg || generateData?.message || generateData?.data?.msg || generateData?.data?.message || "Unknown error";
              console.error("Kie.ai createTask did not return taskId:", JSON.stringify(generateData));
              if (!hasActiveSubscription) {
                await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
              }
              sendEvent('error', { message: `Video API error: ${errorMsg}` });
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
                  provider_endpoint: modelConfig.detailEndpoint,
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

            // Poll for result with model-specific timeout
            const pollInterval = 5000;
            const maxPollingTime = modelConfig.maxPollingTime || 600; // Default 10 minutes
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

              const tryFetch = async (endpoint: string) => {
                const url = `${KIE_BASE_URL}${endpoint}?taskId=${encodeURIComponent(taskId)}`;
                return await fetch(url, {
                  method: "GET",
                  headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
                });
              };

              // Primary endpoint is model-specific; for deprecated endpoints, fall back to unified recordInfo.
              let statusResponse = await tryFetch(modelConfig.detailEndpoint);
              if (!statusResponse.ok && statusResponse.status === 404 && modelConfig.detailEndpoint !== "/jobs/recordInfo") {
                statusResponse = await tryFetch("/jobs/recordInfo");
              }

              if (!statusResponse.ok) continue;

              const statusData = await statusResponse.json();
              console.log(`Poll attempt ${attempt + 1}: Raw Veo/video response:`, JSON.stringify(statusData));

              // Unified endpoint returns a stringified JSON result in data.resultJson
              let unifiedResult: any = null;
              const resultJson = statusData?.data?.resultJson;
              if (typeof resultJson === "string") {
                try {
                  unifiedResult = JSON.parse(resultJson);
                } catch {
                  unifiedResult = null;
                }
              }
              
              // Extract status from multiple possible paths (different providers use different structures)
              const rawStatus =
                statusData?.data?.state ??
                statusData?.data?.response?.status ??
                statusData?.data?.status ??
                statusData?.data?.state ??
                statusData?.status ??
                statusData?.state;

              // Handle Veo's numeric successFlag (1 = success, 2/3 = failure)
              const successFlag = statusData?.data?.response?.successFlag ?? statusData?.data?.successFlag ?? statusData?.successFlag;
              const isVeoSuccess = successFlag === 1;
              const isVeoFailure = successFlag === 2 || successFlag === 3;

              // Normalize status to uppercase string
              const status = typeof rawStatus === "string" ? rawStatus.toUpperCase() : String(rawStatus || '').toUpperCase();
              
              // Check for success status strings (including lowercase variations)
              const isSuccessStatus = ["SUCCESS", "SUCCEEDED", "COMPLETED", "DONE", "FINISHED"].includes(status);

              // Extract video URL from various response formats including Veo's resultUrls
              const videoUrl =
                (Array.isArray(unifiedResult?.resultUrls) ? unifiedResult.resultUrls[0] : undefined) ||
                (Array.isArray(statusData?.data?.response?.resultUrls) ? statusData.data.response.resultUrls[0] : undefined) ||
                (Array.isArray(statusData?.data?.resultUrls) ? statusData.data.resultUrls[0] : undefined) ||
                statusData?.data?.response?.videoUrl ||
                statusData?.data?.response?.video_url ||
                (Array.isArray(statusData?.data?.output) ? statusData.data.output[0] : undefined) ||
                statusData?.data?.video?.url ||
                statusData?.data?.video_url ||
                statusData?.data?.videoUrl ||
                statusData?.data?.result?.video?.url ||
                statusData?.data?.result?.url ||
                statusData?.data?.url;

              const thumbnailUrl =
                statusData?.data?.thumbnail ||
                statusData?.data?.thumbnail_url ||
                statusData?.data?.cover ||
                videoUrl;

              console.log(`Poll attempt ${attempt + 1}: status=${status}, successFlag=${successFlag}, isSuccessStatus=${isSuccessStatus}, videoUrl=${videoUrl ? 'found' : 'none'}`);

              // Check for success via URL presence, string status, or Veo's successFlag
              if (videoUrl || isSuccessStatus || isVeoSuccess) {
                // Save to database
                const { data: generation } = await supabase
                  .from("generations")
                  .insert({
                    user_id: user.id,
                    prompt: prompt,
                    type: type,
                    model: model,
                    status: "completed",
                    output_url: videoUrl || null,
                    thumbnail_url: thumbnailUrl || null,
                    credits_used: creditCost,
                  })
                  .select()
                  .single();

                sendEvent('complete', { 
                  result: { type: 'video', output_url: videoUrl, thumbnail_url: thumbnailUrl },
                  generation,
                  credits_remaining: hasActiveSubscription ? currentCredits : currentCredits - creditCost
                });
                controller.close();
                return;
              } else if (status === "FAILED" || status === "FAILURE" || isVeoFailure) {
                const providerMessage =
                  statusData?.data?.msg ||
                  statusData?.data?.message ||
                  statusData?.msg ||
                  statusData?.message;

                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                sendEvent('error', { message: providerMessage ? `Video generation failed: ${providerMessage}` : 'Video generation failed' });
                controller.close();
                return;
              }
            }

            // Timeout - save as pending so user can check later
            const { data: pendingGen } = await supabase
              .from("generations")
              .insert({
                user_id: user.id,
                prompt: prompt,
                type: type,
                model: model,
                status: "pending",
                task_id: taskId,
                provider_endpoint: modelConfig.detailEndpoint,
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
    
    console.log(`Generation request - Type: ${type}, Model: ${model}, Aspect: ${aspectRatio}, Quality: ${quality}, I2V: ${!!imageUrl}, NegPrompt: ${!!negativePrompt}, Prompt: ${prompt?.substring(0, 50)}...`);

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
    const creditCost = type === "video" ? getModelCost(model, type, quality) : getModelCost(model, type);
    
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

    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      // Refund credits if not subscription
      if (!hasActiveSubscription) {
        await supabase
          .from("profiles")
          .update({ credits: currentCredits })
          .eq("user_id", user.id);
      }
      throw new Error("KIE_API_KEY is not configured");
    }

    let result;
    
    if (type === "image") {
      // Image generation using Kie.ai
      const modelConfig = KIE_IMAGE_MODELS[model];
      if (!modelConfig) {
        throw new Error(`Unknown image model: ${model}`);
      }

      console.log(`Using Kie.ai image endpoint: ${modelConfig.endpoint}, model: ${modelConfig.model}`);

      const generateResponse = await fetch(`${KIE_BASE_URL}${modelConfig.endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KIE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          model: modelConfig.model,
          aspectRatio: aspectRatio,
          numImages: 1,
          ...(negativePrompt && { negativePrompt: negativePrompt }),
        })
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("Kie.ai image error:", errorText);
        
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        throw new Error(`Kie.ai error: ${generateResponse.status}`);
      }

      const generateData = await generateResponse.json();
      const taskId = generateData.data?.taskId;
      
      if (!taskId) {
        // Some models return images directly
        const imageUrl = generateData.data?.output?.[0] || generateData.data?.images?.[0]?.url;
        if (imageUrl) {
          result = {
            type: "image",
            output_url: imageUrl,
            thumbnail_url: imageUrl,
          };
        } else {
          console.error("No taskId or image returned:", generateData);
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          throw new Error("Failed to start image generation");
        }
      } else {
        // Poll for result
        console.log(`Kie.ai image task started: ${taskId}`);
        
        let imageUrl = null;
        const maxAttempts = 30;
        const pollInterval = 2000;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          const endpointBase = modelConfig.endpoint.split('/')[1];
          const statusResponse = await fetch(`${KIE_BASE_URL}/${endpointBase}/details?taskId=${taskId}`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
          });

          if (!statusResponse.ok) continue;

          const statusData = await statusResponse.json();
          console.log(`Image status check ${attempt + 1}:`, statusData.data?.status);

          if (statusData.data?.status === "SUCCESS") {
            imageUrl = statusData.data?.output?.[0] || statusData.data?.images?.[0]?.url;
            break;
          } else if (statusData.data?.status === "FAILED") {
            if (!hasActiveSubscription) {
              await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
            }
            throw new Error("Image generation failed");
          }
        }

        if (!imageUrl) {
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          throw new Error("Image generation timed out");
        }

        result = {
          type: "image",
          output_url: imageUrl,
          thumbnail_url: imageUrl,
        };
      }
    } else {
      // Video generation using Kie.ai
      const modelConfig = KIE_VIDEO_MODELS[model];
      if (!modelConfig) {
        throw new Error(`Unknown video model: ${model}`);
      }

      console.log(`Using Kie.ai video endpoint: ${modelConfig.endpoint}, model: ${modelConfig.model}`);

      // Build request body - Kling uses /jobs/createTask with nested input object
      const requestBody = buildKieVideoRequestBody({
        model,
        modelConfig,
        prompt,
        negativePrompt,
        aspectRatio,
        quality,
        imageUrl,
      });

      console.log(`Video request body:`, JSON.stringify(requestBody));

      const generateResponse = await fetch(`${KIE_BASE_URL}${modelConfig.endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KIE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("Kie.ai video error:", errorText);
        
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        throw new Error(`Kie.ai error: ${generateResponse.status}`);
      }

      const generateData = await generateResponse.json();
      console.log("Kie.ai video response:", JSON.stringify(generateData));
      
      const taskId = getTaskIdFromKieResponse(generateData);
      
      if (!taskId) {
        const errorMsg = generateData?.msg || generateData?.message || generateData?.data?.msg || generateData?.data?.message || "Unknown error";
        console.error("No taskId returned:", generateData);
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          console.log("Credits refunded due to API error");
        }
        throw new Error(`Video API error: ${errorMsg}`);
      }

      console.log(`Kie.ai video task started: ${taskId}`);

      // Poll for result with model-specific timeout
      let videoUrl = null;
      let thumbnailUrl = null;
      const pollInterval = 5000;
      const maxPollingTime = modelConfig.maxPollingTime || 600; // Use model config, default 10 min
      const maxAttempts = Math.ceil(maxPollingTime / (pollInterval / 1000));
      
      console.log(`Polling with maxAttempts=${maxAttempts}, maxPollingTime=${maxPollingTime}s`);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const statusResponse = await fetch(`${KIE_BASE_URL}${modelConfig.detailEndpoint}?taskId=${taskId}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
        });

        if (!statusResponse.ok) {
          console.log(`Status check attempt ${attempt + 1}/${maxAttempts} - HTTP ${statusResponse.status}`);
          continue;
        }

        const statusData = await statusResponse.json();
        
        // Normalize status across providers (handle both string and numeric statuses)
        const rawStatus =
          statusData?.data?.status ??
          statusData?.data?.state ??
          statusData?.status ??
          statusData?.state;
        const successFlag = statusData?.data?.successFlag; // Veo uses numeric successFlag: 0=pending, 1=success, 2/3=failed
        const status = typeof rawStatus === "string" ? rawStatus.toUpperCase() : rawStatus;
        
        console.log(`Video status check ${attempt + 1}/${maxAttempts}: status=${status}, successFlag=${successFlag}`, JSON.stringify(statusData).slice(0, 300));

        // Extract video URL from various response formats (including Veo's response.resultUrls)
        const extractedUrl =
          (Array.isArray(statusData?.data?.response?.resultUrls) ? statusData.data.response.resultUrls[0] : undefined) ||
          (Array.isArray(statusData?.data?.output) ? statusData.data.output[0] : undefined) ||
          statusData?.data?.video?.url ||
          statusData?.data?.video_url ||
          statusData?.data?.result?.video?.url ||
          statusData?.data?.result?.url ||
          statusData?.data?.url;

        const extractedThumb =
          statusData?.data?.thumbnail ||
          statusData?.data?.thumbnail_url ||
          statusData?.data?.cover ||
          extractedUrl;

        // Consider complete if: we have a URL, successFlag=1 (Veo), or known success status strings
        const isSuccess = extractedUrl || successFlag === 1 || status === "SUCCESS" || status === "SUCCEEDED" || status === "COMPLETED";
        const isFailed = successFlag === 2 || successFlag === 3 || status === "FAILED" || status === "FAILURE";

        if (isSuccess) {
          videoUrl = extractedUrl;
          thumbnailUrl = extractedThumb || videoUrl;
          console.log("Video generation complete:", videoUrl);
          break;
        } else if (isFailed) {
          const providerMessage =
            statusData?.data?.msg ||
            statusData?.data?.message ||
            statusData?.msg ||
            statusData?.message;
          console.error("Video generation failed:", providerMessage || statusData);
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          throw new Error(providerMessage ? `Video generation failed: ${providerMessage}` : "Video generation failed");
        }
      }

      if (!videoUrl) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        throw new Error("Video generation timed out. Please try again.");
      }

      result = {
        type: "video",
        output_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        status: "completed",
      };
    }

    // Save to database
    const { data: generation, error: dbError } = await supabase
      .from("generations")
      .insert({
        user_id: user.id,
        prompt: prompt,
        type: type,
        model: model,
        status: "completed",
        output_url: result.output_url || null,
        thumbnail_url: result.thumbnail_url || null,
        credits_used: creditCost,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError.message);
    }

    console.log("Generation completed successfully");

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        generation: generation || null,
        credits_remaining: hasActiveSubscription ? currentCredits : currentCredits - creditCost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in generate function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
