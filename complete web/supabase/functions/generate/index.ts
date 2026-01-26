import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Model-specific credit costs (balanced ~30-50% margin above API cost)
const MODEL_CREDITS: Record<string, number> = {
  // === ECONOMY TIER (Kie.ai Marketplace) ===
  // Image models
  "kie-4o-image": 3,
  "kie-flux-kontext-pro": 3,
  "kie-flux-kontext-max": 5,
  "kie-grok-imagine": 4,
  "kie-seedream-4": 4,
  "kie-imagen-4": 5,
  "kie-ideogram-v3": 5,
  "kie-flux2-pro": 4,
  "kie-qwen-image": 4,
  "kie-midjourney": 5,
  "kie-kling-image": 4,
  "kie-flux-pro": 4,
  "kie-flux-dev": 2,
  "kie-flux-schnell": 2,
  "kie-nano-banana": 3,
  // Video models
  "kie-runway": 10,
  "kie-runway-i2v": 12,
  "kie-runway-cinema": 15,
  "kie-sora2": 15,
  "kie-sora2-pro": 25,
  "kie-veo31": 20,
  "kie-veo31-fast": 12,
  "kie-kling": 15,
  "kie-hailuo": 12,
  "kie-luma": 12,
  "kie-wan": 10,
  "kie-grok-video": 12,
  // Music models
  "kie-music-v4": 8,
  "kie-music-v3.5": 6,

  // === HIGH QUALITY TIER ===
  // Image models - Lovable AI
  "nano-banana": 4,
  
  // Image models - Fal.ai
  "nano-banana-pro": 6,
  "gpt-image-1.5": 12,
  "flux-1.1-pro": 6,
  "flux-pro-ultra": 10,
  "flux-dev": 4,
  "flux-schnell": 3,
  "ideogram-v2": 8,
  "stable-diffusion-3": 5,
  "sdxl": 4,
  "sdxl-lightning": 3,
  "recraft-v3": 6,
  "aura-flow": 5,
  "playground-v2.5": 5,
  
  // Video models
  "wan-2.6": 20,
  "kling-2.6": 35,
  "veo-3": 50,
  "veo-3-fast": 30,
  "hailuo-02": 25,
  "seedance-1.5": 25,
  "luma": 30,
  "hunyuan-1.5": 25,

  // Music models - Fal.ai
  "sonauto": 20,
  "cassetteai": 12,
  "lyria2": 15,
  "stable-audio": 10,
};

// Kie.ai API configuration
const KIE_BASE_URL = "https://api.kie.ai";

