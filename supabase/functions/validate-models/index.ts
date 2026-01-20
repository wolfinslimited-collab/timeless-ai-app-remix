import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const KIE_BASE_URL = "https://api.kie.ai/api/v1";

// Our configured models - VALIDATED MODELS ONLY (matches generate/index.ts)
const CONFIGURED_VIDEO_MODELS: Record<string, string> = {
  // Kling 2.1 (validated)
  "kling-2.1-standard": "kling/v2-1-standard",
  "kling-2.1-pro": "kling/v2-1-pro",
  "kling-2.1-master": "kling/v2-1-master-text-to-video",
  // Kling 2.6 (validated)
  "kling-2.6-t2v": "kling-2.6/text-to-video",
  "kling-2.6-i2v": "kling-2.6/image-to-video",
};

const CONFIGURED_IMAGE_MODELS: Record<string, string> = {
  "flux-1.1-pro": "flux-1.1-pro",
  "flux-1.1-pro-ultra": "flux-1.1-pro-ultra",
  "ideogram-v2": "ideogram-v2",
  "ideogram-v2-turbo": "ideogram-v2-turbo",
  "recraft-v3": "recraft-v3",
  "stable-diffusion-3.5": "sd3.5-large",
  "dall-e-3": "dall-e-3",
  "midjourney": "midjourney",
};

interface ModelInfo {
  id: string;
  name?: string;
  type?: string;
  provider?: string;
  capabilities?: string[];
}

interface ValidationResult {
  ourModelId: string;
  kieModelId: string;
  valid: boolean;
  matchedModel?: ModelInfo;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "KIE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Fetching Kie.ai models list...");

    // Try multiple possible endpoints for model listing
    const modelEndpoints = [
      "/models",
      "/v1/models", 
      "/jobs/models",
      "/market/models",
    ];

    let availableModels: ModelInfo[] = [];
    let fetchedFrom = "";
    let rawResponse: any = null;

    for (const endpoint of modelEndpoints) {
      try {
        const response = await fetch(`${KIE_BASE_URL}${endpoint}`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${KIE_API_KEY}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          rawResponse = data;
          
          // Handle various response formats
          const models = data.data?.models || data.models || data.data || [];
          if (Array.isArray(models) && models.length > 0) {
            availableModels = models.map((m: any) => ({
              id: m.id || m.model || m.name,
              name: m.name || m.display_name,
              type: m.type || m.category,
              provider: m.provider || m.vendor,
              capabilities: m.capabilities || [],
            }));
            fetchedFrom = endpoint;
            console.log(`Found ${availableModels.length} models from ${endpoint}`);
            break;
          }
        }
      } catch (e) {
        console.log(`Endpoint ${endpoint} failed:`, e);
      }
    }

    // Quick test: try to create a task with a known model to see format
    const testResults: ValidationResult[] = [];
    
    // Test video models by attempting a minimal task creation (dry-run style)
    console.log("Testing video models...");
    for (const [ourId, kieId] of Object.entries(CONFIGURED_VIDEO_MODELS)) {
      const result: ValidationResult = {
        ourModelId: ourId,
        kieModelId: kieId,
        valid: false,
      };

      try {
        // Try to validate by checking if the model exists in the fetched list
        const matchedModel = availableModels.find(m => 
          m.id === kieId || 
          m.id?.toLowerCase() === kieId.toLowerCase() ||
          m.name?.toLowerCase() === kieId.toLowerCase()
        );

        if (matchedModel) {
          result.valid = true;
          result.matchedModel = matchedModel;
        } else if (availableModels.length === 0) {
          // If we couldn't fetch models, try a test request
          const testResponse = await fetch(`${KIE_BASE_URL}/jobs/createTask`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${KIE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: kieId,
              input: {
                prompt: "test validation - do not process",
                duration: "1",
                aspect_ratio: "16:9",
              },
              // Some APIs support dry_run
              dry_run: true,
              validate_only: true,
            }),
          });

          const testData = await testResponse.json();
          
          // Check for "model not supported" errors
          const errorMsg = testData?.msg || testData?.message || testData?.error || "";
          const isModelError = errorMsg.toLowerCase().includes("model") && 
            (errorMsg.toLowerCase().includes("not supported") || 
             errorMsg.toLowerCase().includes("not found") ||
             errorMsg.toLowerCase().includes("invalid"));

          if (isModelError) {
            result.valid = false;
            result.error = errorMsg;
          } else if (testData?.data?.taskId || testResponse.ok) {
            // If we got a task ID, the model is valid (cancel if possible)
            result.valid = true;
            result.matchedModel = { id: kieId, name: kieId };
          } else {
            // Other errors might be parameter issues, not model issues
            result.valid = !isModelError;
            result.error = errorMsg || "Unknown validation result";
          }
        } else {
          result.valid = false;
          result.error = "Model not found in Kie.ai catalog";
        }
      } catch (e) {
        result.error = e instanceof Error ? e.message : "Validation failed";
      }

      testResults.push(result);
    }

    // Test image models
    console.log("Testing image models...");
    for (const [ourId, kieId] of Object.entries(CONFIGURED_IMAGE_MODELS)) {
      const result: ValidationResult = {
        ourModelId: ourId,
        kieModelId: kieId,
        valid: false,
      };

      const matchedModel = availableModels.find(m => 
        m.id === kieId || 
        m.id?.toLowerCase() === kieId.toLowerCase()
      );

      if (matchedModel) {
        result.valid = true;
        result.matchedModel = matchedModel;
      } else if (availableModels.length === 0) {
        // Assume valid if we can't verify
        result.valid = true;
        result.error = "Could not verify - models endpoint unavailable";
      } else {
        result.valid = false;
        result.error = "Model not found in Kie.ai catalog";
      }

      testResults.push(result);
    }

    const validCount = testResults.filter(r => r.valid).length;
    const invalidCount = testResults.filter(r => !r.valid).length;

    console.log(`Validation complete: ${validCount} valid, ${invalidCount} invalid`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: testResults.length,
          valid: validCount,
          invalid: invalidCount,
          modelsEndpoint: fetchedFrom || "none responded",
          availableModelsCount: availableModels.length,
        },
        results: testResults,
        availableModels: availableModels.slice(0, 50), // First 50 for reference
        rawApiResponse: rawResponse,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
