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
  
  // Video models
  "runway-gen3-5s": 15,
  "runway-gen3-10s": 25,
  "veo-3": 20,
  "veo-3-fast": 12,
  "wan-2.1": 8,
  "wan-2.1-pro": 12,
  "kling-1.6-pro": 18,
  "kling-1.6-pro-10s": 30,
  "minimax-video": 10,
  "luma-ray2": 15,
  "pika-2.0": 12,
};

// Fallback costs
const DEFAULT_CREDITS = {
  image: 5,
  video: 15,
};

const getModelCost = (model: string, type: string): number => {
  return MODEL_CREDITS[model] ?? DEFAULT_CREDITS[type as keyof typeof DEFAULT_CREDITS] ?? 5;
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

const KIE_VIDEO_MODELS: Record<string, { endpoint: string; model: string; duration?: number }> = {
  "runway-gen3-5s": { endpoint: "/runway/generate", model: "runway-duration-5-generate", duration: 5 },
  "runway-gen3-10s": { endpoint: "/runway/generate", model: "runway-duration-10-generate", duration: 10 },
  "veo-3": { endpoint: "/veo/generate", model: "veo-3" },
  "veo-3-fast": { endpoint: "/veo/generate", model: "veo-3-fast" },
  "wan-2.1": { endpoint: "/wan/generate", model: "wan-2.1-t2v-480p" },
  "wan-2.1-pro": { endpoint: "/wan/generate", model: "wan-2.1-t2v-720p" },
  "kling-1.6-pro": { endpoint: "/kling/generate", model: "kling-1.6-pro-5s" },
  "kling-1.6-pro-10s": { endpoint: "/kling/generate", model: "kling-1.6-pro-10s" },
  "minimax-video": { endpoint: "/minimax/generate", model: "minimax-video-01" },
  "luma-ray2": { endpoint: "/luma/generate", model: "ray-2" },
  "pika-2.0": { endpoint: "/pika/generate", model: "pika-2.0" },
};

const KIE_BASE_URL = "https://api.kie.ai/api/v1";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type, model, aspectRatio = "1:1", imageUrl } = await req.json();
    
    console.log(`Generation request - Type: ${type}, Model: ${model}, Aspect: ${aspectRatio}, I2V: ${!!imageUrl}, Prompt: ${prompt?.substring(0, 50)}...`);

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
          quality: "720p",
          duration: modelConfig.duration || 5,
          ...(imageUrl && { imageUrl: imageUrl }),
        })
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
      const taskId = generateData.data?.taskId;
      
      if (!taskId) {
        console.error("No taskId returned:", generateData);
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
        }
        throw new Error("Failed to start video generation");
      }

      console.log(`Kie.ai video task started: ${taskId}`);

      // Poll for result (max 3 minutes for video)
      let videoUrl = null;
      let thumbnailUrl = null;
      const maxAttempts = 36;
      const pollInterval = 5000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const endpointBase = modelConfig.endpoint.split('/')[1];
        const statusResponse = await fetch(`${KIE_BASE_URL}/${endpointBase}/details?taskId=${taskId}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
        });

        if (!statusResponse.ok) {
          console.log(`Status check attempt ${attempt + 1} failed`);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`Video status check ${attempt + 1}:`, statusData.data?.status);

        if (statusData.data?.status === "SUCCESS") {
          videoUrl = statusData.data?.output?.[0] || statusData.data?.video?.url;
          thumbnailUrl = statusData.data?.thumbnail || videoUrl;
          console.log("Video generation complete:", videoUrl);
          break;
        } else if (statusData.data?.status === "FAILED") {
          console.error("Video generation failed:", statusData);
          if (!hasActiveSubscription) {
            await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          }
          throw new Error("Video generation failed");
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
