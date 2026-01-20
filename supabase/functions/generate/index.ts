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

// Provider type for multi-provider support
type Provider = "kie" | "fal";

// Fal.ai API configuration
const FAL_BASE_URL = "https://queue.fal.run";
const FAL_RESULT_URL = "https://queue.fal.run";

// Models that should use Fal.ai instead of Kie.ai (faster response times)
const FAL_PREFERRED_MODELS: Record<string, { endpoint: string; imageEndpoint?: string }> = {
  "sora-2": { endpoint: "fal-ai/sora-2/text-to-video", imageEndpoint: "fal-ai/sora-2/image-to-video" },
  "sora-2-pro": { endpoint: "fal-ai/sora-2/text-to-video", imageEndpoint: "fal-ai/sora-2/image-to-video" },
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
  useAspectLandscapePortrait?: boolean;
  useNFrames?: boolean; // Sora models use n_frames instead of duration
  maxPollingTime?: number;
  useJobsCreateTask?: boolean;
  jobsRequiresSoundFlag?: boolean;
  jobsImageField?: JobsImageField;
};

// All 8 video models with Kie.ai /jobs/createTask unified endpoint
// Model names follow Kie.ai's exact naming convention
const KIE_VIDEO_MODELS: Record<string, KieVideoModelConfig> = {
  // Wan 2.6 - Alibaba's latest model
  "wan-2.6": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "wan-2.1-t2v-turbo", 
    duration: 5, 
    maxPollingTime: 420, 
    useJobsCreateTask: true 
  },
  
  // Kling 2.6 - Kuaishou's model with audio sync
  "kling-2.6": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "kling-2.1-pro-text-to-video", 
    duration: 5, 
    maxPollingTime: 420, 
    useJobsCreateTask: true, 
    jobsRequiresSoundFlag: true 
  },
  
  // Veo 3.1 - Google's latest video model
  "veo-3.1": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "veo-3-quality", 
    duration: 5, 
    maxPollingTime: 900, 
    useJobsCreateTask: true 
  },
  
  // Sora 2 Pro - OpenAI premium video (uses n_frames: "10" or "15")
  "sora-2-pro": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "sora-2-pro-text-to-video", 
    duration: 10, 
    maxPollingTime: 900, 
    useJobsCreateTask: true,
    useAspectLandscapePortrait: true,
    useNFrames: true
  },
  
  // Hailuo 2.3 - Fast generation model
  "hailuo-2.3": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "hailuo-t2v-director", 
    duration: 5, 
    maxPollingTime: 420, 
    useJobsCreateTask: true 
  },
  
  // Veo 3 - Google video model
  "veo-3": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "veo-3-fast", 
    duration: 5, 
    maxPollingTime: 900, 
    useJobsCreateTask: true 
  },
  
  // Sora 2 - OpenAI video model (uses n_frames: "10" or "15")
  "sora-2": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "sora-2-text-to-video", 
    duration: 10, 
    maxPollingTime: 900, 
    useJobsCreateTask: true,
    useAspectLandscapePortrait: true,
    useNFrames: true
  },
  
  // Seedance 1.5 - Creative motion model
  "seedance-1.5": { 
    endpoint: "/jobs/createTask", 
    detailEndpoint: "/jobs/recordInfo", 
    model: "seedance-1.0-lite-text-to-video", 
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
    
    // Convert aspect ratio format based on model requirements
    let formattedAspectRatio: string;
    if (modelConfig.useAspectLandscapePortrait) {
      // Sora models use "landscape" / "portrait" / "square" format
      if (aspectRatio === "16:9" || aspectRatio === "21:9" || aspectRatio === "4:3" || aspectRatio === "3:2") {
        formattedAspectRatio = "landscape";
      } else if (aspectRatio === "9:16" || aspectRatio === "3:4" || aspectRatio === "2:3") {
        formattedAspectRatio = "portrait";
      } else if (aspectRatio === "1:1") {
        formattedAspectRatio = "square";
      } else {
        formattedAspectRatio = "landscape"; // default fallback
      }
    } else if (modelConfig.useAspectUnderscore) {
      formattedAspectRatio = aspectRatio.replace(":", "_");
    } else {
      formattedAspectRatio = aspectRatio;
    }
    
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: formattedAspectRatio,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : {}),
    };
    
    // Sora models use n_frames instead of duration
    if (modelConfig.useNFrames) {
      input.n_frames = String(modelConfig.duration || 10);
    } else {
      input.duration = String(modelConfig.duration || 5);
    }

    // Kling 2.6 docs require an explicit sound flag.
    if (modelConfig.jobsRequiresSoundFlag) {
      input.sound = false;
    }

    // Quality mapping: Sora uses "size" (standard/high), others use "resolution"
    if (modelConfig.useNFrames) {
      // Sora models use size: "standard" (720p) or "high" (1080p)
      input.size = quality === "1080p" ? "high" : "standard";
    } else if (quality) {
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

// Fal.ai request building
const buildFalVideoRequest = (args: {
  prompt: string;
  aspectRatio: string;
  quality: string;
  imageUrl?: string | null;
}) => {
  const { prompt, aspectRatio, quality, imageUrl } = args;
  
  // Fal.ai Sora 2 uses "landscape", "portrait", "square" for aspect ratio
  let falAspectRatio: "landscape" | "portrait" | "square";
  if (aspectRatio === "9:16" || aspectRatio === "3:4" || aspectRatio === "2:3") {
    falAspectRatio = "portrait";
  } else if (aspectRatio === "1:1") {
    falAspectRatio = "square";
  } else {
    falAspectRatio = "landscape"; // Default to landscape for 16:9, 4:3, etc.
  }
  
  // Duration: 5, 10, or 20 seconds
  const duration = 10; // Default to 10 seconds
  
  // Resolution: 480p, 720p, or 1080p
  let resolution = "720p";
  if (quality === "480p") resolution = "480p";
  else if (quality === "1080p") resolution = "1080p";
  
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: falAspectRatio,
    resolution,
    duration,
  };
  
  if (imageUrl) {
    input.image_url = imageUrl;
  }
  
  return input;
};

