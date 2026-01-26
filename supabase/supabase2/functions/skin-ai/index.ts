import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SkinConcern {
  name: string;
  severity: "mild" | "moderate" | "severe";
  description: string;
}

interface SkinAnalysisResult {
  skin_type: string;
  overall_score: number;
  hydration_level: number;
  oiliness_level: number;
  concerns: SkinConcern[];
  recommendations: string[];
  analysis_summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, image_base64, skin_profile } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "analyze") {
      if (!image_base64) {
        return new Response(JSON.stringify({ error: "Image is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check credits
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("credits, subscription_status")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        return new Response(JSON.stringify({ error: "Failed to fetch profile" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hasActiveSubscription = profile.subscription_status === "active";
      const creditCost = 2;

      if (!hasActiveSubscription && profile.credits < creditCost) {
        return new Response(JSON.stringify({ error: "Insufficient credits" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Call Lovable AI for skin analysis
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(JSON.stringify({ error: "AI service not configured" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build personalized context from skin profile
      let personalizedContext = "";
      if (skin_profile) {
        const profileDetails: string[] = [];
        
        if (skin_profile.age) {
          profileDetails.push(`Age: ${skin_profile.age} years old`);
        }
        if (skin_profile.gender) {
          profileDetails.push(`Gender: ${skin_profile.gender}`);
        }
        if (skin_profile.skin_type) {
          profileDetails.push(`Self-reported skin type: ${skin_profile.skin_type}`);
        }
        if (skin_profile.primary_concerns?.length > 0) {
          profileDetails.push(`Main concerns the user wants to address: ${skin_profile.primary_concerns.join(", ")}`);
        }
        if (skin_profile.skin_goals?.length > 0) {
          profileDetails.push(`Skincare goals: ${skin_profile.skin_goals.join(", ")}`);
        }
        if (skin_profile.current_routine) {
          profileDetails.push(`Current skincare routine level: ${skin_profile.current_routine}`);
        }
        if (skin_profile.sun_exposure) {
          profileDetails.push(`Daily sun exposure: ${skin_profile.sun_exposure}`);
        }
        if (skin_profile.water_intake) {
          profileDetails.push(`Water intake: ${skin_profile.water_intake}`);
        }
        if (skin_profile.sleep_quality) {
          profileDetails.push(`Sleep quality: ${skin_profile.sleep_quality}`);
        }
        if (skin_profile.stress_level) {
          profileDetails.push(`Stress level: ${skin_profile.stress_level}`);
        }
        if (skin_profile.diet_type) {
          profileDetails.push(`Diet type: ${skin_profile.diet_type}`);
        }

        if (profileDetails.length > 0) {
          personalizedContext = `

USER PROFILE CONTEXT:
${profileDetails.join("\n")}

Use this profile information to:
1. Provide age-appropriate skincare recommendations
2. Consider their lifestyle factors (sun exposure, stress, sleep) when analyzing skin condition
3. Prioritize recommendations that align with their stated concerns and goals
4. Adjust complexity of routine suggestions based on their current routine level
5. Account for their hydration habits and diet when assessing skin health`;
        }
      }

      const systemPrompt = `You are an expert dermatologist AI assistant specializing in skin analysis. Analyze the provided facial/skin image and provide a comprehensive skin health assessment.${personalizedContext}

You must respond with a valid JSON object in the following format:
{
  "skin_type": "oily" | "dry" | "combination" | "normal" | "sensitive",
  "overall_score": 1-100 (overall skin health score),
  "hydration_level": 1-100 (skin hydration percentage),
  "oiliness_level": 1-100 (skin oiliness percentage),
  "concerns": [
    {
      "name": "concern name (e.g., Acne, Wrinkles, Dark Spots, Redness, Pores, Dullness, Uneven Texture, Dark Circles, etc.)",
      "severity": "mild" | "moderate" | "severe",
      "description": "Brief description of this concern"
    }
  ],
  "recommendations": [
    "Specific skincare recommendation 1",
    "Specific skincare recommendation 2",
    "Specific skincare recommendation 3",
    "Specific skincare recommendation 4"
  ],
  "analysis_summary": "A 2-3 sentence summary of the overall skin condition and key findings"
}

Focus on:
- Identifying skin type accurately
- Detecting visible skin concerns (acne, wrinkles, dark spots, redness, large pores, dullness, uneven texture, dark circles, etc.)
- Assessing overall skin health
- Providing actionable skincare recommendations tailored to the user's profile

Be professional, accurate, and helpful. Only analyze visible skin conditions.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze this skin/facial image and provide a comprehensive skin health assessment.",
                },
                {
                  type: "image_url",
                  image_url: { url: image_base64 },
                },
              ],
            },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error("AI API error:", aiResponse.status, errorText);
        
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "AI service is busy. Please try again in a moment." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI service quota exceeded." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ error: "Failed to analyze skin" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiResponse.json();
      let content = aiData.choices?.[0]?.message?.content || "";

      // Parse JSON from response
      let result: SkinAnalysisResult;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
        result = JSON.parse(jsonStr);
      } catch (e) {
        console.error("Failed to parse AI response:", content);
        return new Response(JSON.stringify({ error: "Failed to parse analysis results" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct credits if not subscribed
      if (!hasActiveSubscription) {
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const adminClient = createClient(supabaseUrl, serviceRoleKey);
        
        await adminClient
          .from("profiles")
          .update({ credits: profile.credits - creditCost })
          .eq("user_id", user.id);

        await adminClient.from("credit_transactions").insert({
          user_id: user.id,
          type: "usage",
          amount: -creditCost,
          description: "Skin AI analysis",
        });
      }

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Skin AI error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
