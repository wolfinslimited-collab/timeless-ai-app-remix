import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, videoDescription, suggestionPrompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (action === "analyze") {
      // Analyze video content based on description/metadata
      if (!videoDescription) {
        return new Response(JSON.stringify({ error: "Video description is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a professional video content analyzer. Given metadata about a video (filename, duration, dimensions, current frame description), provide a brief, vivid summary of the video content in 1-2 sentences. Be specific and creative. Also suggest 3 short creative prompts for extending or adding to the video. Return ONLY valid JSON with these fields:
- summary: string (1-2 sentence description of the video content)
- suggestions: string[] (exactly 3 short creative prompts for video additions/extensions)`,
            },
            { role: "user", content: videoDescription },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      let analysisData;
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
        analysisData = JSON.parse(jsonMatch[1].trim());
      } catch {
        analysisData = {
          summary: content.slice(0, 200),
          suggestions: [
            "Add a dramatic slow-motion sequence",
            "Insert a transition with particle effects",
            "Extend with a cinematic aerial shot",
          ],
        };
      }

      return new Response(JSON.stringify({ success: true, analysis: analysisData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "generate-prompt") {
      // Generate a detailed video generation prompt from user suggestion
      if (!suggestionPrompt) {
        return new Response(JSON.stringify({ error: "Suggestion prompt is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a video prompt engineer. Given a user's brief video idea, expand it into a detailed, optimized prompt for AI video generation. The prompt should be vivid, specific about motion, lighting, camera angles, and style. Keep it under 100 words. Return ONLY the prompt text, no JSON or formatting.`,
            },
            { role: "user", content: suggestionPrompt },
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const enhancedPrompt = data.choices?.[0]?.message?.content?.trim() || suggestionPrompt;

      return new Response(JSON.stringify({ success: true, enhancedPrompt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'analyze' or 'generate-prompt'." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-video-analyzer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
