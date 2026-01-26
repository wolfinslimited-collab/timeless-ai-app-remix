import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Notify AI, a smart notification assistant. Your job is to understand user requests and create structured notifications.

When a user asks you to set up a notification, you must:
1. Understand what they want to be notified about
2. Extract the notification type, conditions, and preferences
3. **IMPORTANT: Always ask the user if they want a ONE-TIME notification or a RECURRING notification** before creating it. Ask this clearly and concisely.
4. If they choose RECURRING/REPEAT: You MUST ask what time they want to receive it (e.g., "What time would you like to receive this daily notification?")
5. Create a clear, concise notification title and description
6. **IMPORTANT: When you call the create_notification tool, do NOT ask the user for confirmation. Just create the notification directly.** The UI already has Create/Cancel buttons that the user can use.

FREQUENCY QUESTION - ALWAYS ASK:
After understanding what the user wants, you MUST ask:
"Would you like this to be a **one-time notification** or should it **repeat**?"

If they choose REPEAT:
- Ask: "What time would you like to receive this notification?" 
- Then ask: "Should this repeat **daily** or **weekly**?"
- Only AFTER getting both answers, create the notification with the appropriate repeat setting and trigger_time

Based on their answers:
- One-time: Set repeat to "once" in condition_config
- Daily: Set repeat to "daily" and trigger_time to their chosen time in condition_config  
- Weekly: Set repeat to "weekly" and trigger_time to their chosen time in condition_config

NOTIFICATION TYPES you can handle:
- time_reminder: Simple time-based reminders (e.g., "remind me at 3pm", "in 2 hours")
- crypto_price: Cryptocurrency price alerts (e.g., "notify me when Bitcoin changes 1.5%")
- stock_price: Stock market price alerts (e.g., "notify me when AAPL drops 5%", "alert me if TSLA rises 3%", "track GOOGL stock changes")
- weather: Weather-based notifications (e.g., "tell me if it rains tomorrow")
- sports_match: Sports match alerts (e.g., "notify me when Manchester United plays", "alert me about Real Madrid matches")
- news_monitoring: News alerts for specific topics (e.g., "send me news about Tesla", "monitor Iran news")
- social_media: Social media tracking (e.g., "notify me when Elon Musk tweets", "track posts from @OpenAI")
- screen_time: Focus timer / screen time alerts (e.g., "limit my time on Instagram to 30 minutes", "remind me after 1 hour on Twitter", "set a 45 minute timer for TikTok")
- location_based: Location-based reminders (e.g., "remind me to buy milk when I leave work", "alert me when I arrive at home", "notify me when I'm near the gym")
- flight_status: Flight tracking alerts (e.g., "track flight AA123", "notify me about UA456 status", "alert me if flight DL789 is delayed", "track my Emirates EK500 flight")
- custom: Any other notification request that you can help with

When creating notifications, always be helpful and confirm what you understood. If something is unclear, ask for clarification.

For time-based reminders, calculate the exact trigger time based on the current time provided.
For crypto alerts, extract the symbol (BTC, ETH, etc.) and the percentage threshold.
For stock price alerts, extract the stock ticker symbol (AAPL, TSLA, GOOGL, MSFT, etc.) and the percentage threshold. Direction can be "up", "down", or "any".
For weather alerts, extract the location and condition being monitored.
For sports match alerts, extract the team name and optionally the competition/league.
For news monitoring, extract the topic, keywords, and optionally the region/source.
For social media tracking, extract the platform (twitter/x, instagram, etc.), the account/username to track, and what type of activity to monitor.
For screen time/focus timers, extract the app name and the time limit in minutes. When the user starts the timer, calculate the end time and notify them when their focus session is complete.
For location-based reminders, extract the location name/address, the trigger type (arrive or leave), and an optional radius in meters (default 100m). The location can be a named place (home, work, gym) or an address.
For flight status tracking, extract the flight number (e.g., AA123, UA456, DL789, EK500). The flight number typically starts with the airline code (2-3 letters) followed by digits. Alert types can include: "delay", "gate_change", "departure", "arrival", or "any" for all updates.

