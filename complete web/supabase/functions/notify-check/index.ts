import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[notify-check] ${step}:`, details ? JSON.stringify(details) : "");
};

// Fetch crypto price from CoinGecko
async function getCryptoPrice(symbol: string): Promise<{ price: number; change24h: number } | null> {
  try {
    const symbolMap: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      SOL: "solana",
      DOGE: "dogecoin",
      XRP: "ripple",
      ADA: "cardano",
      DOT: "polkadot",
      MATIC: "matic-network",
      AVAX: "avalanche-2",
      LINK: "chainlink",
    };

    const coinId = symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
    
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`
    );
    
    if (!response.ok) {
      logStep("CoinGecko API error", { status: response.status });
      return null;
    }

    const data = await response.json();
    const coinData = data[coinId];
    
    if (!coinData) return null;

    return {
      price: coinData.usd,
      change24h: coinData.usd_24h_change || 0,
    };
  } catch (error) {
    logStep("Crypto price fetch error", { error: String(error) });
    return null;
  }
}

// Fetch stock price from Yahoo Finance (free, no API key required)
async function getStockPrice(symbol: string): Promise<{ price: number; change: number; changePercent: number } | null> {
  try {
    // Using Yahoo Finance chart API
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}?interval=1d&range=2d`
    );
    
    if (!response.ok) {
      logStep("Yahoo Finance API error", { status: response.status, symbol });
      return null;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];
    
    if (!result || !result.meta) {
      logStep("No stock data found", { symbol });
      return null;
    }

    const currentPrice = result.meta.regularMarketPrice;
    const previousClose = result.meta.previousClose || result.meta.chartPreviousClose;
    
    if (!currentPrice || !previousClose) {
      return null;
    }

    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;

    return {
      price: currentPrice,
      change,
      changePercent,
    };
  } catch (error) {
    logStep("Stock price fetch error", { error: String(error), symbol });
    return null;
  }
}

// Fetch weather from Open-Meteo (free, no API key required)
async function getWeather(location: string): Promise<{ condition: string; temp: number; description: string } | null> {
  try {
    // First, geocode the location
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    
    if (!geoResponse.ok) return null;
    
    const geoData = await geoResponse.json();
    if (!geoData.results || geoData.results.length === 0) return null;

    const { latitude, longitude } = geoData.results[0];

    // Get weather
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
    );
    
    if (!weatherResponse.ok) return null;

    const weatherData = await weatherResponse.json();
    
    // Weather codes: 0-3 clear, 45-48 fog, 51-67 rain, 71-77 snow, 80-99 showers/thunder
    const weatherCode = weatherData.current?.weather_code || 0;
    
    let condition = "clear";
    let description = "Clear skies";
    
    if (weatherCode >= 51 && weatherCode <= 67) {
      condition = "rain";
      description = "Rainy conditions";
    } else if (weatherCode >= 71 && weatherCode <= 77) {
      condition = "snow";
      description = "Snowy conditions";
    } else if (weatherCode >= 80 && weatherCode <= 99) {
      condition = "rain";
      description = "Showers or thunderstorms";
    } else if (weatherCode >= 45 && weatherCode <= 48) {
      condition = "fog";
      description = "Foggy conditions";
    }

    return {
      condition,
      temp: weatherData.current?.temperature_2m || 0,
      description,
    };
  } catch (error) {
    logStep("Weather fetch error", { error: String(error) });
    return null;
  }
}

// Fetch sports matches from free API
async function getSportsMatches(team: string): Promise<{ hasMatch: boolean; matchInfo: string; kickoffTime: Date | null } | null> {
  try {
    // Using a free football API (api-football.com alternative - thesportsdb.com)
    const response = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(team)}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (!data.teams || data.teams.length === 0) {
      return { hasMatch: false, matchInfo: "Team not found", kickoffTime: null };
    }

    const teamId = data.teams[0].idTeam;
    const teamName = data.teams[0].strTeam;

    // Get next 5 events for this team
    const eventsResponse = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${teamId}`
    );
    
    if (!eventsResponse.ok) return null;
    
    const eventsData = await eventsResponse.json();
    
    if (!eventsData.events || eventsData.events.length === 0) {
      return { hasMatch: false, matchInfo: "No upcoming matches", kickoffTime: null };
    }

    const nextMatch = eventsData.events[0];
    const matchDate = new Date(`${nextMatch.dateEvent}T${nextMatch.strTime || "00:00"}:00Z`);
    
    return {
      hasMatch: true,
      matchInfo: `${nextMatch.strHomeTeam} vs ${nextMatch.strAwayTeam} - ${nextMatch.strLeague} on ${matchDate.toLocaleDateString()}`,
      kickoffTime: matchDate,
    };
  } catch (error) {
    logStep("Sports match fetch error", { error: String(error) });
    return null;
  }
}

