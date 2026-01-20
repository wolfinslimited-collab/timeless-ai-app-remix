import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_BASE_URL = "https://api.kie.ai/api/v1";

// Map model names to their detail endpoints
const MODEL_DETAIL_ENDPOINTS: Record<string, string> = {
  "runway-gen3-5s": "/runway/task-detail",
  "runway-gen3-10s": "/runway/task-detail",
  "veo-3": "/veo/task-detail",
  "veo-3-fast": "/veo/task-detail",
  "wan-2.1": "/wan/task-detail",
  "wan-2.1-pro": "/wan/task-detail",
  "kling-1.6-pro": "/kling/task-detail",
  "kling-1.6-pro-10s": "/kling/task-detail",
  "minimax-video": "/minimax/task-detail",
  "luma-ray2": "/luma/task-detail",
  "pika-2.0": "/pika/task-detail",
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

      const detailEndpoint = gen.provider_endpoint || MODEL_DETAIL_ENDPOINTS[gen.model];
      if (!detailEndpoint) {
        console.log(`Unknown model for generation ${gen.id}: ${gen.model}`);
        results.push({ id: gen.id, status: "unknown_model", changed: false });
        continue;
      }

      try {
        const statusResponse = await fetch(`${KIE_BASE_URL}${detailEndpoint}?taskId=${gen.task_id}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${KIE_API_KEY}` }
        });

        if (!statusResponse.ok) {
          console.log(`Status check failed for ${gen.id}: ${statusResponse.status}`);
          results.push({ id: gen.id, status: "check_failed", changed: false });
          continue;
        }

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

        if (videoUrl || status === "SUCCESS" || status === "SUCCEEDED" || status === "COMPLETED") {
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
        } else if (status === "FAILED" || status === "FAILURE") {
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
