import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool credit costs (balanced ~30-50% margin)
const TOOL_CREDITS: Record<string, number> = {
  upscale: 4,
  inpainting: 8,
  relight: 6,
  angle: 6,
  shots: 2, // Per angle (9 angles = ~18 total, but frontend may batch)
  "skin-enhancer": 5,
  "background-remove": 3,
  "object-erase": 6,
  colorize: 5,
  "style-transfer": 6,
  "story-mode": 8, // Per scene
};

// Fal.ai endpoints for each tool
const FAL_BASE_URL = "https://queue.fal.run";
const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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

// Call AI gateway for image editing
const callImageAI = async (imageUrl: string, instruction: string, apiKey: string): Promise<string> => {
  console.log(`Image edit request: ${instruction.substring(0, 50)}...`);
  
  const response = await fetch(AI_GATEWAY_URL, {
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
    console.error("AI service error:", errorText);
    if (errorText.includes("Unsupported image format")) {
      throw new Error("Unsupported image format. Please use PNG, JPEG, WebP, or GIF.");
    }
    throw new Error("Image processing failed. Please try again.");
  }

  const data = await response.json();
  const imageResult = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  
  if (!imageResult) {
    throw new Error("No image returned from AI service");
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
      aspectRatio,
      scenePrompts, // For story-mode: array of scene descriptions
      referenceImages, // For story-mode: array of reference image URLs
    } = await req.json();

    console.log(`Image tool request: ${tool}`, { imageUrl, prompt, intensity, style, scale, aspectRatio, scenePrompts });

    // Validate required fields
    if (!tool) {
      return new Response(
        JSON.stringify({ error: "Missing required field: tool" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Story-mode doesn't require imageUrl
    if (tool !== "story-mode" && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required field: imageUrl" }),
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
    const AI_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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
        if (!AI_API_KEY) throw new Error("Service not configured");
        const lightingPrompt = `Relight this image with ${prompt || "dramatic studio lighting"}. Adjust the lighting to be ${intensity > 70 ? "very dramatic" : intensity > 40 ? "moderate" : "subtle"}. Keep all other elements the same.`;
        outputUrl = await callImageAI(imageUrl, lightingPrompt, AI_API_KEY);
        break;
      }

      case "angle": {
        if (!AI_API_KEY) throw new Error("Service not configured");
        const anglePrompt = `Change the perspective/angle of this image: ${prompt || "view from a different angle"}. Maintain the subject and style.`;
        outputUrl = await callImageAI(imageUrl, anglePrompt, AI_API_KEY);
        break;
      }

      case "skin-enhancer": {
        if (!AI_API_KEY) throw new Error("Service not configured");
        const skinPrompt = `Enhance the skin in this portrait photo. Apply professional retouching: smooth skin texture, reduce blemishes, even skin tone, but keep it natural looking. Intensity: ${intensity > 70 ? "strong retouching" : intensity > 40 ? "moderate retouching" : "subtle enhancement"}.`;
        outputUrl = await callImageAI(imageUrl, skinPrompt, AI_API_KEY);
        break;
      }

      case "colorize": {
        if (!AI_API_KEY) throw new Error("Service not configured");
        const colorPrompt = `Colorize this black and white image with realistic, natural colors. ${prompt || "Use historically accurate and natural colors."} Make it look like a modern color photograph.`;
        outputUrl = await callImageAI(imageUrl, colorPrompt, AI_API_KEY);
        break;
      }

      case "style-transfer": {
        if (!AI_API_KEY) throw new Error("Service not configured");
        const stylePrompt = `Transform this image to ${style || prompt || "oil painting"} style. Keep the composition and subject the same but apply the artistic style completely.`;
        outputUrl = await callImageAI(imageUrl, stylePrompt, AI_API_KEY);
        break;
      }

      case "shots": {
        if (!AI_API_KEY) throw new Error("Service not configured");
        const aspectText = aspectRatio ? ` Output in ${aspectRatio} aspect ratio.` : "";
        const shotsPrompt = `CREATE A UNIQUE PHOTOSHOOT VARIATION OF THIS PERSON.

${prompt}

REQUIREMENTS:
1. PRESERVE IDENTITY: Same person (face, hair, beard, glasses, skin tone, clothing)
2. CHANGE THE SHOT TYPE: Follow the specific shot description above exactly
3. ADJUST ZOOM/FRAMING as specified (close-up, medium shot, extreme close-up, etc.)
4. CHANGE POSE if specified (arms crossed, looking up, etc.)
5. CHANGE EXPRESSION if specified (smiling, serious, contemplative, etc.)
6. This must look like a DIFFERENT PHOTO from a professional photoshoot
7. Keep the same white/neutral studio background and lighting style

${aspectText}`;
        outputUrl = await callImageAI(imageUrl, shotsPrompt, AI_API_KEY);
        break;
      }

      case "story-mode": {
        if (!AI_API_KEY) throw new Error("Service not configured");
        
        // Generate multiple scenes based on prompts
        const scenes: string[] = [];
        const prompts = scenePrompts || [];
        
        if (prompts.length === 0 && !prompt) {
          throw new Error("At least one scene description or prompt is required");
        }
        
        // If only a main prompt is provided, generate variations
        const scenesToGenerate = prompts.length > 0 ? prompts : [prompt];
        const refContext = referenceImages?.length > 0 
          ? `Use these reference images as visual style guide. Maintain consistent characters, setting, and art style across all scenes.` 
          : "";
        
        for (let i = 0; i < scenesToGenerate.length; i++) {
          const scenePrompt = scenesToGenerate[i];
          const storyPrompt = `CREATE A STORYBOARD SCENE IMAGE.

${refContext}

SCENE ${i + 1}: ${scenePrompt}

REQUIREMENTS:
1. Create a single, high-quality illustration for this scene
2. ${aspectRatio === "3:4" ? "Portrait orientation (3:4)" : aspectRatio === "16:9" ? "Cinematic widescreen (16:9)" : aspectRatio === "9:16" ? "Vertical/mobile format (9:16)" : "Square format (1:1)"}
3. Professional storyboard quality with clear composition
4. If reference images provided, maintain visual consistency
5. Focus on the narrative moment described
6. Dramatic lighting and cinematic framing

Make this look like a frame from a professional film or animation storyboard.`;

          let sceneUrl: string;
          
          // If reference image exists, use image-to-image, otherwise text-to-image
          if (referenceImages?.[0]) {
            sceneUrl = await callImageAI(referenceImages[0], storyPrompt, AI_API_KEY);
          } else {
            // Pure text-to-image generation
            const response = await fetch(AI_GATEWAY_URL, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${AI_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-image-preview",
                messages: [
                  { role: "user", content: storyPrompt }
                ],
                modalities: ["image", "text"]
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error(`Scene ${i + 1} generation error:`, errorText);
              throw new Error(`Failed to generate scene ${i + 1}`);
            }

            const data = await response.json();
            sceneUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (!sceneUrl) {
              throw new Error(`No image returned for scene ${i + 1}`);
            }
          }
          
          scenes.push(sceneUrl);
        }
        
        // Return multiple scenes
        return new Response(
          JSON.stringify({ 
            success: true, 
            scenes,
            creditsUsed: creditCost * scenes.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
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
    let userMessage = "Processing failed. Please try again.";
    if (error instanceof Error) {
      if (error.message.includes("Unsupported image format") || error.message.includes("format")) {
        userMessage = "Unsupported image format. Please use PNG, JPEG, WebP, or GIF.";
      } else if (error.message.includes("not configured")) {
        userMessage = "Service temporarily unavailable.";
      } else if (error.message.includes("Insufficient credits")) {
        userMessage = error.message;
      }
    }
    return new Response(
      JSON.stringify({ error: userMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
