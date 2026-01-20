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

const KIE_VIDEO_MODELS: Record<string, { endpoint: string; detailEndpoint: string; model: string; duration?: number; useAspectUnderscore?: boolean; maxPollingTime?: number }> = {
  "runway-gen3-5s": { endpoint: "/runway/generate", detailEndpoint: "/runway/task-detail", model: "gen3a_turbo", duration: 5, maxPollingTime: 240 },
  "runway-gen3-10s": { endpoint: "/runway/generate", detailEndpoint: "/runway/task-detail", model: "gen3a_turbo", duration: 10, maxPollingTime: 360 },
  // Veo can be very slow; keep generous polling time
  "veo-3": { endpoint: "/veo/generate", detailEndpoint: "/veo/task-detail", model: "veo3", useAspectUnderscore: true, maxPollingTime: 900 },
  "veo-3-fast": { endpoint: "/veo/generate", detailEndpoint: "/veo/task-detail", model: "veo3_fast", useAspectUnderscore: true, maxPollingTime: 600 },
  "wan-2.1": { endpoint: "/wan/generate", detailEndpoint: "/wan/task-detail", model: "wan2.1", duration: 5, maxPollingTime: 240 },
  "wan-2.1-pro": { endpoint: "/wan/generate", detailEndpoint: "/wan/task-detail", model: "wan2.1-pro", duration: 5, maxPollingTime: 360 },
  "kling-1.6-pro": { endpoint: "/kling/generate", detailEndpoint: "/kling/task-detail", model: "kling-v1-6-pro", duration: 5, maxPollingTime: 420 },
  "kling-1.6-pro-10s": { endpoint: "/kling/generate", detailEndpoint: "/kling/task-detail", model: "kling-v1-6-pro", duration: 10, maxPollingTime: 600 },
  "minimax-video": { endpoint: "/minimax/generate", detailEndpoint: "/minimax/task-detail", model: "video-01", maxPollingTime: 360 },
  "luma-ray2": { endpoint: "/luma/generate", detailEndpoint: "/luma/task-detail", model: "ray2", maxPollingTime: 420 },
  "pika-2.0": { endpoint: "/pika/generate", detailEndpoint: "/pika/task-detail", model: "pika-2.0", maxPollingTime: 360 },
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

            const generateResponse = await fetch(`${KIE_BASE_URL}${modelConfig.endpoint}`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${KIE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: prompt,
                model: modelConfig.model,
                ...(modelConfig.useAspectUnderscore ? { aspect_ratio: aspectRatio } : { aspectRatio: aspectRatio }),
                quality: quality,
                duration: modelConfig.duration || 5,
                ...(negativePrompt && { negative_prompt: negativePrompt }),
                ...(imageUrl && { image_url: imageUrl }),
              })
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
            const taskId = generateData.data?.taskId;

            if (!taskId) {
              const errorMsg = generateData.msg || generateData.message || "Unknown error";
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

              const statusResponse = await fetch(`${KIE_BASE_URL}${modelConfig.detailEndpoint}?taskId=${taskId}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
              });

              if (!statusResponse.ok) continue;

              const statusData = await statusResponse.json();
              const rawStatus =
                statusData?.data?.status ??
                statusData?.data?.state ??
                statusData?.status ??
                statusData?.state;

              const status = typeof rawStatus === "string" ? rawStatus.toUpperCase() : rawStatus;

              const videoUrl =
                (Array.isArray(statusData?.data?.output) ? statusData.data.output[0] : undefined) ||
                statusData?.data?.video?.url ||
                statusData?.data?.video_url ||
                statusData?.data?.result?.video?.url ||
                statusData?.data?.result?.url ||
                statusData?.data?.url;

              const thumbnailUrl =
                statusData?.data?.thumbnail ||
                statusData?.data?.thumbnail_url ||
                statusData?.data?.cover ||
                videoUrl;

              // If we have a URL, consider it complete even if the provider uses a different status string.
              if (videoUrl || status === "SUCCESS" || status === "SUCCEEDED" || status === "COMPLETED") {
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
              } else if (status === "FAILED" || status === "FAILURE") {
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

      const generateResponse = await fetch(`${KIE_BASE_URL}${modelConfig.endpoint}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KIE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          model: modelConfig.model,
          ...(modelConfig.useAspectUnderscore ? { aspect_ratio: aspectRatio } : { aspectRatio: aspectRatio }),
          quality: quality,
          duration: modelConfig.duration || 5,
          ...(negativePrompt && { negative_prompt: negativePrompt }),
          ...(imageUrl && { image_url: imageUrl }),
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
      console.log("Kie.ai video response:", JSON.stringify(generateData));
      
      const taskId = generateData.data?.taskId;
      
      if (!taskId) {
        const errorMsg = generateData.msg || generateData.message || "Unknown error";
        console.error("No taskId returned:", generateData);
        if (!hasActiveSubscription) {
          await supabase.from("profiles").update({ credits: currentCredits }).eq("user_id", user.id);
          console.log("Credits refunded due to API error");
        }
        throw new Error(`Video API error: ${errorMsg}`);
      }

      console.log(`Kie.ai video task started: ${taskId}`);

      // Poll for result (max 3 minutes for video)
      let videoUrl = null;
      let thumbnailUrl = null;
      const maxAttempts = 36;
      const pollInterval = 5000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const statusResponse = await fetch(`${KIE_BASE_URL}${modelConfig.detailEndpoint}?taskId=${taskId}`, {
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
