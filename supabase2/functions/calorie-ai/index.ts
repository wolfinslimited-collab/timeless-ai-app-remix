import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CALORIE-AI] ${step}`, details ? JSON.stringify(details) : "");
};

// Lovable AI endpoint for vision analysis
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface NutritionInfo {
  food_name: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  confidence: number;
}

interface AnalysisResult {
  foods: NutritionInfo[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  meal_description: string;
  health_score: number;
  suggestions: string[];
}

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prep_time: string;
  ingredients: string[];
  meal_type: string;
  image_url?: string;
}

interface MealPlanResult {
  suggestions: MealSuggestion[];
  reasoning: string;
}

async function analyzeWithVision(imageBase64: string, prompt?: string): Promise<AnalysisResult> {
  const systemPrompt = `You are a nutritionist AI that analyzes food images to provide accurate calorie and nutrition information.

IMPORTANT: You MUST respond with ONLY valid JSON, no markdown, no explanation text.

Analyze the food in the image and return a JSON object with this exact structure:
{
  "foods": [
    {
      "food_name": "string - name of the food item",
      "serving_size": "string - estimated serving size (e.g., '1 cup', '100g', '1 medium')",
      "calories": number,
      "protein": number (grams),
      "carbohydrates": number (grams),
      "fat": number (grams),
      "fiber": number (grams),
      "sugar": number (grams),
      "sodium": number (mg),
      "confidence": number (0-1, how confident you are in this analysis)
    }
  ],
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fat": number,
  "meal_description": "string - brief description of the meal",
  "health_score": number (1-10, overall healthiness),
  "suggestions": ["array of health/nutrition suggestions"]
}

Be accurate with portion sizes and calorie estimates. If you cannot identify a food, still provide your best estimate with a lower confidence score.`;

  const userMessage = prompt 
    ? `Analyze this food image. Additional context: ${prompt}`
    : "Analyze this food image and provide detailed nutrition information.";

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("AI service not configured");
  }

  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            { type: "text", text: userMessage },
            { 
              type: "image_url", 
              image_url: { 
                url: imageBase64.startsWith("data:") 
                  ? imageBase64 
                  : `data:image/jpeg;base64,${imageBase64}` 
              } 
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Vision API error", { status: response.status, error: errorText });
    throw new Error(`Vision API failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in vision response");
  }

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    logStep("JSON parse error", { content: jsonStr.substring(0, 500) });
    throw new Error("Failed to parse nutrition analysis");
  }
}

async function analyzeWithText(foodDescription: string): Promise<AnalysisResult> {
  const systemPrompt = `You are a nutritionist AI that provides accurate calorie and nutrition information for foods.

IMPORTANT: You MUST respond with ONLY valid JSON, no markdown, no explanation text.

Based on the food description, return a JSON object with this exact structure:
{
  "foods": [
    {
      "food_name": "string",
      "serving_size": "string",
      "calories": number,
      "protein": number (grams),
      "carbohydrates": number (grams),
      "fat": number (grams),
      "fiber": number (grams),
      "sugar": number (grams),
      "sodium": number (mg),
      "confidence": number (0-1)
    }
  ],
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fat": number,
  "meal_description": "string",
  "health_score": number (1-10),
  "suggestions": ["array of suggestions"]
}

Be accurate with standard portion sizes. Provide reasonable estimates for common foods.`;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("AI service not configured");
  }

  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Analyze nutrition for: ${foodDescription}` }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Text API error", { status: response.status, error: errorText });
    throw new Error(`Text API failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in response");
  }

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    logStep("JSON parse error", { content: jsonStr.substring(0, 500) });
    throw new Error("Failed to parse nutrition analysis");
  }
}

async function generateMealImage(mealName: string, mealDescription: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    logStep("No API key for image generation");
    return null;
  }

  try {
    const imagePrompt = `A beautiful, appetizing food photography of ${mealName}. ${mealDescription}. Professional food styling, natural lighting, top-down or 45-degree angle, clean white or wooden background, garnished beautifully, restaurant quality presentation.`;

    logStep("Generating meal image", { mealName });

    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          { role: "user", content: imagePrompt }
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      logStep("Image generation failed", { status: response.status });
      return null;
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (imageUrl) {
      logStep("Image generated successfully", { mealName });
      return imageUrl;
    }
    
    return null;
  } catch (error: any) {
    logStep("Image generation error", { error: error.message });
    return null;
  }
}

