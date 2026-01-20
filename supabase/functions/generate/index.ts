import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CREDIT_COSTS = {
  image: 5,
  video: 10,
};

// Map our model IDs to Kie.ai models
const KIE_MODEL_MAP: Record<string, string> = {
  "gemini-3-flash": "runway-duration-5-generate",
  "sora-2": "runway-duration-10-generate",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, type, model } = await req.json();
    
    console.log(`Generation request - Type: ${type}, Model: ${model}, Prompt: ${prompt?.substring(0, 50)}...`);

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
    const creditCost = CREDIT_COSTS[type as keyof typeof CREDIT_COSTS] || 5;
    
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

    let result;
    
    if (type === "image") {
      // Image generation using Gemini image model
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `Generate a high-quality, visually stunning image based on this description: ${prompt}`
            }
          ],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error:", errorText);
        
        // Refund credits on failure
        await supabase
          .from("profiles")
          .update({ credits: currentCredits })
          .eq("user_id", user.id);
        
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Image generation response received");
      
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!imageUrl) {
        // Refund credits if no image generated
        await supabase
          .from("profiles")
          .update({ credits: currentCredits })
          .eq("user_id", user.id);
        
        throw new Error("No image generated");
      }

      result = {
        type: "image",
        output_url: imageUrl,
        thumbnail_url: imageUrl,
      };
    } else {
      // Video generation using Kie.ai API
      const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
      if (!KIE_API_KEY) {
        // Refund credits
        await supabase
          .from("profiles")
          .update({ credits: currentCredits })
          .eq("user_id", user.id);
        throw new Error("KIE_API_KEY is not configured");
      }

      const kieModel = KIE_MODEL_MAP[model] || "runway-duration-5-generate";
      console.log(`Using Kie.ai model: ${kieModel}`);

      // Start video generation
      const generateResponse = await fetch("https://api.kie.ai/api/v1/runway/generate", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${KIE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt,
          model: kieModel,
          aspectRatio: "16:9",
          quality: "720p",
          duration: model === "sora-2" ? 10 : 5,
        })
      });

      if (!generateResponse.ok) {
        const errorText = await generateResponse.text();
        console.error("Kie.ai generation error:", errorText);
        
        // Refund credits on failure
        await supabase
          .from("profiles")
          .update({ credits: currentCredits })
          .eq("user_id", user.id);
        
        throw new Error(`Kie.ai error: ${generateResponse.status}`);
      }

      const generateData = await generateResponse.json();
      const taskId = generateData.data?.taskId;
      
      if (!taskId) {
        console.error("No taskId returned from Kie.ai:", generateData);
        // Refund credits
        await supabase
          .from("profiles")
          .update({ credits: currentCredits })
          .eq("user_id", user.id);
        throw new Error("Failed to start video generation");
      }

      console.log(`Kie.ai task started: ${taskId}`);

      // Poll for result (max 2 minutes)
      let videoUrl = null;
      let thumbnailUrl = null;
      const maxAttempts = 24;
      const pollInterval = 5000; // 5 seconds

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        const statusResponse = await fetch(`https://api.kie.ai/api/v1/runway/details?taskId=${taskId}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${KIE_API_KEY}`,
          }
        });

        if (!statusResponse.ok) {
          console.log(`Status check attempt ${attempt + 1} failed`);
          continue;
        }

        const statusData = await statusResponse.json();
        console.log(`Status check ${attempt + 1}:`, statusData.data?.status);

        if (statusData.data?.status === "SUCCESS") {
          videoUrl = statusData.data?.output?.[0];
          thumbnailUrl = statusData.data?.thumbnail || videoUrl;
          console.log("Video generation complete:", videoUrl);
          break;
        } else if (statusData.data?.status === "FAILED") {
          console.error("Video generation failed:", statusData);
          // Refund credits on failure
          await supabase
            .from("profiles")
            .update({ credits: currentCredits })
            .eq("user_id", user.id);
          throw new Error("Video generation failed");
        }
      }

      if (!videoUrl) {
        // Timeout - refund credits
        await supabase
          .from("profiles")
          .update({ credits: currentCredits })
          .eq("user_id", user.id);
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
        model: model || (type === "image" ? "nano-banana-pro" : "gemini-3-flash"),
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
        credits_remaining: currentCredits - creditCost
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
