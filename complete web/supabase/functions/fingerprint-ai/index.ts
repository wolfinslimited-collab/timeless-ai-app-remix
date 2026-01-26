import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Credit costs
const TEXT_SEARCH_CREDIT_COST = 2;
const IMAGE_SEARCH_CREDIT_COST = 3;

interface SocialProfile {
  platform: string;
  name: string;
  username?: string;
  url: string;
  description?: string;
  confidence?: string;
}

interface SearchResult {
  summary: string;
  profiles: SocialProfile[];
  sources: string[];
  images?: string[];
}

interface PlatformSearch {
  platform: string;
  query: string;
  domainFilter?: string[];
}

// Platform-specific search configurations
const PLATFORM_SEARCHES: PlatformSearch[] = [
  { platform: "LinkedIn", query: "LinkedIn profile", domainFilter: ["linkedin.com"] },
  { platform: "Instagram", query: "Instagram profile @", domainFilter: ["instagram.com"] },
  { platform: "Twitter", query: "Twitter X profile @", domainFilter: ["twitter.com", "x.com"] },
  { platform: "Facebook", query: "Facebook profile", domainFilter: ["facebook.com"] },
  { platform: "TikTok", query: "TikTok profile @", domainFilter: ["tiktok.com"] },
  { platform: "YouTube", query: "YouTube channel", domainFilter: ["youtube.com"] },
];

// Analyze image using Lovable AI to extract person description
async function analyzeImageWithAI(imageUrl: string): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing photos of people and extracting identifying characteristics. 
Your task is to describe the person in the image in detail to help find their social media profiles.
Focus on:
- Estimated age range
- Gender
- Ethnicity/appearance
- Distinctive features (hair color/style, facial features, body type)
- Clothing style or any visible brands/logos
- Setting/context (professional, casual, event, etc.)
- Any visible text, logos, or identifiable locations
- Any other identifying information

Be descriptive but factual. Do not make assumptions about personality or character.
If there are multiple people, describe the most prominent person.
If no person is clearly visible, describe what you see.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this image and describe the person(s) in detail to help identify them on social media:"
            },
            {
              type: "image_url",
              image_url: { url: imageUrl }
            }
          ]
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Lovable AI error:", response.status, errorText);
    throw new Error("Failed to analyze image");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Perform a platform-specific search
async function searchPlatform(
  apiKey: string,
  personQuery: string,
  platform: PlatformSearch,
  additionalInfo?: string
): Promise<{ profiles: SocialProfile[]; sources: string[] }> {
  const searchQuery = `${personQuery} ${platform.query}${additionalInfo ? ` ${additionalInfo}` : ""}`;
  
  console.log(`[${platform.platform}] Searching: ${searchQuery}`);

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          {
            role: "system",
            content: `You are a social media profile finder. Your ONLY task is to find ${platform.platform} profiles for the specified person.

IMPORTANT: Only return profiles you are confident belong to the person being searched.

Return your response as JSON:
{
  "profiles": [
    {
      "platform": "${platform.platform}",
      "name": "Display Name on profile",
      "username": "@handle (if available)",
      "url": "Full profile URL",
      "description": "Brief bio or description from profile",
      "confidence": "high/medium/low"
    }
  ],
  "found": true/false
}

If you cannot find any ${platform.platform} profiles, return: {"profiles": [], "found": false}`
          },
          {
            role: "user",
            content: searchQuery
          }
        ],
        search_domain_filter: platform.domainFilter,
      }),
    });

    if (!response.ok) {
      console.error(`[${platform.platform}] API error:`, response.status);
      return { profiles: [], sources: [] };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const citations = data.citations || [];

    // Try to parse JSON from response
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const profiles = (parsed.profiles || []).map((p: any) => ({
          ...p,
          platform: platform.platform,
        }));
        console.log(`[${platform.platform}] Found ${profiles.length} profiles`);
        return { profiles, sources: citations };
      }
    } catch (e) {
      console.error(`[${platform.platform}] JSON parse error:`, e);
    }

    return { profiles: [], sources: citations };
  } catch (error) {
    console.error(`[${platform.platform}] Search error:`, error);
    return { profiles: [], sources: [] };
  }
}

