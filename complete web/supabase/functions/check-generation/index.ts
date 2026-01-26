import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_BASE_URL = "https://queue.fal.run";
const KIE_BASE_URL = "https://api.kie.ai";

// Extract Fal.ai endpoint from provider_endpoint (format: "fal:fal-ai/model/...")
const getFalEndpoint = (endpoint: string) => endpoint.replace("fal:", "");

// Kie.ai Status Endpoints (model-specific)
const KIE_STATUS_ENDPOINTS: Record<string, string> = {
  // Image models
  "kie-4o-image": "/api/v1/gpt4o-image/record-info",
  "kie-flux-kontext-pro": "/api/v1/flux/kontext/record-info",
  "kie-flux-kontext-max": "/api/v1/flux/kontext/record-info",
  "kie-grok-imagine": "/api/v1/grok/imagine/record-info",
  "kie-seedream-4": "/api/v1/seedream/record-info",
  "kie-imagen-4": "/api/v1/google/imagen4/record-info",
  "kie-ideogram-v3": "/api/v1/ideogram/v3/record-info",
  "kie-flux2-pro": "/api/v1/flux2/pro/record-info",
  "kie-qwen-image": "/api/v1/qwen/record-info",
  "kie-midjourney": "/api/v1/midjourney/record-info",
  "kie-kling-image": "/api/v1/kling/image/record-info",
  "kie-flux-pro": "/api/v1/flux/pro/record-info",
  "kie-flux-dev": "/api/v1/flux/dev/record-info",
  "kie-flux-schnell": "/api/v1/flux/schnell/record-info",
  "kie-nano-banana": "/api/v1/jobs/recordInfo",
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

// Check Kie.ai task status
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

  const resultData = data.data || data;
  
  // Kie.ai uses multiple completion indicators:
  // 1. successFlag: 1 means completed successfully
  // 2. completeTime being set means the task finished
  // 3. status field: "completed", "success", "SUCCESS"
  // 4. errorCode/errorMessage for failures
  
  const successFlag = resultData?.successFlag;
  const completeTime = resultData?.completeTime;
  const errorCode = resultData?.errorCode;
  const errorMessage = resultData?.errorMessage;
  const status = (resultData?.status || data.status || "").toLowerCase();

  // Check for explicit failure
  if (errorCode || errorMessage || status === "failed" || status === "error" || status === "create_task_failed" || status === "generate_failed") {
    return { status: "FAILED", error: errorMessage || errorCode || "Generation failed" };
  }

  // Check for completion - successFlag=1 OR completeTime is set OR status indicates success
  if (successFlag === 1 || completeTime || status === "completed" || status === "success") {
    return { status: "COMPLETED", result: resultData };
  }

  // Still in progress
  return { status: "IN_PROGRESS" };
};

