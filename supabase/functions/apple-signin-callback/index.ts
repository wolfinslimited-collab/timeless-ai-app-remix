import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Apple Sign-In Callback for Android
 * 
 * Apple sends a POST request with form-encoded data to the redirect URI.
 * This function extracts the credentials and redirects the Android app
 * back via an intent URI that the sign_in_with_apple package can intercept.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    let params: URLSearchParams;

    if (req.method === "POST") {
      // Apple sends a POST with application/x-www-form-urlencoded body
      const body = await req.text();
      params = new URLSearchParams(body);
    } else if (req.method === "GET") {
      // Fallback for GET requests
      params = new URL(req.url).searchParams;
    } else {
      return new Response("Method not allowed", { status: 405 });
    }

    // Build the query string from Apple's response
    const queryPairs: string[] = [];
    for (const [key, value] of params.entries()) {
      queryPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
    const queryString = queryPairs.join("&");

    // Redirect to Android intent URI that sign_in_with_apple package intercepts
    const intentUri = `intent://callback?${queryString}#Intent;package=com.wolfine.app;scheme=signinwithapple;end`;

    return new Response(null, {
      status: 303,
      headers: {
        "Location": intentUri,
      },
    });
  } catch (error) {
    console.error("Apple callback error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process Apple Sign-In callback" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
