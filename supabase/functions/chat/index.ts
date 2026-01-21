import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Model mapping to Lovable AI gateway models
const MODEL_MAPPING: Record<string, string> = {
  // Grok models - map to similar capability models
  "grok-3": "openai/gpt-5",
  "grok-3-mini": "openai/gpt-5-mini",
  // ChatGPT models
  "chatgpt-5.2": "openai/gpt-5.2",
  "chatgpt-5": "openai/gpt-5",
  "chatgpt-5-mini": "openai/gpt-5-mini",
  // Gemini models
  "gemini-2.5-pro": "google/gemini-2.5-pro",
  "gemini-3-pro": "google/gemini-3-pro-preview",
  "gemini-3-flash": "google/gemini-3-flash-preview",
  // DeepSeek - map to similar reasoning model
  "deepseek-r1": "openai/gpt-5.2",
  "deepseek-v3": "openai/gpt-5",
  // Llama models - map to fast models
  "llama-3.3": "google/gemini-2.5-flash",
  "llama-3.3-large": "google/gemini-2.5-pro",
};

// System prompts per model personality
const SYSTEM_PROMPTS: Record<string, string> = {
  "grok-3": "You are Grok, an AI assistant created by xAI. You are direct, witty, and have a unique perspective. You aim to be maximally helpful while being intellectually curious.",
  "grok-3-mini": "You are Grok Mini, a fast and efficient AI assistant. Be concise, helpful, and direct in your responses.",
  "chatgpt-5.2": "You are ChatGPT, an AI assistant by OpenAI. You are helpful, harmless, and honest. Provide thoughtful, well-structured responses.",
  "chatgpt-5": "You are ChatGPT, an AI assistant by OpenAI. You are helpful, harmless, and honest. Provide thoughtful, well-structured responses.",
  "chatgpt-5-mini": "You are ChatGPT Mini, a fast and efficient AI assistant. Be concise and helpful.",
  "gemini-2.5-pro": "You are Gemini, Google's most capable AI. You excel at reasoning, analysis, and creative tasks. Provide insightful and comprehensive responses.",
  "gemini-3-pro": "You are Gemini 3 Pro, Google's next-generation AI. You have advanced reasoning capabilities and can handle complex tasks with ease.",
  "gemini-3-flash": "You are Gemini 3 Flash, a fast and capable AI. Provide quick, accurate responses while maintaining quality.",
  "deepseek-r1": "You are DeepSeek R1, an AI specialized in deep reasoning and analysis. Think step by step and provide thorough explanations.",
  "deepseek-v3": "You are DeepSeek V3, a powerful AI assistant. Provide helpful, accurate, and well-reasoned responses.",
  "llama-3.3": "You are Llama 3.3, an open and helpful AI assistant. Be friendly, accurate, and provide clear responses.",
  "llama-3.3-large": "You are Llama 3.3 Large, a powerful open AI model. Provide comprehensive and helpful responses to all queries.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, model } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map the requested model to Lovable AI gateway model
    const gatewayModel = MODEL_MAPPING[model] || "google/gemini-3-flash-preview";
    const systemPrompt = SYSTEM_PROMPTS[model] || "You are a helpful AI assistant. Be concise and helpful.";

    console.log(`Chat request - User model: ${model}, Gateway model: ${gatewayModel}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      console.error("AI gateway error:", status, text);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Stream the response back
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
