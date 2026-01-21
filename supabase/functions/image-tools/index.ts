import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool credit costs
const TOOL_CREDITS: Record<string, number> = {
  upscale: 3,
  inpainting: 5,
  relight: 4,
  angle: 4,
  "skin-enhancer": 3,
  "background-remove": 2,
  "object-erase": 4,
  colorize: 3,
  "style-transfer": 4,
};

// Fal.ai endpoints for each tool
const FAL_BASE_URL = "https://queue.fal.run";
const LOVABLE_AI_BASE_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const FAL_TOOL_ENDPOINTS: Record<string, string> = {
  upscale: "fal-ai/clarity-upscaler",
  "background-remove": "fal-ai/birefnet",
  inpainting: "fal-ai/flux-pro/v1/fill", 
  "object-erase": "fal-ai/flux-pro/v1/fill",
};

// Submit to Fal.ai queue for sync endpoints
const submitToFalSync = async (endpoint: string, input: Record<string, unknown>, apiKey: string): Promise<unknown> => {
  const url = `https://fal.run/${endpoint}`;
  console.log(`Fal.ai sync call to ${url}:`, JSON.stringify(input));
  
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
    console.error("Fal.ai error:", errorText);
    throw new Error(`Fal.ai error: ${response.status} - ${errorText}`);
  }
  
  return await response.json();
};

// Call Lovable AI for image editing
const callLovableAI = async (imageUrl: string, instruction: string, apiKey: string): Promise<string> => {
  console.log(`Lovable AI image edit: ${instruction}`);
  
  const response = await fetch(LOVABLE_AI_BASE_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-image-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruction },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      modalities: ["image", "text"]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable AI error:", errorText);
    throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageResult) {
    throw new Error("No image returned from Lovable AI");
  }
  
  return imageResult;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      tool,
      imageUrl,
      maskUrl,
      prompt,
      intensity,
      style,
      scale,
    } = await req.json();

    console.log(`Image tool request: ${tool}`, { imageUrl, prompt, intensity, style, scale });

    // Validate required fields
    if (!tool || !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tool and imageUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check credits
    const creditCost = TOOL_CREDITS[tool] ?? 3;
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits, subscription_status')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasSubscription = profile.subscription_status === 'active';
    if (!hasSubscription && profile.credits < creditCost) {
      return new Response(
        JSON.stringify({ error: `Insufficient credits. Need ${creditCost}, have ${profile.credits}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get API keys
    const FAL_API_KEY = Deno.env.get("FAL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let outputUrl: string;

    // Process based on tool type
    switch (tool) {
      case "upscale": {
        if (!FAL_API_KEY) throw new Error("FAL_API_KEY not configured");
        const result = await submitToFalSync(FAL_TOOL_ENDPOINTS.upscale, {
          image_url: imageUrl,
          upscale_factor: scale || 2,
          prompt: prompt || "high quality, detailed, sharp",
        }, FAL_API_KEY) as { image: { url: string } };
        outputUrl = result.image?.url;
        break;
      }

      case "background-remove": {
        if (!FAL_API_KEY) throw new Error("FAL_API_KEY not configured");
        const result = await submitToFalSync(FAL_TOOL_ENDPOINTS["background-remove"], {
          image_url: imageUrl,
        }, FAL_API_KEY) as { image: { url: string } };
        outputUrl = result.image?.url;
        break;
      }

      case "inpainting": {
        if (!FAL_API_KEY) throw new Error("FAL_API_KEY not configured");
        if (!maskUrl) throw new Error("Mask image required for inpainting");
        const result = await submitToFalSync(FAL_TOOL_ENDPOINTS.inpainting, {
          image_url: imageUrl,
          mask_url: maskUrl,
          prompt: prompt || "seamless blend, natural, high quality",
        }, FAL_API_KEY) as { images: Array<{ url: string }> };
        outputUrl = result.images?.[0]?.url;
        break;
      }

      case "object-erase": {
        if (!FAL_API_KEY) throw new Error("FAL_API_KEY not configured");
        if (!maskUrl) throw new Error("Mask image required for object erase");
        const result = await submitToFalSync(FAL_TOOL_ENDPOINTS["object-erase"], {
          image_url: imageUrl,
          mask_url: maskUrl,
          prompt: "clean background, remove object, seamless",
        }, FAL_API_KEY) as { images: Array<{ url: string }> };
        outputUrl = result.images?.[0]?.url;
        break;
      }

      case "relight": {
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
        const lightingPrompt = `Relight this image with ${prompt || "dramatic studio lighting"}. Adjust the lighting to be ${intensity > 70 ? "very dramatic" : intensity > 40 ? "moderate" : "subtle"}. Keep all other elements the same.`;
        outputUrl = await callLovableAI(imageUrl, lightingPrompt, LOVABLE_API_KEY);
        break;
      }

      case "angle": {
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
        const anglePrompt = `Change the perspective/angle of this image: ${prompt || "view from a different angle"}. Maintain the subject and style.`;
        outputUrl = await callLovableAI(imageUrl, anglePrompt, LOVABLE_API_KEY);
        break;
      }

      case "skin-enhancer": {
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
        const skinPrompt = `Enhance the skin in this portrait photo. Apply professional retouching: smooth skin texture, reduce blemishes, even skin tone, but keep it natural looking. Intensity: ${intensity > 70 ? "strong retouching" : intensity > 40 ? "moderate retouching" : "subtle enhancement"}.`;
        outputUrl = await callLovableAI(imageUrl, skinPrompt, LOVABLE_API_KEY);
        break;
      }

      case "colorize": {
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
        const colorPrompt = `Colorize this black and white image with realistic, natural colors. ${prompt || "Use historically accurate and natural colors."} Make it look like a modern color photograph.`;
        outputUrl = await callLovableAI(imageUrl, colorPrompt, LOVABLE_API_KEY);
        break;
      }

      case "style-transfer": {
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
        const stylePrompt = `Transform this image to ${style || prompt || "oil painting"} style. Keep the composition and subject the same but apply the artistic style completely.`;
        outputUrl = await callLovableAI(imageUrl, stylePrompt, LOVABLE_API_KEY);
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown tool: ${tool}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!outputUrl) {
      throw new Error("No output generated");
    }

    // Deduct credits
    if (!hasSubscription) {
      await supabase
        .from('profiles')
        .update({ credits: profile.credits - creditCost })
        .eq('user_id', user.id);
    }

    // Log generation
    await supabase.from('generations').insert({
      user_id: user.id,
      type: 'image',
      model: tool,
      prompt: prompt || tool,
      status: 'completed',
      output_url: outputUrl,
      credits_used: creditCost,
    });

    console.log(`Tool ${tool} completed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        outputUrl,
        creditsUsed: creditCost,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Image tool error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