// Extract output URL from Kie.ai result (handles various response shapes)
const extractKieOutputUrl = (result: any, type: string): string | null => {
  if (!result) return null;

  // Handle /api/v1/jobs/recordInfo format where resultJson is a stringified JSON
  if (result.resultJson && typeof result.resultJson === "string") {
    try {
      const parsed = JSON.parse(result.resultJson);
      if (Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
        return parsed.resultUrls[0];
      }
      if (parsed.resultUrl) return parsed.resultUrl;
      if (parsed.imageUrl) return parsed.imageUrl;
      if (parsed.videoUrl) return parsed.videoUrl;
      if (parsed.audioUrl) return parsed.audioUrl;
    } catch {
      // Not valid JSON, continue with other extraction methods
    }
  }

  // Handle Kie.ai music response format: response.sunoData[0].audioUrl
  if (result.response?.sunoData && Array.isArray(result.response.sunoData) && result.response.sunoData.length > 0) {
    const sunoItem = result.response.sunoData[0];
    if (sunoItem.audioUrl) return sunoItem.audioUrl;
    if (sunoItem.sourceAudioUrl) return sunoItem.sourceAudioUrl;
  }

  // Try common fields - Kie.ai uses resultImageUrl in response object
  const candidates = [
    result.response?.resultImageUrl,
    result.response?.resultUrl,
    result.response?.imageUrl,
    result.response?.image_url,
    result.response?.audioUrl,
    result.response?.audio_url,
    result.response?.videoUrl,
    result.response?.video_url,
    Array.isArray(result.response?.resultUrls) ? result.response.resultUrls[0] : undefined,
    result.output_url,
    result.image_url,
    result.audio_url,
    result.video_url,
    result.url,
    result.resultImageUrl,
    result.resultUrl,
    Array.isArray(result.resultUrls) ? result.resultUrls[0] : undefined,
  ];

  for (const url of candidates) {
    if (url && typeof url === "string") return url;
  }

  return null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

     // Body is optional; UI sometimes sends `{}`.
     let generationId: string | undefined;
     try {
       const body = await req.json();
       generationId = body?.generationId;
     } catch {
       generationId = undefined;
     }

    // If specific generationId provided, check that one; otherwise check all pending
    let pendingGenerations;
    
    if (generationId) {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("id", generationId)
        .eq("user_id", user.id)
        .single();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ error: "Generation not found" }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      pendingGenerations = [data];
    } else {
      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        // Include legacy stuck items (older Translate AI used `processing` without task_id)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false });
      
      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch pending generations" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      pendingGenerations = data || [];
    }

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");

    const userId = user.id;
    const results = [];

    async function refundCreditsIfNeeded(generation: any) {
      const creditsToRefund = Number(generation?.credits_used ?? 0);
      if (!creditsToRefund || creditsToRefund <= 0) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("credits, subscription_status")
        .eq("user_id", userId)
        .single();

      const status = profile?.subscription_status ?? null;
      const isSubscribed = status === "active" || status === "trialing";
      if (isSubscribed) return;

      await supabase
        .from("profiles")
        .update({ credits: (profile?.credits || 0) + creditsToRefund })
        .eq("user_id", userId);
    }

    // Some providers (especially music) regularly take longer than a couple minutes.
    // Use a per-type timeout and only mark failed *after* we confirm the provider is still not done.
    const getTimeoutMs = (gen: any): number => {
      const type = String(gen?.type ?? "").toLowerCase();
      if (type === "music") return 20 * 60 * 1000; // 20 minutes
      if (type === "video" || type === "cinema") return 20 * 60 * 1000; // 20 minutes
      return 10 * 60 * 1000; // 10 minutes default (images/tools)
    };

    for (const gen of pendingGenerations) {
      // Check for timeout - if generation has been pending for more than 3 minutes, cancel it
      const createdAt = new Date(gen.created_at).getTime();
      const now = Date.now();
      const elapsed = now - createdAt;

      const timeoutMs = getTimeoutMs(gen);
      const isTimedOut = elapsed > timeoutMs;

      // Handle legacy Translate AI records that can never complete (no task_id)
      if (!gen.task_id) {
        const isLegacyTranslate = gen.provider_endpoint === "translate-video";
        if (gen.status === "processing" && isLegacyTranslate) {
          console.warn(`Legacy translate-ai generation without task_id: ${gen.id}. Marking failed.`);

          await refundCreditsIfNeeded(gen);

          await supabase
            .from("generations")
            .update({ status: "failed" })
            .eq("id", gen.id);

          results.push({
            id: gen.id,
            status: "failed",
            changed: true,
            credits_refunded: gen.credits_used || 0,
            error: "This was a legacy Translate job and cannot be recovered. Please re-run the translation.",
            prompt: gen.prompt,
            model: gen.model,
          });
          continue;
        }

        results.push({ id: gen.id, status: gen.status, changed: false });
        continue;
      }

      const providerEndpoint = gen.provider_endpoint;

      // Only poll provider for active items.
      // Additionally, allow recovery for rows that we previously marked `failed` due to old timeouts,
      // as long as they still have a task_id and no output_url yet.
      const isActiveStatus = ['pending', 'processing'].includes(gen.status);
      const isRecoverableFailed =
        gen.status === 'failed' &&
        !gen.output_url &&
        Boolean(gen.task_id) &&
        typeof providerEndpoint === 'string' &&
        providerEndpoint.startsWith('kie:');

      if (!isActiveStatus && !isRecoverableFailed) {
        results.push({ id: gen.id, status: gen.status, changed: false });
        continue;
      }

      // ============= KIE.AI PROVIDER =============
      if (providerEndpoint?.startsWith("kie:")) {
        if (!KIE_API_KEY) {
          console.warn(`KIE_API_KEY not configured, skipping Kie.ai generation ${gen.id}`);
          results.push({ id: gen.id, status: "pending", changed: false, error: "KIE_API_KEY not configured" });
          continue;
        }

        try {
          const kieStatus = await checkKieStatus(gen.model, gen.task_id, KIE_API_KEY);
          console.log(`Kie.ai status for ${gen.id}: ${kieStatus.status}`);

          if (kieStatus.status === "COMPLETED") {
            // For music, check if we have multiple songs in sunoData
            const sunoData = kieStatus.result?.response?.sunoData;
            const isMusic = gen.type === "music" && Array.isArray(sunoData) && sunoData.length > 0;

            if (isMusic && sunoData.length > 1) {
              // Handle multiple songs - update original with first, create new entries for the rest
              const firstSong = sunoData[0];
              const firstUrl = firstSong.audioUrl || firstSong.sourceAudioUrl;

              if (firstUrl) {
                // Update original generation with first song
                await supabase
                  .from("generations")
                  .update({
                    status: "completed",
                    output_url: firstUrl,
                    title: firstSong.title || gen.title,
                  })
                  .eq("id", gen.id);

                results.push({
                  id: gen.id,
                  status: "completed",
                  changed: true,
                  output_url: firstUrl,
                  prompt: gen.prompt,
                  model: gen.model,
                });

                // Create new entries for additional songs (starting from index 1)
                for (let i = 1; i < sunoData.length; i++) {
                  const song = sunoData[i];
                  const songUrl = song.audioUrl || song.sourceAudioUrl;
                  if (!songUrl) continue;

                  const { data: newGen, error: insertError } = await supabase
                    .from("generations")
                    .insert({
                      user_id: userId,
                      prompt: gen.prompt,
                      type: "music",
                      model: gen.model,
                      status: "completed",
                      output_url: songUrl,
                      title: song.title || `${gen.title || gen.prompt} (Variation ${i + 1})`,
                      credits_used: 0, // No extra charge for variations
                      provider_endpoint: gen.provider_endpoint,
                    })
                    .select()
                    .single();

                  if (!insertError && newGen) {
                    console.log(`Created additional song entry: ${newGen.id} for variation ${i + 1}`);
                    results.push({
                      id: newGen.id,
                      status: "completed",
                      changed: true,
                      output_url: songUrl,
                      prompt: gen.prompt,
                      model: gen.model,
                      is_variation: true,
                    });
                  }
                }
              } else {
                console.warn(`Kie.ai music COMPLETED but no audio URL in first song for ${gen.id}`);
                results.push({ id: gen.id, status: "pending", changed: false, provider_status: "COMPLETED_NO_OUTPUT" });
              }
            } else {
              // Single output (image, video, or single song)
              const outputUrl = extractKieOutputUrl(kieStatus.result, gen.type);

              if (outputUrl) {
                await supabase
                  .from("generations")
                  .update({
                    status: "completed",
                    output_url: outputUrl,
                    thumbnail_url: gen.type === "image" ? outputUrl : null,
                  })
                  .eq("id", gen.id);

                results.push({
                  id: gen.id,
                  status: "completed",
                  changed: true,
                  output_url: outputUrl,
                  thumbnail_url: gen.type === "image" ? outputUrl : undefined,
                  prompt: gen.prompt,
                  model: gen.model,
                });
              } else {
                console.warn(`Kie.ai COMPLETED but no output URL for ${gen.id}:`, JSON.stringify(kieStatus.result));
                results.push({ id: gen.id, status: "pending", changed: false, provider_status: "COMPLETED_NO_OUTPUT" });
              }
            }
          } else if (kieStatus.status === "FAILED") {
            await refundCreditsIfNeeded(gen);

            await supabase
              .from("generations")
              .update({ status: "failed" })
              .eq("id", gen.id);

            results.push({
              id: gen.id,
              status: "failed",
              changed: true,
              credits_refunded: gen.credits_used,
              error: kieStatus.error || "Generation failed",
              prompt: gen.prompt,
              model: gen.model,
            });
           } else {
             // Still processing
             if (isTimedOut) {
               console.warn(
                 `Generation ${gen.id} timed out after ${Math.round(elapsed / 1000)}s (limit ${Math.round(timeoutMs / 1000)}s). Cancelling and refunding.`
               );

               await refundCreditsIfNeeded(gen);

               await supabase
                 .from("generations")
                 .update({ status: "failed" })
                 .eq("id", gen.id);

               results.push({
                 id: gen.id,
                 status: "failed",
                 changed: true,
                 credits_refunded: gen.credits_used || 0,
                 error: `Generation timed out after ${Math.round(timeoutMs / 60000)} minutes`,
                 prompt: gen.prompt,
                 model: gen.model,
               });
             } else {
               results.push({
                 id: gen.id,
                 status: "pending",
                 changed: false,
                 provider_status: kieStatus.status,
               });
             }
           }
        } catch (err) {
          console.error(`Error checking Kie.ai generation ${gen.id}:`, err);
          results.push({ id: gen.id, status: "error", changed: false, error: String(err) });
        }
        continue;
      }

      // ============= FAL.AI PROVIDER =============
      // Accept both historical values ("fal-ai/..."), and current values ("fal:fal-ai/...").
      if (!providerEndpoint || (!providerEndpoint.startsWith("fal:") && !providerEndpoint.startsWith("fal-ai/"))) {
        results.push({ id: gen.id, status: "unsupported_provider", changed: false });
        continue;
      }

      if (!FAL_API_KEY) {
        console.warn(`FAL_API_KEY not configured, skipping Fal.ai generation ${gen.id}`);
        results.push({ id: gen.id, status: "pending", changed: false, error: "FAL_API_KEY not configured" });
        continue;
      }

      try {
        const falEndpoint = providerEndpoint.startsWith("fal:")
          ? getFalEndpoint(providerEndpoint)
          : providerEndpoint;
        const basePath = falEndpoint.split('/').slice(0, 2).join('/');
        
        console.log(`Checking Fal.ai status for ${gen.id}: ${basePath}, task: ${gen.task_id}`);
        
        // Check status
        const statusResp = await fetch(`${FAL_BASE_URL}/${basePath}/requests/${gen.task_id}/status`, {
          headers: { "Authorization": `Key ${FAL_API_KEY}` }
        });
        
        if (!statusResp.ok) {
          const errorText = await statusResp.text();
          console.error(`Fal.ai status error for ${gen.id}:`, errorText);
          results.push({ id: gen.id, status: "check_failed", changed: false, error: errorText });
          continue;
        }

        const statusData = await statusResp.json();
        console.log(`Fal.ai status for ${gen.id}:`, JSON.stringify(statusData));

        if (statusData.status === "COMPLETED") {
          // IMPORTANT: Do not rely on `response_url`.
          // We submit jobs to a versioned endpoint (e.g. /wan/v2.6/image-to-video),
          // but queue polling + result fetching must happen via the base path:
          //   GET /fal-ai/<model>/requests/<id>
          // The provider-supplied `response_url` has been observed to include
          // endpoint suffixes that 404 (e.g. "Path /v2.6 not found", "Path /image-to-video not found").
          const responseUrl = `${FAL_BASE_URL}/${basePath}/requests/${gen.task_id}`;

          const resultResp = await fetch(responseUrl, {
            headers: { "Authorization": `Key ${FAL_API_KEY}` }
          });
          
          if (resultResp.ok) {
            const raw = await resultResp.text();
            console.log(`Fal.ai result raw for ${gen.id}:`, raw);

            let result: any = null;
            try {
              result = JSON.parse(raw);
            } catch {
              result = null;
            }

            // Try multiple known locations for output URL
            // Sonauto returns audio as array: { audio: [{ url: "..." }] }
            const outputUrl =
              result?.video?.url ||
              result?.output?.video?.url ||
              result?.result?.video?.url ||
              result?.data?.video?.url ||
              result?.video_url ||
              result?.output_url ||
              result?.url ||
              result?.video ||
              result?.images?.[0]?.url ||
              result?.image?.url ||
              result?.audio_file?.url ||
              result?.audio?.[0]?.url ||
              result?.audio?.url ||
              result?.audio_url;

            const thumbnailUrl =
              result?.thumbnail?.url ||
              result?.video?.thumbnail_url ||
              result?.output?.thumbnail_url ||
              (gen.type === "image" ? outputUrl : null);

            if (outputUrl) {
              await supabase
                .from("generations")
                .update({
                  status: "completed",
                  output_url: outputUrl,
                  thumbnail_url: thumbnailUrl || null,
                })
                .eq("id", gen.id);

              

              results.push({
                id: gen.id,
                status: "completed",
                changed: true,
                output_url: outputUrl,
                thumbnail_url: thumbnailUrl,
                prompt: gen.prompt,
                model: gen.model,
              });
            } else {
              results.push({ id: gen.id, status: "pending", changed: false, provider_status: "COMPLETED_NO_OUTPUT" });
            }
          } else {
            const errorText = await resultResp.text().catch(() => "");
            console.error(
              `Fal.ai result fetch failed for ${gen.id}: HTTP ${resultResp.status}. Body: ${errorText}`
            );

            // Permanent failures (e.g. invalid input) should not stay stuck in pending.
            if ([400, 401, 403, 404, 422].includes(resultResp.status)) {
              await refundCreditsIfNeeded(gen);
              await supabase
                .from("generations")
                .update({ status: "failed" })
                .eq("id", gen.id);

              results.push({
                id: gen.id,
                status: "failed",
                changed: true,
                credits_refunded: gen.credits_used,
                provider_status: `RESULT_FETCH_FAILED_${resultResp.status}`,
                error: errorText,
              });
            } else {
              // Keep pending; some providers briefly report COMPLETED before response is available.
              results.push({
                id: gen.id,
                status: "pending",
                changed: false,
                provider_status: `RESULT_FETCH_FAILED_${resultResp.status}`,
                error: errorText,
              });
            }
          }
        } else if (statusData.status === "FAILED") {
          await refundCreditsIfNeeded(gen);

          await supabase
            .from("generations")
            .update({ status: "failed" })
            .eq("id", gen.id);

          results.push({
            id: gen.id,
            status: "failed",
            changed: true,
            credits_refunded: gen.credits_used,
            error: statusData.error || "Generation failed",
            prompt: gen.prompt,
            model: gen.model,
          });
        } else {
          // Still processing (IN_QUEUE or IN_PROGRESS)
          if (isTimedOut) {
            console.warn(
              `Generation ${gen.id} timed out after ${Math.round(elapsed / 1000)}s (limit ${Math.round(timeoutMs / 1000)}s). Cancelling and refunding.`
            );

            await refundCreditsIfNeeded(gen);

            await supabase
              .from("generations")
              .update({ status: "failed" })
              .eq("id", gen.id);

            results.push({
              id: gen.id,
              status: "failed",
              changed: true,
              credits_refunded: gen.credits_used || 0,
              error: `Generation timed out after ${Math.round(timeoutMs / 60000)} minutes`,
              prompt: gen.prompt,
              model: gen.model,
            });
          } else {
            results.push({
              id: gen.id,
              status: "pending",
              changed: false,
              provider_status: statusData.status,
            });
          }
        }
      } catch (err) {
        console.error(`Error checking generation ${gen.id}:`, err);
        results.push({ id: gen.id, status: "error", changed: false, error: String(err) });
      }
    }


    return new Response(
      JSON.stringify({ results, pending_count: results.filter(r => r.status === "pending").length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error("Check generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
