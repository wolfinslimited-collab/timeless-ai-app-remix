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

    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    
    if (!FAL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "FAL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];

    for (const gen of pendingGenerations) {
      if (!gen.task_id || gen.status !== "pending") {
        results.push({ id: gen.id, status: gen.status, changed: false });
        continue;
      }

      const providerEndpoint = gen.provider_endpoint;
      
      // Only Fal.ai is supported now
      if (!providerEndpoint?.startsWith("fal:")) {
        results.push({ id: gen.id, status: "unsupported_provider", changed: false });
        continue;
      }

      try {
        const falEndpoint = getFalEndpoint(providerEndpoint);
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
          // Get result
          const resultResp = await fetch(`${FAL_BASE_URL}/${basePath}/requests/${gen.task_id}`, {
            headers: { "Authorization": `Key ${FAL_API_KEY}` }
          });
          
          if (resultResp.ok) {
            const result = await resultResp.json();
            console.log(`Fal.ai result for ${gen.id}:`, JSON.stringify(result));
            
            const videoUrl = result.video?.url;
            const imageUrl = result.images?.[0]?.url;
            const outputUrl = videoUrl || imageUrl;
            const thumbnailUrl = result.thumbnail?.url || outputUrl;

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
            results.push({ id: gen.id, status: "pending", changed: false, provider_status: "RESULT_FETCH_FAILED" });
          }
        } else if (statusData.status === "FAILED") {
          // Refund credits
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