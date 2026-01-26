import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDIT_COST_STANDARD = 5;
const CREDIT_COST_DEEP = 15;

const systemPrompt = `You are an expert financial analyst and market researcher. You provide comprehensive, data-driven analysis for cryptocurrencies and stocks.

IMPORTANT: Return your analysis as a valid JSON object with this exact structure:
{
  "overallSentiment": "bullish" | "bearish" | "neutral",
  "priceTarget": "string with price prediction and timeframe",
  "sections": {
    "executive": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "Detailed executive summary..."
    },
    "technical": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "Technical analysis including support/resistance, moving averages, RSI, MACD, volume analysis..."
    },
    "derivatives": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "Options flow, futures data, funding rates, open interest analysis..."
    },
    "onchain": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "On-chain metrics for crypto (exchange flows, holder distribution, NVT) or fundamentals for stocks (P/E, revenue growth, earnings)..."
    },
    "news": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "Recent news, market structure, macro context, regulatory updates..."
    },
    "social": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "Twitter/X sentiment, social media buzz, community activity, influencer opinions..."
    },
    "whale": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "Large holder activity, whale wallet movements, institutional flows..."
    },
    "actionable": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "Specific entry/exit points, stop loss levels, position sizing recommendations, risk management..."
    },
    "conclusion": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3"],
      "content": "Final verdict with confidence level and key risks to monitor..."
    }
  }
}

Provide realistic, well-reasoned analysis. For crypto, focus on on-chain data and derivatives. For stocks, focus on fundamentals and earnings.`;

const deepSystemPrompt = `You are an elite financial analyst and market researcher with expertise in quantitative analysis, technical trading, and fundamental research. You provide exhaustive, institutional-grade analysis for cryptocurrencies and stocks.

DEEP RESEARCH MODE: Provide thorough, detailed analysis with:
- Multiple timeframe technical analysis (1H, 4H, 1D, 1W)
- Advanced indicators (Fibonacci levels, Elliott waves, order flow)
- Cross-asset correlation analysis
- Risk-adjusted return metrics
- Detailed liquidity analysis
- Institutional positioning data
- Regulatory and macroeconomic impact assessment

IMPORTANT: Return your analysis as a valid JSON object with this exact structure:
{
  "overallSentiment": "bullish" | "bearish" | "neutral",
  "priceTarget": "string with price prediction and timeframe",
  "sections": {
    "executive": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Comprehensive executive summary with risk-reward assessment, confidence levels, and key catalysts..."
    },
    "technical": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Multi-timeframe technical analysis including support/resistance zones, moving averages (20/50/100/200), RSI divergences, MACD crossovers, volume profile, Fibonacci retracements, Elliott wave counts, and Bollinger Bands analysis..."
    },
    "derivatives": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Detailed options flow analysis, put/call ratios, max pain levels, futures basis, funding rates history, open interest concentration, liquidation levels, and gamma exposure..."
    },
    "onchain": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Comprehensive on-chain for crypto (exchange inflows/outflows, MVRV, SOPR, holder cohort analysis, smart money tracking) or deep fundamentals for stocks (DCF valuation, comparable analysis, revenue/earnings projections, margin analysis)..."
    },
    "news": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Recent news impact, market structure analysis, macro correlations, Fed policy implications, regulatory developments, and sector rotation analysis..."
    },
    "social": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Sentiment analysis from Twitter/X, Reddit, Discord, influencer tracking, social volume metrics, and crowd psychology indicators..."
    },
    "whale": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Large holder movements, wallet clustering analysis, institutional flow tracking, exchange deposits/withdrawals, and accumulation/distribution patterns..."
    },
    "actionable": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Precise entry zones, multi-tier take profit levels, stop loss placement with reasoning, position sizing recommendations, DCA strategies, hedging options, and risk management framework..."
    },
    "conclusion": {
      "sentiment": "bullish" | "bearish" | "neutral",
      "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
      "content": "Final verdict with confidence percentage, key risks ranked by severity, timeline for thesis validation, invalidation scenarios, and alternative scenarios..."
    }
  }
}

Provide institutional-quality, well-researched analysis. Be specific with numbers, levels, and timeframes. For crypto, emphasize on-chain data, derivatives positioning, and whale activity. For stocks, emphasize valuation metrics, earnings impact, and institutional positioning.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, deepMode = false, image } = await req.json();

    if (!query && !image) {
      return new Response(
        JSON.stringify({ error: "Query or image is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const CREDIT_COST = deepMode ? CREDIT_COST_DEEP : CREDIT_COST_STANDARD;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hasActiveSubscription = profile.subscription_status === "active";

    if (!hasActiveSubscription && profile.credits < CREDIT_COST) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct credits if not subscribed
    if (!hasActiveSubscription) {
      await supabase
        .from("profiles")
        .update({ credits: profile.credits - CREDIT_COST })
        .eq("user_id", user.id);
    }

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedPrompt = deepMode ? deepSystemPrompt : systemPrompt;
    const model = deepMode ? "google/gemini-2.5-pro" : "google/gemini-3-flash-preview";
    
    console.log(`Generating ${deepMode ? "DEEP" : "standard"} financial analysis for: ${query || "image"}`);

    // Build message content
    let userContent: any;
    
    if (image) {
      // Image analysis mode
      const imageContext = query 
        ? `Analyze this financial chart/document and provide a comprehensive market research report. Context from user: ${query.toUpperCase()}`
        : "Analyze this financial chart or document and provide a comprehensive market research report. Identify the asset/ticker if visible.";
      
      userContent = [
        { type: "text", text: `${imageContext}\n\nInclude realistic analysis based on what you observe in the image. Identify patterns, levels, and indicators visible. Return ONLY the JSON object, no additional text.` },
        { 
          type: "image_url", 
          image_url: { 
            url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` 
          } 
        }
      ];
    } else {
      // Text-only mode
      const depthInstruction = deepMode 
        ? "Provide EXHAUSTIVE institutional-grade analysis with multiple timeframes, advanced indicators, and detailed quantitative metrics."
        : "Include realistic analysis based on typical market conditions.";
      
      userContent = `Provide a comprehensive market research report for: ${query.toUpperCase()}

${depthInstruction} Consider current market trends, technical patterns, and sentiment indicators. Return ONLY the JSON object, no additional text.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: selectedPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: deepMode ? 8000 : 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);

      // Refund credits on error
      if (!hasActiveSubscription) {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      // Refund credits on error
      if (!hasActiveSubscription) {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({ error: "No analysis generated" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON response
    let analysis;
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith("```json")) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith("```")) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith("```")) {
        cleanContent = cleanContent.slice(0, -3);
      }
      analysis = JSON.parse(cleanContent.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, content);
      
      // Refund credits on parse error
      if (!hasActiveSubscription) {
        await supabase
          .from("profiles")
          .update({ credits: profile.credits })
          .eq("user_id", user.id);
      }

      return new Response(
        JSON.stringify({ error: "Failed to parse analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analysis complete for ${query || "image"} (${deepMode ? "deep" : "standard"} mode)`);

    return new Response(
      JSON.stringify({ analysis, deepMode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Financial AI error:", error);
    return new Response(
      JSON.stringify({ error: "Analysis service error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