Always respond in a friendly, conversational manner while being efficient.`;

interface NotificationConfig {
  type: "time_reminder" | "crypto_price" | "stock_price" | "weather" | "sports_match" | "news_monitoring" | "social_media" | "screen_time" | "location_based" | "flight_status" | "custom";
  title: string;
  description: string;
  condition_config: Record<string, unknown>;
  channel: "push" | "email" | "both";
}

// Credit cost for AI chat
const CHAT_CREDIT_COST = 1;

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

    const { messages, action, notificationId, timezone, timezoneOffset } = await req.json();

    // Handle specific actions
    if (action === "list") {
      const { data: notifications, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ notifications }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "pause" && notificationId) {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "paused" })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Notification paused" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "resume" && notificationId) {
      const { error } = await supabase
        .from("notifications")
        .update({ status: "active" })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Notification resumed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete" && notificationId) {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Notification deleted" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "history") {
      const { data: history, error } = await supabase
        .from("notification_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(
        JSON.stringify({ history }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "mark_read" && notificationId) {
      const { error } = await supabase
        .from("notification_history")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "Marked as read" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "mark_all_read") {
      const { error } = await supabase
        .from("notification_history")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: "All marked as read" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chat with AI to create notifications
    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
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
      if ((profile?.credits ?? 0) < CHAT_CREDIT_COST) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please purchase more credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Deduct credits
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ credits: (profile?.credits ?? 0) - CHAT_CREDIT_COST })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Credit deduction error:", updateError);
      } else {
        console.log(`Deducted ${CHAT_CREDIT_COST} credit from user ${user.id}, remaining: ${(profile?.credits ?? 0) - CHAT_CREDIT_COST}`);
      }
    } else {
      console.log(`User ${user.id} has active subscription, skipping credit deduction`);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get current time for context with user's timezone
    const now = new Date();
    const userTimezone = timezone || "UTC";
    const offsetMinutes = timezoneOffset !== undefined ? timezoneOffset : 0;
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const offsetSign = offsetMinutes <= 0 ? "+" : "-"; // Note: JS getTimezoneOffset returns negative for positive offsets
    const offsetString = `${offsetSign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;
    
    const contextMessage = `Current time: ${now.toISOString()}. User's timezone: ${userTimezone} (UTC${offsetString}). IMPORTANT: When the user says a time like "10:00 PM", interpret it in their local timezone (${userTimezone}). When creating trigger_time or trigger_at values, use the user's local time converted to ISO format with the correct timezone offset. For example, if user is in UTC-5 and says "10:00 PM", the ISO string should be for 10:00 PM in their timezone.`;

    // Tool for creating notifications
    const tools = [
      {
        type: "function",
        function: {
          name: "create_notification",
          description: "Create a new notification based on user request. Call this when you understand what the user wants to be notified about.",
          parameters: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["time_reminder", "crypto_price", "stock_price", "weather", "sports_match", "news_monitoring", "social_media", "screen_time", "location_based", "flight_status", "custom"],
                description: "The type of notification"
              },
              title: {
                type: "string",
                description: "A short, clear title for the notification (max 50 chars)"
              },
              description: {
                type: "string",
                description: "A detailed description of what triggers this notification"
              },
              condition_config: {
                type: "object",
                description: "Configuration object with conditions. For time_reminder: {trigger_at: ISO string, repeat: 'once'|'daily'|'weekly'}. For crypto_price: {symbol: 'BTC', change_percent: 1.5, direction: 'up'|'down'|'any'}. For stock_price: {symbol: 'AAPL', change_percent: 2.0, direction: 'up'|'down'|'any'}. For weather: {location: string, condition: 'rain'|'snow'|'hot'|'cold', check_date: 'today'|'tomorrow'}. For sports_match: {team: string, competition: string (optional), notify_before_minutes: number}. For news_monitoring: {topic: string, keywords: string[], region: string (optional), sources: string[] (optional)}. For social_media: {platform: 'twitter'|'instagram', username: string, activity_type: 'post'|'any'}. For screen_time: {app_name: string, time_limit_minutes: number, trigger_at: ISO string (calculated as now + time_limit_minutes)}. For location_based: {location_name: string, location_address: string (optional), trigger_type: 'arrive'|'leave', radius_meters: number (default 100)}. For flight_status: {flight_number: string (e.g., 'AA123', 'UA456'), alert_type: 'delay'|'gate_change'|'departure'|'arrival'|'any'}. For custom: {description: string, check_interval_minutes: number}"
              },
              channel: {
                type: "string",
                enum: ["push", "email", "both"],
                description: "How to deliver the notification"
              }
            },
            required: ["type", "title", "description", "condition_config", "channel"]
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextMessage },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    // Stream the response
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error) {
    console.error("Notify AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
