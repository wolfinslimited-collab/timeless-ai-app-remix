import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FAL_BASE_URL = "https://queue.fal.run";

// Extract Fal.ai endpoint from provider_endpoint (format: "fal:fal-ai/model/...")
const getFalEndpoint = (endpoint: string) => endpoint.replace("fal:", "");

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
    
    if (!FAL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "FAL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    for (const gen of pendingGenerations) {
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

      // Only poll provider for active items
      if (!['pending', 'processing'].includes(gen.status)) {
        results.push({ id: gen.id, status: gen.status, changed: false });
        continue;
      }

      const providerEndpoint = gen.provider_endpoint;
      
      // Only Fal.ai is supported now.
      // Accept both historical values ("fal-ai/..."), and current values ("fal:fal-ai/...").
      if (!providerEndpoint || (!providerEndpoint.startsWith("fal:") && !providerEndpoint.startsWith("fal-ai/"))) {
        results.push({ id: gen.id, status: "unsupported_provider", changed: false });
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
          // Get result (use provider-supplied response_url when available)
          const responseUrl = statusData.response_url || `${FAL_BASE_URL}/${basePath}/requests/${gen.task_id}`;
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

            // Dubbing endpoints sometimes vary response shape; try multiple known locations.
            const outputUrl =
              result?.video?.url ||
              result?.output?.video?.url ||
              result?.result?.video?.url ||
              result?.data?.video?.url ||
              result?.video_url ||
              result?.output_url ||
              result?.url ||
              result?.video;

            const thumbnailUrl =
              result?.thumbnail?.url ||
              result?.video?.thumbnail_url ||
              result?.output?.thumbnail_url ||
              outputUrl;

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
          results.push({
            id: gen.id,
            status: "pending",
            changed: false,
            provider_status: statusData.status,
          });
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