async function suggestMeals(
  remainingMacros: { calories: number; protein: number; carbs: number; fat: number },
  mealTypePreference?: string,
  dietaryPreferences?: string[]
): Promise<MealPlanResult> {
  const systemPrompt = `You are a nutritionist AI that suggests healthy meals based on remaining daily macro targets.

IMPORTANT: You MUST respond with ONLY valid JSON, no markdown, no explanation text.

Suggest 3-5 meal ideas that fit within the remaining macro budget. Return a JSON object with this exact structure:
{
  "suggestions": [
    {
      "name": "string - meal name",
      "description": "string - brief appetizing description",
      "calories": number,
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams),
      "prep_time": "string - estimated prep time (e.g., '15 mins', '30 mins')",
      "ingredients": ["array of main ingredients"],
      "meal_type": "string - breakfast/lunch/dinner/snack"
    }
  ],
  "reasoning": "string - brief explanation of why these meals were suggested"
}

Guidelines:
- Suggest meals that fit within the remaining macro budget
- Prioritize balanced, nutritious options
- Include a mix of quick and more elaborate options
- Consider the meal type preference if provided
- Be realistic with portion sizes`;

  const dietaryNote = dietaryPreferences?.length 
    ? `Dietary preferences to consider: ${dietaryPreferences.join(", ")}.` 
    : "";
  
  const mealTypeNote = mealTypePreference 
    ? `The user is looking for ${mealTypePreference} ideas.` 
    : "";

  const userMessage = `I have the following remaining macros for today:
- Calories: ${remainingMacros.calories} kcal
- Protein: ${remainingMacros.protein}g
- Carbs: ${remainingMacros.carbs}g
- Fat: ${remainingMacros.fat}g

${mealTypeNote}
${dietaryNote}

Please suggest meals that fit within this budget and help me reach my nutrition goals.`;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("AI service not configured");
  }

  const response = await fetch(LOVABLE_AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logStep("Meal suggestion API error", { status: response.status, error: errorText });
    throw new Error(`Meal suggestion failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) {
    throw new Error("No content in meal suggestion response");
  }

  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  let result: MealPlanResult;
  try {
    result = JSON.parse(jsonStr);
  } catch (e) {
    logStep("Meal suggestion JSON parse error", { content: jsonStr.substring(0, 500) });
    throw new Error("Failed to parse meal suggestions");
  }

  // Generate images for each meal suggestion in parallel
  logStep("Generating images for meal suggestions", { count: result.suggestions.length });
  
  const suggestionsWithImages = await Promise.all(
    result.suggestions.map(async (meal) => {
      const imageUrl = await generateMealImage(meal.name, meal.description);
      return {
        ...meal,
        image_url: imageUrl || undefined,
      };
    })
  );

  return {
    suggestions: suggestionsWithImages,
    reasoning: result.reasoning,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token if provided (optional for mobile)
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (!authError && userData.user) {
        userId = userData.user.id;
        logStep("Authenticated user", { userId });
      }
    }

    const body = await req.json();
    const { action, image, food_description, prompt, remaining_macros, meal_type_preference, dietary_preferences } = body;

    logStep("Request received", { action, hasImage: !!image, hasDescription: !!food_description, userId });

    let result: AnalysisResult | MealPlanResult;

    switch (action) {
      case "analyze_image": {
        if (!image) {
          throw new Error("Image is required for image analysis");
        }
        result = await analyzeWithVision(image, prompt);
        logStep("Image analysis complete", { totalCalories: result.total_calories });
        break;
      }

      case "analyze_text": {
        if (!food_description) {
          throw new Error("Food description is required for text analysis");
        }
        result = await analyzeWithText(food_description);
        logStep("Text analysis complete", { totalCalories: result.total_calories });
        break;
      }

      case "quick_lookup": {
        // Simple lookup for common foods - uses text analysis
        if (!food_description) {
          throw new Error("Food name is required for quick lookup");
        }
        result = await analyzeWithText(food_description);
        logStep("Quick lookup complete", { food: food_description });
        break;
      }

      case "suggest_meals": {
        if (!remaining_macros) {
          throw new Error("Remaining macros are required for meal suggestions");
        }
        result = await suggestMeals(remaining_macros, meal_type_preference, dietary_preferences);
        logStep("Meal suggestions complete", { count: result.suggestions.length });
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Optionally deduct credits if user is authenticated
    if (userId) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const creditCost = action === "analyze_image" ? 2 : 1;

      // Check credits
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("credits, plan, subscription_status")
        .eq("user_id", userId)
        .single();

      if (profileError) {
        logStep("Profile fetch error", { error: profileError.message });
      } else {
        const hasSubscription = profile.subscription_status === "active";
        
        if (!hasSubscription && profile.credits < creditCost) {
          return new Response(
            JSON.stringify({ error: "Insufficient credits", required: creditCost, available: profile.credits }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 402 }
          );
        }

        // Deduct credits only if no active subscription
        if (!hasSubscription) {
          await supabaseAdmin
            .from("profiles")
            .update({ credits: profile.credits - creditCost })
            .eq("user_id", userId);

          await supabaseAdmin
            .from("credit_transactions")
            .insert({
              user_id: userId,
              amount: -creditCost,
              type: "usage",
              description: `Calorie AI - ${action}`,
            });

          logStep("Credits deducted", { cost: creditCost, remaining: profile.credits - creditCost });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        credits_used: userId ? (action === "analyze_image" ? 2 : 1) : 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logStep("Error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