// Fetch news from free NewsAPI alternative (using GNews)
async function getNews(topic: string, keywords: string[]): Promise<{ hasNews: boolean; headlines: string[] } | null> {
  try {
    // Using free RSS-based news aggregator
    const searchQuery = encodeURIComponent([topic, ...keywords].join(" "));
    const response = await fetch(
      `https://news.google.com/rss/search?q=${searchQuery}&hl=en-US&gl=US&ceid=US:en`
    );
    
    if (!response.ok) return null;
    
    const text = await response.text();
    
    // Parse RSS XML
    const titleMatches = text.match(/<title>(?!Google News)<!\[CDATA\[(.*?)\]\]><\/title>/g);
    if (!titleMatches || titleMatches.length === 0) {
      // Try without CDATA
      const simpleTitles = text.match(/<title>(?!Google News)(.*?)<\/title>/g);
      if (!simpleTitles || simpleTitles.length === 0) {
        return { hasNews: false, headlines: [] };
      }
      const headlines = simpleTitles
        .slice(0, 5)
        .map(t => t.replace(/<\/?title>/g, "").replace(/<!\[CDATA\[|\]\]>/g, ""));
      return { hasNews: headlines.length > 0, headlines };
    }
    
    const headlines = titleMatches
      .slice(0, 5)
      .map(t => t.replace(/<title><!\[CDATA\[|\]\]><\/title>/g, ""));
    
    return { hasNews: headlines.length > 0, headlines };
  } catch (error) {
    logStep("News fetch error", { error: String(error) });
    return null;
  }
}

// Check social media activity (Twitter/X via Nitter or public API)
async function checkSocialMedia(platform: string, username: string): Promise<{ hasActivity: boolean; latestPost: string } | null> {
  try {
    if (platform === "twitter" || platform === "x") {
      // Using Nitter instances (public Twitter frontend)
      const nitterInstances = [
        "nitter.net",
        "nitter.poast.org",
        "nitter.privacydev.net",
      ];
      
      for (const instance of nitterInstances) {
        try {
          const response = await fetch(
            `https://${instance}/${username.replace("@", "")}/rss`,
            { headers: { "User-Agent": "Mozilla/5.0" } }
          );
          
          if (!response.ok) continue;
          
          const text = await response.text();
          const titleMatch = text.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
          
          if (titleMatch && titleMatch[1]) {
            return { hasActivity: true, latestPost: titleMatch[1] };
          }
        } catch {
          continue;
        }
      }
      
      return { hasActivity: false, latestPost: "Could not fetch latest activity" };
    }
    
    return { hasActivity: false, latestPost: "Platform not supported yet" };
  } catch (error) {
    logStep("Social media check error", { error: String(error) });
    return null;
  }
}