// Submit to Fal.ai queue
const submitToFal = async (endpoint: string, input: Record<string, unknown>, apiKey: string): Promise<{ requestId: string }> => {
  const response = await fetch(`${FAL_BASE_URL}/${endpoint}`, {
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
  return { requestId: data.request_id };
};

// Check Fal.ai queue status
const checkFalStatus = async (endpoint: string, requestId: string, apiKey: string): Promise<{
  status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  result?: { video?: { url: string }; thumbnail?: { url: string } };
  error?: string;
}> => {
  const response = await fetch(`${FAL_RESULT_URL}/${endpoint}/requests/${requestId}/status`, {
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
  return {
    status: data.status,
    result: data.response_url ? undefined : undefined,
  };
};

// Get Fal.ai result
const getFalResult = async (endpoint: string, requestId: string, apiKey: string): Promise<{
  video?: { url: string };
  thumbnail?: { url: string };
}> => {
  const response = await fetch(`${FAL_RESULT_URL}/${endpoint}/requests/${requestId}`, {
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

            // Check if we should use Fal.ai for this model (faster for Sora)
            const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
            const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
            const falConfig = FAL_PREFERRED_MODELS[model];
            const useFal = falConfig && FAL_API_KEY;

            if (!useFal && !KIE_API_KEY) {
              if (!hasActiveSubscription) {
                await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
              }
              sendEvent('error', { message: 'API key not configured' });
              controller.close();
              return;
            }

            sendEvent('status', { stage: 'submitting', message: `Submitting to ${useFal ? 'Fal.ai' : 'Kie.ai'}...`, progress: 5 });

            let taskId: string = "";
            let provider: Provider = "kie";
            let providerEndpoint: string = "";

            if (useFal && falConfig) {
              // Use Fal.ai for Sora models (faster)
              provider = "fal";
              const endpoint = imageUrl ? (falConfig.imageEndpoint || falConfig.endpoint) : falConfig.endpoint;
              providerEndpoint = endpoint;
              
              const falInput = buildFalVideoRequest({
                prompt,
                aspectRatio,
                quality,
                imageUrl,
              });

              console.log(`Fal.ai request to ${endpoint}:`, JSON.stringify(falInput));

              try {
                const { requestId } = await submitToFal(endpoint, falInput, FAL_API_KEY!);
                taskId = requestId;
                console.log(`Fal.ai task submitted: ${taskId}`);
              } catch (error) {
                console.error("Fal.ai submit error:", error);
                // Fall back to Kie.ai if Fal fails
                if (KIE_API_KEY) {
                  sendEvent('status', { stage: 'fallback', message: 'Falling back to alternative provider...', progress: 5 });
                  provider = "kie";
                } else {
                  if (!hasActiveSubscription) {
                    await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                  }
                  sendEvent('error', { message: `Fal.ai error: ${error instanceof Error ? error.message : 'Unknown error'}` });
                  controller.close();
                  return;
                }
              }
            }
            
            // Use Kie.ai (either as primary or fallback from Fal.ai failure)
            if (!taskId) {
              provider = "kie";
              const modelConfig = KIE_VIDEO_MODELS[model];
              if (!modelConfig) {
                sendEvent('error', { message: `Unknown video model: ${model}` });
                controller.close();
                return;
              }
              providerEndpoint = modelConfig.detailEndpoint;

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

              console.log(`Kie.ai/Video request to ${modelConfig.endpoint}:`, JSON.stringify(requestBody));

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
              taskId = getTaskIdFromKieResponse(generateData)!;
            }

            const modelConfig = KIE_VIDEO_MODELS[model];

            if (!taskId!) {
              if (!hasActiveSubscription) {
                await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
              }
              sendEvent('error', { message: 'Failed to start video generation' });
              controller.close();
              return;
            }

            sendEvent('status', { stage: 'queued', message: `Video queued for processing (${provider === 'fal' ? 'Fal.ai' : 'Kie.ai'})...`, progress: 10, taskId });

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
                  provider_endpoint: provider === 'fal' ? `fal:${providerEndpoint}` : modelConfig?.detailEndpoint,
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
            const maxPollingTime = provider === 'fal' ? 300 : (modelConfig?.maxPollingTime || 600); // Fal is usually faster
            const maxAttempts = Math.ceil(maxPollingTime / (pollInterval / 1000));

            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              await new Promise(resolve => setTimeout(resolve, pollInterval));
              
              const elapsedSeconds = (attempt + 1) * (pollInterval / 1000);
              const progress = Math.min(10 + Math.round((attempt / maxAttempts) * 85), 95);
              sendEvent('status', { 
                stage: 'processing', 
                message: `Generating video via ${provider === 'fal' ? 'Fal.ai' : 'Kie.ai'}... (${elapsedSeconds}s / ~${maxPollingTime}s)`, 
                progress,
                attempt: attempt + 1,
                maxAttempts
              });

              let videoUrl: string | undefined;
              let thumbnailUrl: string | undefined;
              let isComplete = false;
              let isFailed = false;
              let failMessage = "";

              if (provider === 'fal') {
                // Poll Fal.ai
                try {
                  const falStatus = await checkFalStatus(providerEndpoint, taskId, FAL_API_KEY!);
                  console.log(`Fal.ai poll attempt ${attempt + 1}: status=${falStatus.status}`);
                  
                  if (falStatus.status === "COMPLETED") {
                    const result = await getFalResult(providerEndpoint, taskId, FAL_API_KEY!);
                    videoUrl = result.video?.url;
                    thumbnailUrl = result.thumbnail?.url || videoUrl;
                    isComplete = true;
                    console.log(`Fal.ai completed: videoUrl=${videoUrl}`);
                  } else if (falStatus.status === "FAILED") {
                    isFailed = true;
                    failMessage = falStatus.error || "Fal.ai generation failed";
                  }
                  // IN_QUEUE and IN_PROGRESS continue polling
                } catch (error) {
                  console.error(`Fal.ai poll error:`, error);
                }
              } else {
                // Poll Kie.ai
                const tryFetch = async (endpoint: string) => {
                  const url = `${KIE_BASE_URL}${endpoint}?taskId=${encodeURIComponent(taskId)}`;
                  return await fetch(url, {
                    method: "GET",
                    headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
                  });
                };

                // Primary endpoint is model-specific; for deprecated endpoints, fall back to unified recordInfo.
                let statusResponse = await tryFetch(modelConfig?.detailEndpoint || "/jobs/recordInfo");
                if (!statusResponse.ok && statusResponse.status === 404 && modelConfig?.detailEndpoint !== "/jobs/recordInfo") {
                  statusResponse = await tryFetch("/jobs/recordInfo");
                }

                if (statusResponse.ok) {
                  const statusData = await statusResponse.json();
                  console.log(`Poll attempt ${attempt + 1}: Raw Kie.ai response:`, JSON.stringify(statusData).slice(0, 500));

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
                  
                  // Extract status from multiple possible paths
                  const rawStatus =
                    statusData?.data?.state ??
                    statusData?.data?.response?.status ??
                    statusData?.data?.status ??
                    statusData?.status ??
                    statusData?.state;

                  const successFlag = statusData?.data?.response?.successFlag ?? statusData?.data?.successFlag ?? statusData?.successFlag;
                  const isVeoSuccess = successFlag === 1;
                  const isVeoFailure = successFlag === 2 || successFlag === 3;
                  const status = typeof rawStatus === "string" ? rawStatus.toUpperCase() : String(rawStatus || '').toUpperCase();
                  const isSuccessStatus = ["SUCCESS", "SUCCEEDED", "COMPLETED", "DONE", "FINISHED"].includes(status);

                  // Extract video URL from various response formats
                  videoUrl =
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

                  thumbnailUrl =
                    statusData?.data?.thumbnail ||
                    statusData?.data?.thumbnail_url ||
                    statusData?.data?.cover ||
                    videoUrl;

                  console.log(`Poll attempt ${attempt + 1}: status=${status}, successFlag=${successFlag}, videoUrl=${videoUrl ? 'found' : 'none'}`);

                  if (videoUrl || isSuccessStatus || isVeoSuccess) {
                    isComplete = true;
                  } else if (status === "FAILED" || status === "FAILURE" || isVeoFailure) {
                    isFailed = true;
                    failMessage = statusData?.data?.msg || statusData?.data?.message || statusData?.msg || statusData?.message || "Video generation failed";
                  }
                }
              }

              // Handle completion
              if (isComplete && videoUrl) {
                const { data: generation } = await supabase
                  .from("generations")
                  .insert({
                    user_id: user.id,
                    prompt: prompt,
                    type: type,
                    model: model,
                    status: "completed",
                    output_url: videoUrl,
                    thumbnail_url: thumbnailUrl || videoUrl,
                    credits_used: creditCost,
                    provider_endpoint: provider === 'fal' ? `fal:${providerEndpoint}` : modelConfig?.detailEndpoint,
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
              }

              // Handle failure
              if (isFailed) {
                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                sendEvent('error', { message: failMessage || 'Video generation failed' });
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
                provider_endpoint: provider === 'fal' ? `fal:${providerEndpoint}` : modelConfig?.detailEndpoint,
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
      // Video generation - check for Fal.ai first (faster for Sora models)
      const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
      const falConfig = FAL_PREFERRED_MODELS[model];
      const useFal = falConfig && FAL_API_KEY;
      
      let taskId: string = "";
      let provider: Provider = "kie";
      let providerEndpoint: string = "";
      const modelConfig = KIE_VIDEO_MODELS[model];
      
      if (useFal && falConfig) {
        // Use Fal.ai for Sora models (faster)
        provider = "fal";
        const endpoint = imageUrl ? (falConfig.imageEndpoint || falConfig.endpoint) : falConfig.endpoint;
        providerEndpoint = `fal:${endpoint}`;
        
        const falInput = buildFalVideoRequest({
          prompt,
          aspectRatio,
          quality,
          imageUrl,
        });

        console.log(`Fal.ai request to ${endpoint}:`, JSON.stringify(falInput));

        try {
          const { requestId } = await submitToFal(endpoint, falInput, FAL_API_KEY!);
          taskId = requestId;
          console.log(`Fal.ai task submitted: ${taskId}`);
        } catch (error) {
          console.error("Fal.ai submit error:", error);
          // Fall back to Kie.ai if Fal fails
          console.log("Falling back to Kie.ai...");
          provider = "kie";
          taskId = "";
        }
      }
      
      // Use Kie.ai (either as primary or fallback from Fal.ai failure)
      if (!taskId) {
        provider = "kie";
        if (!modelConfig) {
          throw new Error(`Unknown video model: ${model}`);
        }
        providerEndpoint = modelConfig.detailEndpoint;

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
        
        taskId = getTaskIdFromKieResponse(generateData) || "";
        
        if (!taskId) {
          const errorMsg = generateData?.msg || generateData?.message || generateData?.data?.msg || generateData?.data?.message || "Unknown error";
          console.error("No taskId returned:", generateData);
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
            console.log("Credits refunded due to API error");
          }
          throw new Error(`Video API error: ${errorMsg}`);
        }
      }

      console.log(`Video task started (${provider}): ${taskId}`);

      // Poll for result with model-specific timeout
      let videoUrl: string | null = null;
      let thumbnailUrl: string | null = null;
      const pollInterval = 5000;
      const maxPollingTime = modelConfig?.maxPollingTime || 600; // Use model config, default 10 min
      const maxAttempts = Math.ceil(maxPollingTime / (pollInterval / 1000));
      
      console.log(`Polling ${provider} with maxAttempts=${maxAttempts}, maxPollingTime=${maxPollingTime}s`);

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        if (provider === "fal") {
          // Fal.ai polling
          const FAL_API_KEY = Deno.env.get("FAL_API_KEY")!;
          const falEndpoint = providerEndpoint.replace("fal:", "");
          
          try {
            const statusResp = await fetch(`${FAL_RESULT_URL}/${falEndpoint}/requests/${taskId}/status`, {
              headers: { "Authorization": `Key ${FAL_API_KEY}` }
            });
            
            if (statusResp.ok) {
              const statusData = await statusResp.json();
              console.log(`Fal.ai status check ${attempt + 1}/${maxAttempts}:`, statusData.status);
              
              if (statusData.status === "COMPLETED") {
                const resultResp = await fetch(`${FAL_RESULT_URL}/${falEndpoint}/requests/${taskId}`, {
                  headers: { "Authorization": `Key ${FAL_API_KEY}` }
                });
                if (resultResp.ok) {
                  const resultData = await resultResp.json();
                  console.log(`Fal.ai result:`, JSON.stringify(resultData));
                  videoUrl = resultData.video?.url || null;
                  thumbnailUrl = resultData.thumbnail?.url || videoUrl;
                  if (videoUrl) break;
                }
              } else if (statusData.status === "FAILED") {
                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                throw new Error(`Fal.ai generation failed: ${statusData.error || "Unknown error"}`);
              }
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes("failed")) throw error;
            console.error(`Fal.ai polling error:`, error);
          }
        } else {
          // Kie.ai polling
          const statusResponse = await fetch(`${KIE_BASE_URL}${modelConfig!.detailEndpoint}?taskId=${taskId}`, {
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
        provider,
        provider_endpoint: providerEndpoint,
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