// Kie.ai Image Models
const KIE_IMAGE_ENDPOINTS: Record<string, { endpoint: string; aspectRatioKey: string; modelParam?: string }> = {
  "kie-4o-image": {
    endpoint: "/api/v1/gpt4o-image/generate",
    aspectRatioKey: "ratio",
  },
  "kie-flux-kontext-pro": {
    endpoint: "/api/v1/flux/kontext/generate",
    aspectRatioKey: "aspectRatio",
    modelParam: "flux-kontext-pro",
  },
  "kie-flux-kontext-max": {
    endpoint: "/api/v1/flux/kontext/generate",
    aspectRatioKey: "aspectRatio",
    modelParam: "flux-kontext-max",
  },
  "kie-grok-imagine": {
    endpoint: "/api/v1/grok/imagine/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-seedream-4": {
    endpoint: "/api/v1/seedream/generate",
    aspectRatioKey: "aspectRatio",
    modelParam: "v4.0",
  },
  "kie-imagen-4": {
    endpoint: "/api/v1/jobs/createTask",
    aspectRatioKey: "aspect_ratio",
    modelParam: "google/imagen4",
  },
  "kie-ideogram-v3": {
    endpoint: "/api/v1/ideogram/v3/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-flux2-pro": {
    endpoint: "/api/v1/flux2/pro/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-qwen-image": {
    endpoint: "/api/v1/qwen/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-midjourney": {
    endpoint: "/api/v1/midjourney/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-kling-image": {
    endpoint: "/api/v1/kling/image/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-flux-pro": {
    endpoint: "/api/v1/flux/pro/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-flux-dev": {
    endpoint: "/api/v1/flux/dev/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-flux-schnell": {
    endpoint: "/api/v1/flux/schnell/generate",
    aspectRatioKey: "aspectRatio",
  },
  "kie-nano-banana": {
    endpoint: "/api/v1/jobs/createTask",
    aspectRatioKey: "aspect_ratio",
    modelParam: "google/nano-banana",
  },
};

// Kie.ai Video Models
const KIE_VIDEO_ENDPOINTS: Record<string, { endpoint: string; isI2V: boolean; modelParam?: string }> = {
  "kie-runway": {
    endpoint: "/api/v1/runway/generate",
    isI2V: false,
  },
  "kie-runway-i2v": {
    endpoint: "/api/v1/runway/generate",
    isI2V: true,
  },
  "kie-runway-cinema": {
    endpoint: "/api/v1/runway/generate",
    isI2V: false,
  },
  // Models using unified /api/v1/jobs/createTask endpoint
  "kie-sora2": {
    endpoint: "/api/v1/jobs/createTask",
    isI2V: false,
    modelParam: "sora-2-text-to-video",
  },
  "kie-sora2-pro": {
    endpoint: "/api/v1/jobs/createTask",
    isI2V: false,
    modelParam: "sora-2-pro-text-to-video",
  },
  // Veo 3.1 uses dedicated endpoint /api/v1/veo/generate
  "kie-veo31": {
    endpoint: "/api/v1/veo/generate",
    isI2V: false,
    modelParam: "veo3",
  },
  "kie-veo31-fast": {
    endpoint: "/api/v1/veo/generate",
    isI2V: false,
    modelParam: "veo3_fast",
  },
  // Kling uses marketplace format - kling-2.6/text-to-video
  "kie-kling": {
    endpoint: "/api/v1/jobs/createTask",
    isI2V: false,
    modelParam: "kling-2.6/text-to-video",
  },
  // Hailuo uses marketplace format
  "kie-hailuo": {
    endpoint: "/api/v1/jobs/createTask",
    isI2V: false,
    modelParam: "hailuo/02-text-to-video-pro",
  },
  // Luma - try ray2-text-to-video format
  "kie-luma": {
    endpoint: "/api/v1/jobs/createTask",
    isI2V: false,
    modelParam: "luma/ray2-text-to-video",
  },
  // Wan uses marketplace format
  "kie-wan": {
    endpoint: "/api/v1/jobs/createTask",
    isI2V: false,
    modelParam: "wan/2-6-text-to-video",
  },
  "kie-grok-video": {
    endpoint: "/api/v1/jobs/createTask",
    isI2V: false,
    modelParam: "grok-imagine/text-to-video",
  },
};

// Kie.ai Music Models
const KIE_MUSIC_ENDPOINTS: Record<string, { endpoint: string; version: string; model: string }> = {
  "kie-music-v4": {
    endpoint: "/api/v1/generate",
    version: "v4",
    model: "V4",
  },
  "kie-music-v3.5": {
    endpoint: "/api/v1/generate",
    version: "v3.5",
    model: "V3_5",
  },
};

// Helper: Submit to Kie.ai and poll for result
const submitToKie = async (
  endpoint: string, 
  body: Record<string, unknown>, 
  apiKey: string
): Promise<{ taskId: string }> => {
  const url = `${KIE_BASE_URL}${endpoint}`;
  console.log(`Kie.ai submit to ${url}:`, JSON.stringify(body));
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Kie.ai submit error:", errorText);
    throw new Error(`Kie.ai error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  console.log("Kie.ai submit response:", JSON.stringify(data));
  
  // Kie.ai returns taskId in response (camelCase)
  const taskId = data.data?.taskId || data.taskId || data.data?.task_id || data.task_id;
  if (!taskId) {
    throw new Error(`No taskId in Kie.ai response: ${JSON.stringify(data)}`);
  }
  
  return { taskId };
};

// Kie.ai Status Endpoints (model-specific)
const KIE_STATUS_ENDPOINTS: Record<string, string> = {
  // Image models
  "kie-4o-image": "/api/v1/gpt4o-image/record-info",
  "kie-flux-kontext-pro": "/api/v1/flux/kontext/record-info",
  "kie-flux-kontext-max": "/api/v1/flux/kontext/record-info",
  "kie-grok-imagine": "/api/v1/grok/imagine/record-info",
  "kie-seedream-4": "/api/v1/seedream/record-info",
  "kie-imagen-4": "/api/v1/jobs/recordInfo",
  "kie-ideogram-v3": "/api/v1/ideogram/v3/record-info",
  "kie-flux2-pro": "/api/v1/flux2/pro/record-info",
  "kie-qwen-image": "/api/v1/qwen/record-info",
  "kie-midjourney": "/api/v1/midjourney/record-info",
  "kie-kling-image": "/api/v1/kling/image/record-info",
  "kie-flux-pro": "/api/v1/flux/pro/record-info",
  "kie-flux-dev": "/api/v1/flux/dev/record-info",
  "kie-flux-schnell": "/api/v1/flux/schnell/record-info",
  // Video models (unified endpoint for marketplace models)
  "kie-runway": "/api/v1/runway/record-info",
  "kie-runway-i2v": "/api/v1/runway/record-info",
  "kie-runway-cinema": "/api/v1/runway/record-info",
  "kie-sora2": "/api/v1/jobs/recordInfo",
  "kie-sora2-pro": "/api/v1/jobs/recordInfo",
  "kie-veo31": "/api/v1/veo/record-info",
  "kie-veo31-fast": "/api/v1/veo/record-info",
  "kie-kling": "/api/v1/jobs/recordInfo",
  "kie-hailuo": "/api/v1/jobs/recordInfo",
  "kie-luma": "/api/v1/jobs/recordInfo",
  "kie-wan": "/api/v1/jobs/recordInfo",
  "kie-grok-video": "/api/v1/jobs/recordInfo",
  // Music models
  "kie-music-v4": "/api/v1/generate/record-info",
  "kie-music-v3.5": "/api/v1/generate/record-info",
};

// Helper: Check Kie.ai task status (model-specific endpoint)
const checkKieStatus = async (
  model: string,
  taskId: string, 
  apiKey: string
): Promise<{ status: string; result?: any; error?: string }> => {
  const statusEndpoint = KIE_STATUS_ENDPOINTS[model] || "/api/v1/jobs/recordInfo";
  const url = `${KIE_BASE_URL}${statusEndpoint}?taskId=${taskId}`;
  console.log(`Kie.ai status check for ${model}: ${url}`);
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Kie.ai status error:", errorText);
    return { status: "FAILED", error: errorText };
  }
  
  const data = await response.json();
  console.log("Kie.ai status response:", JSON.stringify(data));
  
  // Kie.ai status values vary by model: GENERATING, SUCCESS, CREATE_TASK_FAILED, GENERATE_FAILED
  // Also: pending, processing, completed, success, failed, error
  const status = (data.data?.status || data.status || "").toLowerCase();
  const resultData = data.data || data;
  
  if (status === "completed" || status === "success") {
    return { status: "COMPLETED", result: resultData };
  } else if (status === "failed" || status === "error" || status === "create_task_failed" || status === "generate_failed") {
    return { status: "FAILED", error: resultData?.error || resultData?.message || "Generation failed" };
  }
  
  // GENERATING, pending, processing = still in progress
  return { status: "IN_PROGRESS" };
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
  let multiplier = 1.0;
  
  if (quality && QUALITY_MULTIPLIERS[quality]) {
    multiplier *= QUALITY_MULTIPLIERS[quality];
  }
  
  return Math.round(baseCost * multiplier);
};

// Fal.ai API configuration
const FAL_BASE_URL = "https://queue.fal.run";

// AI configuration
const AI_GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

// AI Image Models
const AI_IMAGE_MODELS: Record<string, string> = {
  "nano-banana": "google/gemini-2.5-flash-image-preview",
  "nano-banana-pro": "google/gemini-3-pro-image-preview",
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
  instrumental?: boolean;
  vocalGender?: string;
  weirdness?: number;
  styleInfluence?: number;
  duration?: number;
}) => {
  const { prompt, model, lyrics, instrumental, vocalGender, weirdness, styleInfluence, duration } = args;
  
  // Sonauto uses different parameters - see https://fal.ai/models/sonauto/v2/text-to-music
  if (model === "sonauto") {
    const input: Record<string, unknown> = {
      prompt,
    };
    
    // Sonauto: lyrics_prompt is the lyrics to be sung
    // An empty string generates instrumental - so we only set it when we have lyrics
    if (lyrics && lyrics.trim() && !instrumental) {
      input.lyrics_prompt = lyrics.trim();
    } else if (instrumental) {
      // Empty string explicitly generates instrumental
      input.lyrics_prompt = "";
    }
    
    // prompt_strength: CFG scale (default 2, higher = more adherence to prompt)
    if (typeof styleInfluence === 'number') {
      // Map 0-100 to reasonable CFG range (0.5 - 4)
      input.prompt_strength = 0.5 + (styleInfluence / 100) * 3.5;
    }
    
    // balance_strength: vocals vs instrumentals (default 0.7, higher = more natural vocals)
    if (typeof weirdness === 'number') {
      // Map 0-100 to 0.3 - 1.0 range
      input.balance_strength = 0.3 + ((100 - weirdness) / 100) * 0.7;
    }
    
    return input;
  }
  
  // Lyria2 specific parameters - see https://fal.ai/models/fal-ai/lyria2/api
  if (model === "lyria2") {
    const input: Record<string, unknown> = {
      prompt,
      duration: duration ?? 30,
    };
    
    // Lyria2 supports lyrics via prompt or separate lyrics field
    if (lyrics && lyrics.trim() && !instrumental) {
      // Combine prompt with lyrics for better context
      input.prompt = `${prompt}\n\nLyrics:\n${lyrics.trim()}`;
    }
    
    if (instrumental) {
      input.instrumental = true;
    }
    
    // Lyria2 supports guidance_scale for prompt adherence (similar to CFG)
    if (typeof styleInfluence === 'number') {
      // Map 0-100 to 1-10 range for guidance scale
      input.guidance_scale = 1 + (styleInfluence / 100) * 9;
    }
    
    return input;
  }
  
  // Default format for other models (CassetteAI, Stable Audio)
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
  referenceImageUrl?: string;
  referenceImageUrls?: string[];
}) => {
  const { prompt, negativePrompt, aspectRatio, model, referenceImageUrl, referenceImageUrls = [] } = args;
  
  // Use array if provided, otherwise fall back to single URL
  const allReferenceImages = referenceImageUrls.length > 0 
    ? referenceImageUrls 
    : (referenceImageUrl ? [referenceImageUrl] : []);
  
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
    // GPT Image supports image input for editing (uses first reference)
    if (allReferenceImages.length > 0) {
      input.image_url = allReferenceImages[0];
    }
  } else {
    input.image_size = { width: size.width, height: size.height };
    // Flux and other models support image_url for img2img (primary reference)
    if (allReferenceImages.length > 0) {
      input.image_url = allReferenceImages[0];
      // Flux models use strength parameter for img2img blending
      input.strength = 0.75; // Balance between reference and prompt
    }
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
    const { 
      prompt: rawPrompt, 
      negativePrompt, 
      type, 
      model, 
      aspectRatio = "1:1", 
      quality = "720p", 
      imageUrl, 
      referenceImageUrl,  // Legacy single reference image (backward compatibility)
      referenceImageUrls = [],  // Multiple reference images for style transfer
      stream = false, 
      background = false, 
      lyrics, 
      instrumental, 
      vocalGender, 
      weirdness, 
      styleInfluence, 
      duration: requestDuration, // Generic duration from request (used for video/music)
      title, // Song title for music generations
      // Cinema Studio parameters
      cameraMovements = [],
      shotType,
      cameraSensor,
      lensType,
      movementIntensity,
    } = await req.json();
    
    // Determine duration based on type
    const videoDuration = (type === "video" || type === "cinema") ? requestDuration : undefined;
    const musicDuration = type === "music" ? requestDuration : undefined;
    const cinemaDuration = cameraMovements?.length > 0 ? requestDuration : undefined;
    
    // Build enhanced prompt for cinema mode
    let prompt = rawPrompt;
    if (cameraMovements && cameraMovements.length > 0) {
      const movementLabels: Record<string, string> = {
        "static": "static camera",
        "dolly-in": "smooth dolly in toward subject",
        "dolly-out": "smooth dolly out from subject",
        "pan-left": "pan left",
        "pan-right": "pan right",
        "tilt-up": "tilt up",
        "tilt-down": "tilt down",
        "zoom-in": "zoom in",
        "zoom-out": "zoom out",
        "crash-zoom": "dramatic crash zoom",
        "dolly-zoom": "vertigo dolly zoom effect",
        "tracking-left": "tracking shot moving left",
        "tracking-right": "tracking shot moving right",
        "arc-left": "arc around subject to the left",
        "arc-right": "arc around subject to the right",
        "crane-up": "crane shot moving up",
        "crane-down": "crane shot moving down",
        "handheld": "handheld camera with natural shake",
        "360-orbit": "360 degree orbit around subject",
        "fpv-drone": "FPV drone sweep",
        "bullet-time": "bullet time frozen spin effect",
      };
      
      const shotLabels: Record<string, string> = {
        "extreme-wide": "extreme wide shot",
        "wide": "wide shot",
        "medium-wide": "medium wide shot",
        "medium": "medium shot",
        "medium-close": "medium close-up",
        "close-up": "close-up",
        "extreme-close": "extreme close-up",
      };
      
      const sensorLabels: Record<string, string> = {
        "digital-cinema": "shot on digital cinema camera",
        "arri-alexa": "shot on ARRI Alexa 35",
        "red-komodo": "shot on RED Komodo",
        "film-35mm": "shot on 35mm film with grain",
        "film-16mm": "shot on 16mm film with heavy grain",
        "vhs": "VHS aesthetic with analog artifacts",
      };
      
      const lensLabels: Record<string, string> = {
        "12mm": "12mm ultra wide lens",
        "24mm": "24mm wide lens",
        "35mm": "35mm standard lens",
        "50mm": "50mm lens",
        "85mm": "85mm portrait lens with bokeh",
        "135mm": "135mm telephoto with compression",
      };
      
      // Build cinematic prompt enhancement
      const movements = cameraMovements.map((m: string) => movementLabels[m] || m).join(", then ");
      const shot = shotLabels[shotType] || "medium shot";
      const sensor = sensorLabels[cameraSensor] || "";
      const lens = lensLabels[lensType] || "";
      const intensityDesc = movementIntensity > 70 ? "dramatic" : movementIntensity > 40 ? "smooth" : "subtle";
      
      prompt = `Cinematic ${shot}, ${intensityDesc} camera movement: ${movements}. ${lens}. ${sensor}. ${rawPrompt}`;
      console.log(`Cinema prompt enhanced: ${prompt}`);
    }

    // SSE streaming response for real-time progress (video and cinema)
    if (stream && (type === "video" || type === "cinema")) {
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

            // Check if this is a Lovable AI image model (for Cinema Studio image mode)
            const aiImageModel = AI_IMAGE_MODELS[model];
            if (aiImageModel) {
              const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
              if (!LOVABLE_API_KEY) {
                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                sendEvent('error', { message: 'LOVABLE_API_KEY not configured' });
                controller.close();
                return;
              }

              try {
                sendEvent('status', { stage: 'generating', message: 'Generating image with AI...', progress: 30 });

                // Merge reference images
                const allReferenceImages = referenceImageUrls.length > 0 
                  ? referenceImageUrls 
                  : (referenceImageUrl ? [referenceImageUrl] : []);

                // Build message content
                let messageContent: unknown;
                if (allReferenceImages.length > 0) {
                  const imageEntries = allReferenceImages.map((url: string) => ({
                    type: "image_url",
                    image_url: { url }
                  }));
                  
                  const referenceDescription = allReferenceImages.length === 1 
                    ? "the provided image as a style reference"
                    : `the ${allReferenceImages.length} provided images as style references`;
                  
                  messageContent = [
                    {
                      type: "text",
                      text: `Using ${referenceDescription}, generate a new cinematic image: ${prompt}${aspectRatio ? `. Aspect ratio: ${aspectRatio}` : ""}`
                    },
                    ...imageEntries
                  ];
                } else {
                  messageContent = `Generate a cinematic image: ${prompt}${aspectRatio ? `. Aspect ratio: ${aspectRatio}` : ""}`;
                }

                const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: aiImageModel,
                    messages: [{ role: "user", content: messageContent }],
                    modalities: ["image", "text"]
                  })
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`AI generation error: ${errorText}`);
                }

                const data = await response.json();
                const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

                if (!imageUrl) {
                  throw new Error("No image generated");
                }

                sendEvent('status', { stage: 'saving', message: 'Saving result...', progress: 90 });

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
                  provider_endpoint: `ai:${aiImageModel}`,
                  aspect_ratio: aspectRatio,
                  quality: quality,
                });

                sendEvent('complete', {
                  success: true,
                  result: { type: 'image', output_url: imageUrl },
                  credits_remaining: hasActiveSubscription ? currentCredits : currentCredits - creditCost
                });
                controller.close();
                return;

              } catch (error) {
                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                sendEvent('error', { message: errorMsg });
                controller.close();
                return;
              }
            }

            // Check if this is a Fal.ai image model (for Cinema Studio image mode with Fal models)
            const falImageEndpoint = FAL_IMAGE_MODELS[model];
            if (falImageEndpoint) {
              const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
              if (!FAL_API_KEY) {
                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                sendEvent('error', { message: 'FAL_API_KEY not configured' });
                controller.close();
                return;
              }

              try {
                sendEvent('status', { stage: 'generating', message: 'Generating image with Fal.ai...', progress: 30 });

                // Build the request for Fal.ai image generation
                const falInput: Record<string, unknown> = {
                  prompt: prompt,
                };

                // Add aspect ratio if provided
                if (aspectRatio) {
                  // Convert aspect ratio to Fal format
                  const ratioMap: Record<string, string> = {
                    "1:1": "square",
                    "16:9": "landscape_16_9",
                    "9:16": "portrait_16_9",
                    "4:3": "landscape_4_3",
                    "3:4": "portrait_4_3",
                    "21:9": "landscape_16_9", // fallback
                  };
                  falInput.aspect_ratio = ratioMap[aspectRatio] || "square";
                }

                // Add reference image for style transfer if provided
                const allReferenceImages = referenceImageUrls.length > 0 
                  ? referenceImageUrls 
                  : (referenceImageUrl ? [referenceImageUrl] : []);
                
                if (allReferenceImages.length > 0) {
                  falInput.image_url = allReferenceImages[0];
                }

                // Submit to Fal.ai
                const response = await fetch(`https://queue.fal.run/${falImageEndpoint}`, {
                  method: "POST",
                  headers: {
                    "Authorization": `Key ${FAL_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(falInput),
                });

                if (!response.ok) {
                  const errorText = await response.text();
                  throw new Error(`Fal.ai error: ${errorText}`);
                }

                const submitResult = await response.json();
                const requestId = submitResult.request_id;

                if (!requestId) {
                  throw new Error("No request ID returned from Fal.ai");
                }

                sendEvent('status', { stage: 'processing', message: 'Processing image...', progress: 50 });

                // Poll for result
                let imageUrl: string | null = null;
                const maxAttempts = 60; // 5 minutes max
                for (let attempt = 0; attempt < maxAttempts; attempt++) {
                  await new Promise(resolve => setTimeout(resolve, 5000));
                  
                  const statusResponse = await fetch(`https://queue.fal.run/${falImageEndpoint}/requests/${requestId}/status`, {
                    headers: {
                      "Authorization": `Key ${FAL_API_KEY}`,
                    },
                  });

                  const statusData = await statusResponse.json();
                  console.log(`Fal.ai image poll attempt ${attempt + 1}: status=${statusData.status}`);

                  if (statusData.status === "COMPLETED") {
                    // Get the result
                    const resultResponse = await fetch(`https://queue.fal.run/${falImageEndpoint}/requests/${requestId}`, {
                      headers: {
                        "Authorization": `Key ${FAL_API_KEY}`,
                      },
                    });
                    const resultData = await resultResponse.json();
                    
                    // Extract image URL from various possible locations
                    imageUrl = resultData.images?.[0]?.url || 
                               resultData.image?.url || 
                               resultData.output?.url ||
                               resultData.url;
                    break;
                  } else if (statusData.status === "FAILED" || statusData.status === "ERROR") {
                    throw new Error(statusData.error || "Image generation failed");
                  }

                  const progress = Math.min(50 + Math.round((attempt / maxAttempts) * 40), 90);
                  sendEvent('status', { stage: 'processing', message: 'Processing image...', progress });
                }

                if (!imageUrl) {
                  throw new Error("Image generation timed out");
                }

                sendEvent('status', { stage: 'saving', message: 'Saving result...', progress: 95 });

                // Save to database
                await supabase.from("generations").insert({
                  user_id: user.id,
                  prompt: prompt,
                  type: type,
                  model: model,
                  status: "completed",
                  output_url: imageUrl,
                  thumbnail_url: imageUrl,
                  credits_used: creditCost,
                  provider_endpoint: `fal:${falImageEndpoint}`,
                  aspect_ratio: aspectRatio,
                  quality: quality,
                });

                sendEvent('complete', { output_url: imageUrl, model, credits_used: creditCost });
                controller.close();
                return;
              } catch (error) {
                console.error("Fal.ai image generation error:", error);
                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                sendEvent('error', { message: errorMsg });
                controller.close();
                return;
              }
            }

            // Check if this is a Kie.ai Economy video model
            const kieVideoConfig = KIE_VIDEO_ENDPOINTS[model];
            if (kieVideoConfig) {
              // Handle Kie.ai Economy video models in streaming mode
              const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
              if (!KIE_API_KEY) {
                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                sendEvent('error', { message: 'KIE_API_KEY not configured' });
                controller.close();
                return;
              }

              try {
                sendEvent('status', { stage: 'submitting', message: 'Submitting to Economy provider...', progress: 5 });

                // Build request body for Kie.ai video
                let kieBody: Record<string, unknown>;

                if (model === "kie-runway" || model === "kie-runway-i2v" || model === "kie-runway-cinema") {
                  kieBody = {
                    prompt,
                    duration: videoDuration && [5, 8, 10].includes(videoDuration) ? videoDuration : 5,
                    aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
                    quality: quality === "1080p" ? "1080p" : "720p",
                  };
                  if (kieVideoConfig.isI2V || imageUrl) {
                    kieBody.image_url = imageUrl;
                  }
                } else if (model === "kie-veo31" || model === "kie-veo31-fast") {
                  kieBody = {
                    prompt,
                    model: kieVideoConfig.modelParam,
                    aspect_ratio: aspectRatio === "9:16" ? "9:16" : "16:9",
                  };
                  // Only veo3_fast supports I2V (reference to video)
                  if (imageUrl && model === "kie-veo31-fast") {
                    kieBody.image_url = imageUrl;
                  }
                } else {
                  const inputParams: Record<string, unknown> = { prompt };
                  
                  if (model === "kie-sora2" || model === "kie-sora2-pro") {
                    inputParams.aspect_ratio = aspectRatio === "9:16" ? "portrait" : aspectRatio === "1:1" ? "square" : "landscape";
                    if (videoDuration) inputParams.n_frames = videoDuration === 10 ? "10" : "5";
                  } else if (model === "kie-kling") {
                    inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : aspectRatio === "1:1" ? "1:1" : "16:9";
                    inputParams.duration = String(videoDuration && [5, 10].includes(videoDuration) ? videoDuration : 5);
                    inputParams.sound = false;
                  } else if (model === "kie-hailuo") {
                    inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : "16:9";
                    if (videoDuration) inputParams.duration = String(videoDuration);
                  } else if (model === "kie-luma") {
                    inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : aspectRatio === "1:1" ? "1:1" : "16:9";
                  } else if (model === "kie-wan") {
                    inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : "16:9";
                    if (videoDuration) inputParams.duration = videoDuration;
                  } else if (model === "kie-grok-video") {
                    inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : "16:9";
                  } else {
                    inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : "16:9";
                  }

                  if (kieVideoConfig.isI2V || imageUrl) {
                    inputParams.image_url = imageUrl;
                  }

                  kieBody = {
                    model: kieVideoConfig.modelParam,
                    input: inputParams,
                  };
                }

                console.log(`Streaming: Kie.ai Economy video model: ${model}`, JSON.stringify(kieBody));
                
                const { taskId } = await submitToKie(kieVideoConfig.endpoint, kieBody, KIE_API_KEY);
                
                sendEvent('status', { stage: 'queued', message: 'Video queued (Economy)...', progress: 10, taskId });

                // Save as pending for background check
                await supabase.from("generations").insert({
                  user_id: user.id,
                  prompt: prompt,
                  type: type,
                  model: model,
                  status: "pending",
                  task_id: taskId,
                  provider_endpoint: `kie:${kieVideoConfig.endpoint}`,
                  aspect_ratio: aspectRatio,
                  quality: quality,
                  credits_used: creditCost,
                });

                sendEvent('pending', { 
                  message: "Video generation started (Economy)", 
                  taskId: taskId 
                });
                controller.close();
                return;

              } catch (error) {
                if (!hasActiveSubscription) {
                  await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
                }
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                console.error("Kie.ai streaming video error:", errorMsg);
                sendEvent('error', { message: errorMsg });
                controller.close();
                return;
              }
            }

            // High Quality Fal.ai video models
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

            // Determine the primary image for I2V
            // Use imageUrl if provided, otherwise use the first reference image
            const primaryImage = imageUrl || (referenceImageUrls.length > 0 ? referenceImageUrls[0] : null);
            
            // Choose T2V or I2V endpoint based on whether we have an image
            const endpoint = primaryImage ? modelConfig.i2v : modelConfig.t2v;
            
            console.log(`Video generation: ${primaryImage ? 'I2V' : 'T2V'} mode${referenceImageUrls.length > 0 ? `, ${referenceImageUrls.length} reference image(s)` : ''}`);
            
            const falInput = buildFalVideoRequest({
              prompt,
              negativePrompt,
              aspectRatio,
              quality,
              duration: modelConfig.duration,
              imageUrl: primaryImage,
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
    const creditCost = getModelCost(model, type, quality);
    
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
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");

    // Check if this is a Kie.ai model (Economy tier)
    const isKieModel = model.startsWith("kie-");

    // IMAGE GENERATION
    if (type === "image") {
      // Check if it's a Kie.ai image model (Economy tier)
      const kieImageConfig = KIE_IMAGE_ENDPOINTS[model];
      if (kieImageConfig) {
        if (!KIE_API_KEY) {
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          return new Response(
            JSON.stringify({ error: "KIE_API_KEY not configured" }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Map aspect ratio for Kie.ai
          let kieAspectRatio = aspectRatio;
          if (model === "kie-4o-image") {
            // 4o Image supports: 1:1, 3:2, 2:3
            const ratioMap: Record<string, string> = {
              "1:1": "1:1", "16:9": "3:2", "9:16": "2:3", "4:3": "3:2", "3:4": "2:3",
            };
            kieAspectRatio = ratioMap[aspectRatio] || "1:1";
          }

          // Build request body based on model type
          let kieBody: Record<string, unknown>;
          
          // Special handling for models using /api/v1/jobs/createTask endpoint
          if (kieImageConfig.endpoint === "/api/v1/jobs/createTask") {
            kieBody = {
              model: kieImageConfig.modelParam || model.replace("kie-", ""),
              input: {
                prompt,
                aspect_ratio: kieAspectRatio,
              }
            };
            // Add reference images if provided
            const allReferenceImages = referenceImageUrls.length > 0 
              ? referenceImageUrls 
              : (referenceImageUrl ? [referenceImageUrl] : []);
            if (allReferenceImages.length > 0) {
              (kieBody.input as Record<string, unknown>).input_image_urls = allReferenceImages.slice(0, 5);
            }
          } else {
            // Standard Kie.ai image endpoint format
            kieBody = {
              prompt,
              [kieImageConfig.aspectRatioKey]: kieAspectRatio,
            };

            // Flux Kontext requires model version
            if (model === "kie-flux-kontext-pro") {
              kieBody.model = "flux-kontext-pro";
            } else if (model === "kie-flux-kontext-max") {
              kieBody.model = "flux-kontext-max";
            }

            // Add reference images if provided
            const allReferenceImages = referenceImageUrls.length > 0 
              ? referenceImageUrls 
              : (referenceImageUrl ? [referenceImageUrl] : []);
            
            if (allReferenceImages.length > 0) {
              kieBody.input_image_urls = allReferenceImages.slice(0, 5); // Kie supports up to 5
            }
          }

          console.log(`Using Kie.ai Economy model: ${model}`);
          
          const { taskId } = await submitToKie(kieImageConfig.endpoint, kieBody, KIE_API_KEY);
          
           // Poll briefly for result; if it takes longer, continue in background to avoid request timeouts
           const maxAttempts = 10;
          const pollInterval = 2000;
          
          for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            
            const status = await checkKieStatus(model, taskId, KIE_API_KEY);
            console.log(`Kie.ai image poll attempt ${attempt + 1}: status=${status.status}`);
            
            if (status.status === "COMPLETED") {
              const imageUrl =
                status.result?.output_url ||
                status.result?.image_url ||
                status.result?.url ||
                status.result?.response?.resultUrl ||
                status.result?.response?.imageUrl ||
                status.result?.response?.image_url ||
                (Array.isArray(status.result?.response?.resultUrls)
                  ? status.result.response.resultUrls[0]
                  : undefined) ||
                (Array.isArray(status.result?.resultUrls) ? status.result.resultUrls[0] : undefined);
              
              if (imageUrl) {
                await supabase.from("generations").insert({
                  user_id: user.id,
                  prompt: prompt,
                  type: type,
                  model: model,
                  status: "completed",
                  output_url: imageUrl,
                  thumbnail_url: imageUrl,
                  credits_used: creditCost,
                  provider_endpoint: `kie:${kieImageConfig.endpoint}`,
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

           // Still processing -> save as pending and let check-generation complete it.
           const { data: pendingGen, error: pendingErr } = await supabase
             .from("generations")
             .insert({
               user_id: user.id,
               prompt: prompt,
               type: type,
               model: model,
               status: "pending",
               task_id: taskId,
               provider_endpoint: `kie:${kieImageConfig.endpoint}`,
               aspect_ratio: aspectRatio,
               quality: quality,
               credits_used: creditCost,
             })
             .select()
             .single();

           if (pendingErr) {
             console.error("Failed to create pending generation:", pendingErr);
             // Only refund if we could not persist the job.
             if (!hasActiveSubscription) {
               await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
             }
             return new Response(
               JSON.stringify({ error: "Image generation is taking longer than expected. Please try again." }),
               { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
             );
           }

           return new Response(
             JSON.stringify({
               success: true,
               pending: true,
               message: "Generation is taking longer than expected and will continue in the background.",
               generation: pendingGen,
               taskId,
               credits_remaining: hasActiveSubscription ? currentCredits : currentCredits - creditCost,
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

      // Check for Fal.ai API key (needed for HQ models)
      if (!FAL_API_KEY && !isKieModel) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({ error: "FAL_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Check if it's a Lovable AI model (e.g., Nano Banana)
      const aiModel = AI_IMAGE_MODELS[model];
      if (aiModel) {
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
          // Merge reference images (support both legacy single and new array)
          const allReferenceImages = referenceImageUrls.length > 0 
            ? referenceImageUrls 
            : (referenceImageUrl ? [referenceImageUrl] : []);
          
          console.log(`Using AI model: ${aiModel}${allReferenceImages.length > 0 ? ` with ${allReferenceImages.length} reference image(s)` : ''}`);
          
          // Build message content - include reference images if provided
          let messageContent: unknown;
          if (allReferenceImages.length > 0) {
            // Image editing / style transfer mode with multiple references
            const imageEntries = allReferenceImages.map((url: string) => ({
              type: "image_url",
              image_url: { url }
            }));
            
            const referenceDescription = allReferenceImages.length === 1 
              ? "the provided image as a style reference"
              : `the ${allReferenceImages.length} provided images as style references, blending their visual elements`;
            
            messageContent = [
              {
                type: "text",
                text: `Using ${referenceDescription}, generate a new image: ${prompt}${aspectRatio ? `. Aspect ratio: ${aspectRatio}` : ""}`
              },
              ...imageEntries
            ];
          } else {
            // Pure text-to-image mode
            messageContent = `Generate an image: ${prompt}${aspectRatio ? `. Aspect ratio: ${aspectRatio}` : ""}`;
          }
          
          const response = await fetch(AI_GATEWAY_BASE_URL, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: aiModel,
              messages: [
                {
                  role: "user",
                  content: messageContent
                }
              ],
              modalities: ["image", "text"]
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI generation error: ${errorText}`);
          }

          const data = await response.json();
          const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

          if (!imageUrl) {
            throw new Error("No image generated");
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
            provider_endpoint: `ai:${aiModel}`,
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

      console.log(`Using Fal.ai model: ${model}${referenceImageUrl ? ' with reference image' : ''}`);
      
      const falInput = buildFalImageRequest({
        prompt,
        negativePrompt,
        aspectRatio,
        model,
        referenceImageUrl,
        referenceImageUrls,
      });

      try {
        const { requestId } = await submitToFal(imageEndpoint, falInput, FAL_API_KEY!);
        
        // Poll for result (images are usually fast)
        const maxAttempts = 60;
        const pollInterval = 2000;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          
          const status = await checkFalStatus(imageEndpoint, requestId, FAL_API_KEY!);
          console.log(`Image poll attempt ${attempt + 1}: status=${status.status}`);
          
          if (status.status === "COMPLETED") {
            const result = await getFalResult(imageEndpoint, requestId, FAL_API_KEY!);
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
      // Check for Kie.ai video model first
      const kieVideoConfig = KIE_VIDEO_ENDPOINTS[model];
      if (kieVideoConfig) {
        if (!KIE_API_KEY) {
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          return new Response(
            JSON.stringify({ error: "KIE_API_KEY not configured" }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Build request body for Kie.ai video
          // Runway uses direct endpoint, others use unified /api/v1/jobs/createTask with { model, input }
          let kieBody: Record<string, unknown>;

          if (model === "kie-runway" || model === "kie-runway-i2v" || model === "kie-runway-cinema") {
            // Runway: direct endpoint with flat params
            kieBody = {
              prompt,
              duration: videoDuration && [5, 8, 10].includes(videoDuration) ? videoDuration : 5,
              aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
              quality: quality === "1080p" ? "1080p" : "720p",
            };
            if (kieVideoConfig.isI2V || imageUrl) {
              kieBody.image_url = imageUrl;
            }
          } else if (model === "kie-veo31" || model === "kie-veo31-fast") {
            // Veo 3.1 uses dedicated /api/v1/veo/generate with flat params
            kieBody = {
              prompt,
              model: kieVideoConfig.modelParam, // "veo3" or "veo3_fast"
              aspect_ratio: aspectRatio === "9:16" ? "9:16" : "16:9",
            };
            // Only veo3_fast supports I2V (reference to video)
            if (imageUrl && model === "kie-veo31-fast") {
              kieBody.image_url = imageUrl;
            }
          } else {
            // Unified createTask format: { model, input: { ... } }
            const inputParams: Record<string, unknown> = {
              prompt,
            };

            // Model-specific input parameters
            if (model === "kie-sora2" || model === "kie-sora2-pro") {
              inputParams.aspect_ratio = aspectRatio === "9:16" ? "portrait" : aspectRatio === "1:1" ? "square" : "landscape";
              if (videoDuration) inputParams.n_frames = videoDuration === 10 ? "10" : "5"; // Sora uses n_frames not duration
            } else if (model === "kie-kling") {
              // Kling requires sound (boolean) and duration as string
              inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : aspectRatio === "1:1" ? "1:1" : "16:9";
              inputParams.duration = String(videoDuration && [5, 10].includes(videoDuration) ? videoDuration : 5);
              inputParams.sound = false; // Required field
            } else if (model === "kie-hailuo") {
              inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : "16:9";
              if (videoDuration) inputParams.duration = String(videoDuration);
            } else if (model === "kie-luma") {
              inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : aspectRatio === "1:1" ? "1:1" : "16:9";
            } else if (model === "kie-wan") {
              inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : "16:9";
              if (videoDuration) inputParams.duration = videoDuration;
            } else if (model === "kie-grok-video") {
              inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : "16:9";
            } else {
              inputParams.aspect_ratio = aspectRatio === "9:16" ? "9:16" : "16:9";
            }

            // Add image URL if I2V or starting image provided
            if (kieVideoConfig.isI2V || imageUrl) {
              inputParams.image_url = imageUrl;
            }

            kieBody = {
              model: kieVideoConfig.modelParam,
              input: inputParams,
            };
          }

          console.log(`Using Kie.ai Economy video model: ${model}`, JSON.stringify(kieBody));
          
          const { taskId } = await submitToKie(kieVideoConfig.endpoint, kieBody, KIE_API_KEY);
          
          // Save as pending for background check
          await supabase.from("generations").insert({
            user_id: user.id,
            prompt: prompt,
            type: type,
            model: model,
            status: "pending",
            task_id: taskId,
            provider_endpoint: `kie:${kieVideoConfig.endpoint}`,
            aspect_ratio: aspectRatio,
            quality: quality,
            credits_used: creditCost,
          });

          return new Response(
            JSON.stringify({
              success: true,
              message: "Video generation started (Economy)",
              taskId: taskId,
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

      // Fal.ai video models (HQ)
      if (!FAL_API_KEY) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({ error: "FAL_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
        const { requestId } = await submitToFal(endpoint, falInput, FAL_API_KEY!);
        
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
      // Check for Kie.ai music model first
      const kieMusicConfig = KIE_MUSIC_ENDPOINTS[model];
      if (kieMusicConfig) {
        if (!KIE_API_KEY) {
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          return new Response(
            JSON.stringify({ error: "KIE_API_KEY not configured" }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          // Kie.ai music API requires customMode to be explicitly set.
          const lyricsText = typeof lyrics === "string" ? lyrics.trim() : "";
          const instrumentalFlag = Boolean(instrumental);
          const customMode = lyricsText.length > 0 && !instrumentalFlag;

          // Kie.ai requires callBackUrl for webhooks
          const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
          const callBackUrl = `${supabaseUrl}/functions/v1/check-generation`;

          const kieBody: Record<string, unknown> = {
            mv: kieMusicConfig.version,
            model: kieMusicConfig.model,
            instrumental: instrumentalFlag,
            customMode,
            prompt,
            callBackUrl,
          };

          if (customMode) {
            kieBody.lyrics = lyricsText;
          }

          // Add advanced music parameters for Kie.ai Suno
          // Duration: Kie.ai expects seconds (default 30)
          if (typeof requestDuration === "number" && requestDuration > 0) {
            kieBody.duration = requestDuration;
          }

          // Vocal Gender: Kie.ai uses "male" or "female" strings
          if (vocalGender && (vocalGender === "male" || vocalGender === "female")) {
            kieBody.voiceSex = vocalGender;
          }

          // Weirdness / Creativity: Map 0-100% to Kie.ai's creativity scale
          // Kie.ai uses 'creativity' or 'temperature' parameter (typically 0-1 scale)
          if (typeof weirdness === "number") {
            kieBody.creativity = weirdness / 100;
          }

          // Style Influence: Map 0-100% to prompt adherence / style strength
          // Kie.ai uses 'styleStrength' or similar (0-1 scale)
          if (typeof styleInfluence === "number") {
            kieBody.styleStrength = styleInfluence / 100;
          }

          console.log(`Using Kie.ai Economy music model: ${model}`, JSON.stringify(kieBody));
          
          const { taskId } = await submitToKie(kieMusicConfig.endpoint, kieBody, KIE_API_KEY);
          
          // NON-BLOCKING: Save task immediately and let background polling complete it
          // This prevents edge function timeout (504) on long music generations
          const { data: genData, error: insertError } = await supabase.from("generations").insert({
            user_id: user.id,
            prompt: prompt,
            title: title || null,
            type: type,
            model: model,
            status: "pending",
            task_id: taskId,
            credits_used: creditCost,
            provider_endpoint: `kie:${kieMusicConfig.endpoint}`,
          }).select("id").single();

          if (insertError) {
            console.error("Error saving generation:", insertError);
          }

          console.log(`Kie.ai music task ${taskId} saved as pending, will be completed via background polling`);

          return new Response(
            JSON.stringify({
              success: true,
              status: "pending",
              taskId,
              generationId: genData?.id,
              message: "Music generation started. Check your Library for results.",
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

      // Fal.ai music models (HQ)
      if (!FAL_API_KEY) {
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        return new Response(
          JSON.stringify({ error: "FAL_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
        instrumental,
        vocalGender,
        weirdness,
        styleInfluence,
        duration: musicDuration,
      });

      try {
        const { requestId } = await submitToFal(musicConfig.endpoint, falInput, FAL_API_KEY!);
        
        // NON-BLOCKING: Save task immediately and let background polling complete it
        // This prevents edge function timeout (504) on long music generations like Sonauto
        const { data: genData, error: insertError } = await supabase.from("generations").insert({
          user_id: user.id,
          prompt: prompt,
          title: title || null,
          type: type,
          model: model,
          status: "pending",
          task_id: requestId,
          credits_used: creditCost,
          provider_endpoint: `fal:${musicConfig.endpoint}`,
        }).select("id").single();

        if (insertError) {
          console.error("Error saving generation:", insertError);
        }

        console.log(`Fal.ai music task ${requestId} saved as pending, will be completed via background polling`);

        return new Response(
          JSON.stringify({
            success: true,
            status: "pending",
            taskId: requestId,
            generationId: genData?.id,
            message: "Music generation started. Check your Library for results.",
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

    return new Response(
      JSON.stringify({ error: "Invalid generation type" }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Generate error:", error);
    return new Response(
      JSON.stringify({ error: "Generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});