// Perform general search for overview
async function performGeneralSearch(
  apiKey: string,
  searchQuery: string
): Promise<{ summary: string; profiles: SocialProfile[]; sources: string[] }> {
  console.log("Performing general search...");

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: `You are a professional people search assistant. Find publicly available information about individuals.

IMPORTANT GUIDELINES:
- Only report publicly available information
- Be accurate and factual
- If you can't find information, say so clearly

Format your response as JSON:
{
  "summary": "A comprehensive paragraph about the person",
  "profiles": [
    {
      "platform": "Platform Name",
      "name": "Display Name",
      "username": "@handle",
      "url": "https://...",
      "description": "Brief description"
    }
  ],
  "key_facts": ["Fact 1", "Fact 2"],
  "occupation": "Their profession if known",
  "location": "Their location if publicly known"
}`
        },
        {
          role: "user",
          content: searchQuery
        }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("General search error:", response.status, errorText);
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  const citations = data.citations || [];

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      let summary = parsed.summary || content;
      
      if (parsed.key_facts) {
        summary += "\n\n**Key Facts:**\n" + parsed.key_facts.map((f: string) => `• ${f}`).join("\n");
      }
      if (parsed.occupation) {
        summary = `**${parsed.occupation}**${parsed.location ? ` • ${parsed.location}` : ""}\n\n${summary}`;
      }
      
      return {
        summary,
        profiles: parsed.profiles || [],
        sources: citations,
      };
    }
  } catch (e) {
    console.error("General search JSON parse error:", e);
  }

  return { summary: content, profiles: [], sources: citations };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid user" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { query, additionalInfo, imageUrl, searchMode } = await req.json();
    const isImageSearch = searchMode === "image" && imageUrl;
    const creditCost = isImageSearch ? IMAGE_SEARCH_CREDIT_COST : TEXT_SEARCH_CREDIT_COST;

    // Validate input
    if (!isImageSearch && (!query || typeof query !== "string" || query.trim().length < 2)) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid name to search" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isImageSearch && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Please provide an image to search" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user credits and subscription
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits, subscription_status")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      throw new Error("Failed to fetch user profile");
    }

    const hasActiveSubscription = profile?.subscription_status === "active";

    // Check credits if not subscribed
    if (!hasActiveSubscription) {
      if ((profile?.credits ?? 0) < creditCost) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please purchase more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    // Build search query
    let personQuery: string;
    
    if (isImageSearch) {
      console.log("Analyzing image:", imageUrl);
      const imageDescription = await analyzeImageWithAI(imageUrl);
      console.log("Image analysis result:", imageDescription);
      personQuery = `person matching this description: ${imageDescription}`;
    } else {
      personQuery = query.trim();
    }

    console.log(`Starting multi-platform search for: ${personQuery}`);

    // Run platform-specific searches in parallel
    const platformSearchPromises = PLATFORM_SEARCHES.map(platform =>
      searchPlatform(PERPLEXITY_API_KEY, personQuery, platform, additionalInfo)
    );

    // Also run a general search for overview
    const generalSearchQuery = isImageSearch
      ? `Find publicly available information about a ${personQuery}${additionalInfo ? `. Additional context: ${additionalInfo}` : ""}`
      : `Find all publicly available information about "${personQuery}"${additionalInfo ? `. Additional context: ${additionalInfo}` : ""}. Include professional background, public appearances, and any other publicly available information.`;

    const generalSearchPromise = performGeneralSearch(PERPLEXITY_API_KEY, generalSearchQuery);

    // Wait for all searches to complete
    const [platformResults, generalResult] = await Promise.all([
      Promise.all(platformSearchPromises),
      generalSearchPromise,
    ]);

    // Combine and deduplicate profiles
    const allProfiles: SocialProfile[] = [...generalResult.profiles];
    const seenUrls = new Set(allProfiles.map(p => p.url?.toLowerCase()).filter(Boolean));

    for (const result of platformResults) {
      for (const profile of result.profiles) {
        const urlLower = profile.url?.toLowerCase();
        if (urlLower && !seenUrls.has(urlLower)) {
          seenUrls.add(urlLower);
          allProfiles.push(profile);
        }
      }
    }

    // Combine all sources
    const allSources = new Set<string>([
      ...generalResult.sources,
      ...platformResults.flatMap(r => r.sources),
    ]);

    // Sort profiles by confidence (high first) and platform
    const sortedProfiles = allProfiles.sort((a, b) => {
      const confidenceOrder = { high: 0, medium: 1, low: 2, undefined: 3 };
      const aConf = confidenceOrder[a.confidence as keyof typeof confidenceOrder] ?? 3;
      const bConf = confidenceOrder[b.confidence as keyof typeof confidenceOrder] ?? 3;
      if (aConf !== bConf) return aConf - bConf;
      return (a.platform || "").localeCompare(b.platform || "");
    });

    console.log(`Search complete. Found ${sortedProfiles.length} profiles from ${allSources.size} sources`);

    // Deduct credits after successful search
    if (!hasActiveSubscription) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: (profile?.credits ?? 0) - creditCost })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Credit deduction error:", updateError);
      } else {
        console.log(`Deducted ${creditCost} credits from user ${user.id}`);
      }
    }

    const result: SearchResult = {
      summary: generalResult.summary,
      profiles: sortedProfiles,
      sources: Array.from(allSources),
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Fingerprint AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Search failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