// Check flight status using AviationStack API or fallback to mock data
async function getFlightStatus(flightNumber: string): Promise<{
  status: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  gate: string | null;
  terminal: string | null;
  delay_minutes: number;
  has_update: boolean;
  update_type: "delay" | "gate_change" | "departure" | "arrival" | "on_time" | null;
} | null> {
  try {
    // Extract airline code and flight number
    const match = flightNumber.toUpperCase().match(/^([A-Z]{2,3})(\d+)$/);
    if (!match) {
      logStep("Invalid flight number format", { flightNumber });
      return null;
    }

    const [, airlineCode, flightNum] = match;
    
    // Try AviationStack API if available (free tier: 100 requests/month)
    const aviationStackKey = Deno.env.get("AVIATIONSTACK_API_KEY");
    
    if (aviationStackKey) {
      const response = await fetch(
        `http://api.aviationstack.com/v1/flights?access_key=${aviationStackKey}&flight_iata=${flightNumber.toUpperCase()}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data.length > 0) {
          const flight = data.data[0];
          const delayMinutes = flight.departure?.delay || 0;
          
          let updateType: "delay" | "gate_change" | "departure" | "arrival" | "on_time" | null = null;
          let hasUpdate = false;
          
          if (delayMinutes > 15) {
            updateType = "delay";
            hasUpdate = true;
          } else if (flight.flight_status === "active" || flight.flight_status === "landed") {
            updateType = flight.flight_status === "landed" ? "arrival" : "departure";
            hasUpdate = true;
          }
          
          return {
            status: flight.flight_status || "scheduled",
            departure_airport: flight.departure?.airport || "Unknown",
            arrival_airport: flight.arrival?.airport || "Unknown",
            departure_time: flight.departure?.scheduled || "TBD",
            arrival_time: flight.arrival?.scheduled || "TBD",
            gate: flight.departure?.gate || null,
            terminal: flight.departure?.terminal || null,
            delay_minutes: delayMinutes,
            has_update: hasUpdate,
            update_type: updateType,
          };
        }
      }
    }

    // Fallback: Use FlightAware's public-ish endpoint (may be rate-limited)
    try {
      const faResponse = await fetch(
        `https://flightaware.com/ajax/ignoreall/omnisearch/flight.rvt?searchterm=${flightNumber.toUpperCase()}`,
        { headers: { "User-Agent": "Mozilla/5.0" } }
      );
      
      if (faResponse.ok) {
        const text = await faResponse.text();
        // Parse basic info if available
        if (text.includes("delayed")) {
          return {
            status: "delayed",
            departure_airport: "Unknown",
            arrival_airport: "Unknown",
            departure_time: "TBD",
            arrival_time: "TBD",
            gate: null,
            terminal: null,
            delay_minutes: 30, // Estimated
            has_update: true,
            update_type: "delay",
          };
        }
      }
    } catch {
      // Fallback failed, continue
    }

    // Last resort: Return scheduled status (user can still track, just no real-time updates without API key)
    logStep("No flight API available, returning scheduled status", { flightNumber });
    return {
      status: "scheduled",
      departure_airport: "Unknown",
      arrival_airport: "Unknown", 
      departure_time: "Check airline website",
      arrival_time: "Check airline website",
      gate: null,
      terminal: null,
      delay_minutes: 0,
      has_update: false,
      update_type: null,
    };
  } catch (error) {
    logStep("Flight status fetch error", { error: String(error), flightNumber });
    return null;
  }
}

// Send push notification
async function sendPushNotification(
  supabase: any,
  userId: string,
  title: string,
  body: string
): Promise<boolean> {
  try {
    const FIREBASE_SERVER_KEY = Deno.env.get("FIREBASE_SERVER_KEY");
    if (!FIREBASE_SERVER_KEY) {
      logStep("No Firebase server key configured");
      return false;
    }

    // Get user's active devices
    const { data: devices } = await supabase
      .from("user_devices")
      .select("fcm_token")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!devices || devices.length === 0) {
      logStep("No active devices for user", { userId });
      return false;
    }

    for (const device of devices as { fcm_token: string }[]) {
      const response = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${FIREBASE_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: device.fcm_token,
          notification: { title, body },
          data: { type: "notify_ai", title, body },
        }),
      });

      if (!response.ok) {
        logStep("FCM send failed", { status: response.status });
      }
    }

    return true;
  } catch (error) {
    logStep("Push notification error", { error: String(error) });
    return false;
  }
}

