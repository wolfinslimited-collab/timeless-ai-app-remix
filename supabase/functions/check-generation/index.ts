import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_BASE_URL = "https://api.kie.ai/api/v1";

// Unified task status endpoint (works across many Kie Market tasks; needed for Veo in newer API versions)
const KIE_UNIFIED_DETAIL_ENDPOINT = "/jobs/recordInfo";

// Veo-specific task status endpoint (official for Veo 3.1)
const KIE_VEO_DETAIL_ENDPOINT = "/veo/record-info";

// Map model names to their detail endpoints - LATEST VERSIONS ONLY
const MODEL_DETAIL_ENDPOINTS: Record<string, string> = {
  // Kling 2.6 (latest)
  "kling-2.6-t2v": KIE_UNIFIED_DETAIL_ENDPOINT,
  "kling-2.6-i2v": KIE_UNIFIED_DETAIL_ENDPOINT,
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || '' } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { generationId } = await req.json();

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
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      
      if (error) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch pending generations" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      pendingGenerations = data || [];
    }

    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const gen of pendingGenerations) {
      if (!gen.task_id || gen.status !== "pending") {
        results.push({ id: gen.id, status: gen.status, changed: false });
        continue;
      }

      const mappedEndpoint = MODEL_DETAIL_ENDPOINTS[gen.model];

      const isVeo = typeof gen.model === 'string' && gen.model.startsWith('veo-');
      const primaryEndpoint = gen.provider_endpoint || mappedEndpoint;
      if (!primaryEndpoint && !isVeo) {
        console.log(`Unknown model for generation ${gen.id}: ${gen.model}`);
        results.push({ id: gen.id, status: "unknown_model", changed: false });
        continue;
      }

      try {
        // Some providers return 404 on legacy *task-detail endpoints; Veo now needs /jobs/recordInfo
        const tryFetch = async (endpoint: string) => {
          const url = `${KIE_BASE_URL}${endpoint}?taskId=${encodeURIComponent(gen.task_id)}`;
          return await fetch(url, {
            method: "GET",
            headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
          });
        };

        // Try provider-specific endpoint first; Veo uses /veo/record-info.
        const endpointsToTry = isVeo
          ? [KIE_VEO_DETAIL_ENDPOINT, "/veo/task-detail", KIE_UNIFIED_DETAIL_ENDPOINT]
          : [primaryEndpoint];

        let usedEndpoint = endpointsToTry[0];
        let statusResponse: Response | null = null;

        for (const ep of endpointsToTry) {
          usedEndpoint = ep;
          const resp = await tryFetch(ep);
          if (resp.ok) {
            statusResponse = resp;
            break;
          }
          // If not ok, continue trying fallbacks
        }

        if (!statusResponse) {
          results.push({ id: gen.id, status: "check_failed", changed: false });
          continue;
        }

        if (!statusResponse.ok) {
          console.log(`Status check failed for ${gen.id}: ${statusResponse.status}`);
          results.push({ id: gen.id, status: "check_failed", changed: false });
          continue;
        }

        const statusData = await statusResponse.json();

        const providerCode = statusData?.code;
        const providerMsg = statusData?.msg ?? statusData?.message;
        
        // Normalize status across providers (handle both string and numeric statuses)
        const rawStatus =
          statusData?.data?.response?.status ??
          statusData?.data?.status ??
          statusData?.data?.state ??
          statusData?.status ??
          statusData?.state;

        // Veo uses numeric: 0=pending, 1=success, 2/3=failed
        const successFlag =
          statusData?.data?.response?.successFlag ??
          statusData?.data?.successFlag ??
          statusData?.successFlag;

        const status = typeof rawStatus === "string" ? rawStatus.toUpperCase() : String(rawStatus || "").toUpperCase();

        // Unified endpoint returns a stringified JSON result in data.resultJson
        let unifiedResult: any = null;
        const resultJson = statusData?.data?.resultJson;
        if (typeof resultJson === "string") {
          try {
            unifiedResult = JSON.parse(resultJson);
          } catch {
            unifiedResult = null;
          }
        } else if (resultJson && typeof resultJson === "object") {
          unifiedResult = resultJson;
        }

        // Extract video URL from various response formats (including Veo record-info and unified resultJson)
        const videoUrl =
          (Array.isArray(unifiedResult?.resultUrls) ? unifiedResult.resultUrls[0] : undefined) ||
          (Array.isArray(statusData?.data?.response?.resultUrls) ? statusData.data.response.resultUrls[0] : undefined) ||
          (Array.isArray(statusData?.data?.response?.resultUrls) ? statusData.data.response.resultUrls[0] : undefined) ||
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

        // Determine success/failure
        const isSuccessStatus = ["SUCCESS", "SUCCEEDED", "COMPLETED", "DONE", "FINISHED"].includes(status);
        const isFailedStatus = ["FAILED", "FAILURE"].includes(status);
        const isSuccess = !!videoUrl || successFlag === 1 || isSuccessStatus;
        const isFailed = successFlag === 2 || successFlag === 3 || isFailedStatus;

        console.log(
          `Generation ${gen.id} check: endpoint=${usedEndpoint}, code=${providerCode}, msg=${providerMsg}, status=${status}, successFlag=${successFlag}, videoUrl=${!!videoUrl}`,
        );

        if (isSuccess) {
          // Update generation as completed
          await supabase
            .from("generations")
            .update({
              status: "completed",
              output_url: videoUrl || null,
              thumbnail_url: thumbnailUrl || null,
            })
            .eq("id", gen.id);

          results.push({
            id: gen.id,
            status: "completed",
            changed: true,
            output_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            prompt: gen.prompt,
            model: gen.model,
          });
        } else if (isFailed) {
          // Refund credits if needed
          const { data: profile } = await supabase
            .from("profiles")
            .select("credits, subscription_status")
            .eq("user_id", user.id)
            .single();

          if (profile && profile.subscription_status !== 'active') {
            await supabase
              .from("profiles")
              .update({ credits: (profile.credits || 0) + gen.credits_used })
              .eq("user_id", user.id);
          }

          await supabase
            .from("generations")
            .update({ status: "failed" })
            .eq("id", gen.id);

          results.push({
            id: gen.id,
            status: "failed",
            changed: true,
            credits_refunded: gen.credits_used,
            prompt: gen.prompt,
            model: gen.model,
          });
        } else {
          // Still processing
          results.push({
            id: gen.id,
            status: "pending",
            changed: false,
            provider_status: status,
            provider_code: providerCode,
            provider_msg: providerMsg,
            provider_success_flag: successFlag,
          });
        }
      } catch (err) {
        console.error(`Error checking generation ${gen.id}:`, err);
        results.push({ id: gen.id, status: "error", changed: false });
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