// Timeless branded email template with inline logo
const createEmailTemplate = (content: string, notificationType?: string) => {
  // Get type-specific accent color
  const getAccentColor = (type?: string) => {
    switch (type) {
      case 'crypto_price': return '#f59e0b'; // amber
      case 'stock_price': return '#10b981'; // emerald
      case 'weather': return '#06b6d4'; // cyan
      case 'sports_match': return '#ef4444'; // red
      case 'news_monitoring': return '#8b5cf6'; // purple
      case 'flight_status': return '#3b82f6'; // blue
      default: return '#8b5cf6'; // purple default
    }
  };
  
  const accentColor = getAccentColor(notificationType);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Timeless</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .button { padding: 14px 32px !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #09090b;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <!-- Main Container -->
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%; background-color: #18181b; border-radius: 16px; overflow: hidden;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 32px 32px 24px; background-color: #1f1f23; border-bottom: 1px solid #27272a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="vertical-align: middle;">
                    <!-- Inline SVG Logo as base64 -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); border-radius: 12px; text-align: center; vertical-align: middle;">
                          <img src="https://timeless-new.lovable.app/favicon.png" alt="T" width="32" height="32" style="display: block; margin: 8px auto; border: 0;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="padding-left: 14px; vertical-align: middle;">
                    <span style="font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Timeless</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          ${content}
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f0f12; border-top: 1px solid #27272a;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 16px;">
                <tr>
                  <td style="padding: 0 12px;">
                    <a href="https://timeless-new.lovable.app" style="color: #71717a; text-decoration: none; font-size: 13px; font-weight: 500;">Website</a>
                  </td>
                  <td style="color: #3f3f46; font-size: 13px;">•</td>
                  <td style="padding: 0 12px;">
                    <a href="https://timeless-new.lovable.app/help" style="color: #71717a; text-decoration: none; font-size: 13px; font-weight: 500;">Help</a>
                  </td>
                  <td style="color: #3f3f46; font-size: 13px;">•</td>
                  <td style="padding: 0 12px;">
                    <a href="https://timeless-new.lovable.app/support" style="color: #71717a; text-decoration: none; font-size: 13px; font-weight: 500;">Support</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0; color: #52525b; font-size: 12px; text-align: center; line-height: 1.5;">
                Timeless — stay aware, stay ahead<br/>
                <span style="color: #3f3f46;">© ${new Date().getFullYear()} Timeless. All rights reserved.</span>
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Unsubscribe -->
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; width: 100%;">
          <tr>
            <td style="padding: 20px 32px; text-align: center;">
              <a href="https://timeless-new.lovable.app/ai-apps/notify-ai" style="color: #52525b; text-decoration: underline; font-size: 11px;">Manage notification preferences</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

// Send email notification
async function sendEmailNotification(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  notificationType?: string
): Promise<boolean> {
  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      logStep("No Resend API key configured");
      return false;
    }

    // Get user email
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (!userData?.user?.email) {
      logStep("No email for user", { userId });
      return false;
    }

    // Get type-specific symbol and label - monochrome design
    const getTypeInfo = (type?: string) => {
      switch (type) {
        case 'crypto_price': return { symbol: '◈', label: 'Crypto Alert' };
        case 'stock_price': return { symbol: '▲', label: 'Stock Alert' };
        case 'weather': return { symbol: '◐', label: 'Weather Update' };
        case 'sports_match': return { symbol: '◉', label: 'Sports Alert' };
        case 'news_monitoring': return { symbol: '◆', label: 'News Alert' };
        case 'flight_status': return { symbol: '▶', label: 'Flight Update' };
        case 'time_reminder': return { symbol: '✦', label: 'Reminder' };
        default: return { symbol: '●', label: 'Notification' };
      }
    };

    const typeInfo = getTypeInfo(notificationType);

    const emailContent = `
      <tr>
        <td style="padding: 40px 32px;">
          <!-- Alert Badge - Monochrome -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 28px;">
            <tr>
              <td style="background-color: rgba(161, 161, 170, 0.1); padding: 10px 20px; border-radius: 24px; border: 1px solid rgba(161, 161, 170, 0.2);">
                <span style="color: #a1a1aa; font-size: 14px; font-weight: 600;">${typeInfo.symbol} ${typeInfo.label}</span>
              </td>
            </tr>
          </table>
          
          <!-- Title -->
          <h1 style="margin: 0 0 16px; color: #ffffff; font-size: 26px; font-weight: 700; text-align: center; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">${title}</h1>
          
          <!-- Description -->
          <p style="margin: 0 0 32px; color: #a1a1aa; font-size: 16px; line-height: 1.7; text-align: center;">${body}</p>
          
          <!-- CTA Button -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
            <tr>
              <td style="border-radius: 12px; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);">
                <a href="https://timeless-new.lovable.app/ai-apps/notify-ai" target="_blank" style="display: inline-block; padding: 16px 36px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">View Details</a>
              </td>
            </tr>
          </table>
          
          <!-- Timestamp -->
          <p style="margin: 32px 0 0; color: #52525b; font-size: 12px; text-align: center; border-top: 1px solid #27272a; padding-top: 24px;">
            Sent by Notify AI • ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </td>
      </tr>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Timeless <notification@n.timelessapp.ai>",
        to: [userData.user.email],
        subject: `${typeInfo.symbol} ${title}`,
        html: createEmailTemplate(emailContent, notificationType),
      }),
    });

    if (response.ok) {
      logStep("Email sent successfully", { to: userData.user.email });
    } else {
      const errorText = await response.text();
      logStep("Email send failed", { status: response.status, error: errorText });
    }

    return response.ok;
  } catch (error) {
    logStep("Email notification error", { error: String(error) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting notification check");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();

    // Get all active notifications
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("status", "active");

    if (error) throw error;

    logStep("Found active notifications", { count: notifications?.length || 0 });

    const results: { checked: number; triggered: number; errors: number } = {
      checked: 0,
      triggered: 0,
      errors: 0,
    };

    for (const notification of notifications || []) {
      results.checked++;
      
      try {
        let shouldTrigger = false;
        let notificationBody = notification.description;

        // Check based on notification type
        if (notification.type === "time_reminder") {
          // Support both trigger_at and trigger_time field names
          const triggerAt = new Date(notification.condition_config?.trigger_at || notification.condition_config?.trigger_time);
          if (triggerAt <= now) {
            shouldTrigger = true;
          }
        } else if (notification.type === "crypto_price") {
          const { symbol, change_percent, direction } = notification.condition_config || {};
          if (symbol) {
            const priceData = await getCryptoPrice(symbol);
            if (priceData) {
              const absChange = Math.abs(priceData.change24h);
              const changeDirection = priceData.change24h > 0 ? "up" : "down";
              
              if (absChange >= (change_percent || 1)) {
                if (direction === "any" || direction === changeDirection || !direction) {
                  shouldTrigger = true;
                  notificationBody = `${symbol} has changed ${priceData.change24h.toFixed(2)}% in the last 24 hours. Current price: $${priceData.price.toLocaleString()}`;
                }
              }
            }
          }
        } else if (notification.type === "stock_price") {
          const { symbol, change_percent, direction } = notification.condition_config || {};
          if (symbol) {
            const stockData = await getStockPrice(symbol as string);
            if (stockData) {
              const absChange = Math.abs(stockData.changePercent);
              const changeDirection = stockData.changePercent > 0 ? "up" : "down";
              
              if (absChange >= ((change_percent as number) || 1)) {
                if (direction === "any" || direction === changeDirection || !direction) {
                  shouldTrigger = true;
                  const emoji = changeDirection === "up" ? "📈" : "📉";
                  notificationBody = `${emoji} ${symbol} has changed ${stockData.changePercent.toFixed(2)}% today. Current price: $${stockData.price.toFixed(2)}`;
                }
              }
            }
          }
        } else if (notification.type === "weather") {
          const { location, condition: targetCondition, check_date } = notification.condition_config || {};
          if (location) {
            const weather = await getWeather(location as string);
            if (weather && weather.condition === targetCondition) {
              shouldTrigger = true;
              notificationBody = `Weather alert for ${location}: ${weather.description}. Temperature: ${weather.temp}°C`;
            }
          }
        } else if (notification.type === "sports_match") {
          const { team, notify_before_minutes = 60 } = notification.condition_config || {};
          if (team) {
            const matchData = await getSportsMatches(team as string);
            if (matchData?.hasMatch && matchData.kickoffTime) {
              const timeDiff = matchData.kickoffTime.getTime() - now.getTime();
              const minutesUntilMatch = timeDiff / (1000 * 60);
              
              if (minutesUntilMatch <= (notify_before_minutes as number) && minutesUntilMatch > 0) {
                shouldTrigger = true;
                notificationBody = `⚽ Upcoming match: ${matchData.matchInfo}`;
              }
            }
          }
        } else if (notification.type === "news_monitoring") {
          const { topic, keywords = [], last_check_hash } = notification.condition_config || {};
          if (topic) {
            const newsData = await getNews(topic as string, keywords as string[]);
            if (newsData?.hasNews && newsData.headlines.length > 0) {
              // Create a simple hash of headlines to detect new news
              const currentHash = newsData.headlines.join("").substring(0, 100);
              
              if (currentHash !== last_check_hash) {
                shouldTrigger = true;
                notificationBody = `📰 News update for "${topic}":\n${newsData.headlines.slice(0, 3).join("\n")}`;
                
                // Update the hash in condition_config
                await supabase
                  .from("notifications")
                  .update({
                    condition_config: { ...notification.condition_config, last_check_hash: currentHash },
                  })
                  .eq("id", notification.id);
              }
            }
          }
        } else if (notification.type === "social_media") {
          const { platform, username, last_post_check } = notification.condition_config || {};
          if (platform && username) {
            const socialData = await checkSocialMedia(platform as string, username as string);
            if (socialData?.hasActivity && socialData.latestPost !== last_post_check) {
              shouldTrigger = true;
              notificationBody = `🐦 New activity from @${username}: ${socialData.latestPost.substring(0, 200)}`;
              
              // Update last checked post
              await supabase
                .from("notifications")
                .update({
                  condition_config: { ...notification.condition_config, last_post_check: socialData.latestPost },
                })
                .eq("id", notification.id);
            }
          }
        } else if (notification.type === "screen_time") {
          // Focus timer - check if the time limit has been reached
          const { app_name, time_limit_minutes, trigger_at } = notification.condition_config || {};
          if (trigger_at) {
            const triggerTime = new Date(trigger_at as string);
            if (triggerTime <= now) {
              shouldTrigger = true;
              notificationBody = `⏱️ Your ${time_limit_minutes}-minute focus session for ${app_name || "your app"} is complete! Time to take a break.`;
            }
          }
        } else if (notification.type === "location_based") {
          // Location-based reminders require client-side geolocation
          // This check is performed when the user's location is reported to the server
          // For now, we log that this notification type requires mobile app integration
          const { location_name, trigger_type } = notification.condition_config || {};
          
          // Check if we have a pending trigger from client location update
          const pendingTrigger = notification.condition_config?.pending_trigger;
          if (pendingTrigger) {
            shouldTrigger = true;
            const actionText = trigger_type === "arrive" ? "arrived at" : "left";
            notificationBody = `📍 You've ${actionText} ${location_name}! Don't forget: ${notification.description}`;
            
            // Clear the pending trigger
            await supabase
              .from("notifications")
              .update({
                condition_config: { ...notification.condition_config, pending_trigger: false },
              })
              .eq("id", notification.id);
          }
        } else if (notification.type === "flight_status") {
          const { flight_number, alert_type = "any", last_status } = notification.condition_config || {};
          
          if (flight_number) {
            const flightData = await getFlightStatus(flight_number as string);
            
            if (flightData && flightData.has_update) {
              const currentStatus = `${flightData.status}-${flightData.delay_minutes}-${flightData.gate}`;
              
              // Only trigger if status changed since last check
              if (currentStatus !== last_status) {
                const shouldTriggerForType = 
                  alert_type === "any" ||
                  (alert_type === "delay" && flightData.update_type === "delay") ||
                  (alert_type === "gate_change" && flightData.update_type === "gate_change") ||
                  (alert_type === "departure" && flightData.update_type === "departure") ||
                  (alert_type === "arrival" && flightData.update_type === "arrival");
                
                if (shouldTriggerForType) {
                  shouldTrigger = true;
                  
                  if (flightData.update_type === "delay") {
                    notificationBody = `✈️ Flight ${flight_number} is delayed by ${flightData.delay_minutes} minutes. New status: ${flightData.status}`;
                  } else if (flightData.update_type === "gate_change") {
                    notificationBody = `✈️ Flight ${flight_number} gate changed to ${flightData.gate || "TBD"} (Terminal ${flightData.terminal || "TBD"})`;
                  } else if (flightData.update_type === "departure") {
                    notificationBody = `✈️ Flight ${flight_number} has departed from ${flightData.departure_airport}`;
                  } else if (flightData.update_type === "arrival") {
                    notificationBody = `✈️ Flight ${flight_number} has landed at ${flightData.arrival_airport}`;
                  } else {
                    notificationBody = `✈️ Flight ${flight_number} update: ${flightData.status}. Departure: ${flightData.departure_time}`;
                  }
                  
                  // Update last status
                  await supabase
                    .from("notifications")
                    .update({
                      condition_config: { ...notification.condition_config, last_status: currentStatus },
                    })
                    .eq("id", notification.id);
                }
              }
            }
          }
        }

        if (shouldTrigger) {
          logStep("Triggering notification", { id: notification.id, type: notification.type });

          const sentVia: string[] = [];
          let pushSent = false;
          let emailSent = false;

          // Send based on channel preference
          if (notification.channel === "push" || notification.channel === "both") {
            pushSent = await sendPushNotification(
              supabase,
              notification.user_id,
              notification.title,
              notificationBody
            );
            if (pushSent) sentVia.push("push");
          }

          if (notification.channel === "email" || notification.channel === "both") {
            emailSent = await sendEmailNotification(
              supabase,
              notification.user_id,
              notification.title,
              notificationBody,
              notification.type
            );
            if (emailSent) sentVia.push("email");
          }

          // Fallback: If push was requested but failed, and email wasn't tried, send email as fallback
          if ((notification.channel === "push") && !pushSent && !emailSent) {
            logStep("Push failed, attempting email fallback", { id: notification.id });
            emailSent = await sendEmailNotification(
              supabase,
              notification.user_id,
              notification.title,
              notificationBody,
              notification.type
            );
            if (emailSent) sentVia.push("email");
          }

          // Log to history
          await supabase.from("notification_history").insert({
            notification_id: notification.id,
            user_id: notification.user_id,
            title: notification.title,
            body: notificationBody,
            channel: notification.channel,
            sent_via: sentVia,
          });

          // Update notification
          const newTriggerCount = notification.trigger_count + 1;
          const shouldExpire = notification.max_triggers && newTriggerCount >= notification.max_triggers;

          await supabase
            .from("notifications")
            .update({
              triggered_at: now.toISOString(),
              trigger_count: newTriggerCount,
              last_checked_at: now.toISOString(),
              status: shouldExpire ? "triggered" : "active",
            })
            .eq("id", notification.id);

          results.triggered++;
        } else {
          // Just update last_checked_at
          await supabase
            .from("notifications")
            .update({ last_checked_at: now.toISOString() })
            .eq("id", notification.id);
        }
      } catch (notifError) {
        logStep("Error processing notification", { 
          id: notification.id, 
          error: String(notifError) 
        });
        results.errors++;
      }
    }

    logStep("Notification check complete", results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Notify check error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
