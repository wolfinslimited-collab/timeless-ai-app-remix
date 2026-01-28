import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Apple's public key endpoint
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";

// Valid audience values for Apple tokens (bundle ID for native iOS)
const VALID_APPLE_AUDIENCES = [
  "com.health.timelessApp",  // iOS bundle ID (native Sign In with Apple)
];

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MOBILE-AUTH] ${step}${detailsStr}`);
};

// Fetch Apple's public keys for JWT verification
async function getApplePublicKeys(): Promise<jose.JWK[]> {
  const response = await fetch(APPLE_KEYS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Apple public keys: ${response.status}`);
  }
  const data = await response.json();
  return data.keys;
}

// Verify Apple ID token manually
async function verifyAppleToken(idToken: string, nonce?: string): Promise<{
  sub: string;
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
}> {
  logStep("Verifying Apple token manually");
  
  // Decode the token header to get the key ID
  const header = jose.decodeProtectedHeader(idToken);
  const kid = header.kid;
  
  if (!kid) {
    throw new Error("Token missing key ID (kid) in header");
  }
  
  // Fetch Apple's public keys
  const keys = await getApplePublicKeys();
  const key = keys.find(k => k.kid === kid);
  
  if (!key) {
    throw new Error(`No matching Apple public key found for kid: ${kid}`);
  }
  
  // Import the public key
  const publicKey = await jose.importJWK(key, header.alg || "RS256");
  
  // Verify the token
  const { payload } = await jose.jwtVerify(idToken, publicKey, {
    issuer: "https://appleid.apple.com",
    audience: VALID_APPLE_AUDIENCES,
  });
  
  logStep("Apple token verified", { 
    sub: payload.sub, 
    email: payload.email,
    aud: payload.aud 
  });
  
  // Verify nonce if provided
  if (nonce) {
    const tokenNonce = payload.nonce as string | undefined;
    if (!tokenNonce) {
      throw new Error("Token missing nonce but nonce was expected");
    }
    // The nonce in the token is the hashed version
    const encoder = new TextEncoder();
    const data = encoder.encode(nonce);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedNonce = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    
    if (tokenNonce !== hashedNonce) {
      throw new Error("Nonce mismatch");
    }
    logStep("Nonce verified");
  }
  
  return {
    sub: payload.sub as string,
    email: payload.email as string | undefined,
    email_verified: payload.email_verified as boolean | undefined,
    is_private_email: payload.is_private_email as boolean | undefined,
  };
}

// Handle Apple authentication with manual token verification
// deno-lint-ignore no-explicit-any
async function handleAppleAuth(
  supabaseAdmin: any,
  supabaseUrl: string,
  anonKey: string,
  idToken: string,
  nonce?: string,
  name?: string
): Promise<{
  userId: string;
  userEmail?: string;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
  };
  isNewUser: boolean;
}> {
  // Manually verify Apple token (bypasses Supabase audience check)
  const applePayload = await verifyAppleToken(idToken, nonce);
  
  logStep("Looking up user by Apple ID", { sub: applePayload.sub });
  
  // Find existing user by Apple identity
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }
  
  // Find user with matching Apple identity
  // deno-lint-ignore no-explicit-any
  let existingUser = existingUsers.users.find((user: any) => 
    // deno-lint-ignore no-explicit-any
    user.identities?.some((identity: any) => 
      identity.provider === "apple" && identity.id === applePayload.sub
    )
  );
  
  // Also check by email if no identity match
  if (!existingUser && applePayload.email) {
    // deno-lint-ignore no-explicit-any
    existingUser = existingUsers.users.find((user: any) => 
      user.email?.toLowerCase() === applePayload.email?.toLowerCase()
    );
  }
  
  let userId: string;
  let userEmail: string | undefined;
  let isNewUser = false;
  
  if (existingUser) {
    logStep("Found existing user", { userId: existingUser.id });
    userId = existingUser.id;
    userEmail = existingUser.email;
  } else {
    // Create new user
    logStep("Creating new user", { email: applePayload.email });
    
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: applePayload.email,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        provider: "apple",
        provider_id: applePayload.sub,
      },
      app_metadata: {
        provider: "apple",
        providers: ["apple"],
      },
    });
    
    if (createError) {
      throw new Error(`Failed to create user: ${createError.message}`);
    }
    
    userId = newUser.user.id;
    userEmail = newUser.user.email;
    isNewUser = true;
    logStep("Created new user", { userId });
  }
  
  // Generate session using a temporary password approach
  logStep("Generating session for user", { userId });
  
  const tempPassword = crypto.randomUUID() + crypto.randomUUID();
  const signInEmail = userEmail || `apple_${userId.replace(/-/g, '')}@privaterelay.appleid.com`;
  
  // Ensure user has the email and set temp password
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: signInEmail,
    email_confirm: true,
    password: tempPassword,
  });
  
  // Sign in with temp password to get session
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
  
  const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
    email: signInEmail,
    password: tempPassword,
  });
  
  if (sessionError || !sessionData.session) {
    throw new Error(`Failed to create session: ${sessionError?.message || 'No session returned'}`);
  }
  
  logStep("Session created successfully", { userId });
  
  // Clear the temporary password for security (set a new random one)
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: crypto.randomUUID() + crypto.randomUUID() + crypto.randomUUID(),
  });
  
  return {
    userId,
    userEmail,
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
      expires_in: sessionData.session.expires_in,
    },
    isNewUser,
  };
}

// Handle Google authentication (uses Supabase built-in)
async function handleGoogleAuth(
  supabaseUrl: string,
  anonKey: string,
  idToken: string
): Promise<{
  userId: string;
  userEmail?: string;
  userName?: string;
  session: {
    access_token: string;
    refresh_token: string;
    expires_at?: number;
    expires_in?: number;
  };
}> {
  const supabaseAnon = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
  
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });
  
  if (authError) {
    throw new Error(`Google authentication failed: ${authError.message}`);
  }
  
  if (!authData.user || !authData.session) {
    throw new Error("Google authentication succeeded but no user/session returned");
  }
  
  return {
    userId: authData.user.id,
    userEmail: authData.user.email,
    userName: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name,
    session: {
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at,
      expires_in: authData.session.expires_in,
    },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    const body = await req.json();
    const { provider, idToken, name, deviceId, nonce } = body;

    logStep("Request received", { provider, hasIdToken: !!idToken, name, deviceId });

    if (!provider || !idToken) {
      throw new Error("Missing required fields: provider and idToken are required");
    }

    if (!["google", "apple"].includes(provider)) {
      throw new Error("Invalid provider. Supported providers: google, apple");
    }

    // Create admin client for profile operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    let authResult: {
      userId: string;
      userEmail?: string;
      userName?: string;
      session: {
        access_token: string;
        refresh_token: string;
        expires_at?: number;
        expires_in?: number;
      };
      isNewUser?: boolean;
    };

    if (provider === "apple") {
      authResult = await handleAppleAuth(
        supabaseAdmin,
        supabaseUrl,
        supabaseAnonKey,
        idToken,
        nonce,
        name
      );
    } else {
      // Google
      authResult = await handleGoogleAuth(supabaseUrl, supabaseAnonKey, idToken);
    }

    // Check if profile exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, credits, plan")
      .eq("user_id", authResult.userId)
      .maybeSingle();

    // Update display name if needed
    if (profile && name && !profile.display_name) {
      await supabaseAdmin
        .from("profiles")
        .update({ display_name: name })
        .eq("user_id", authResult.userId);
      logStep("Updated display name", { name });
    }

    // If deviceId is provided, log it for push notification setup
    if (deviceId) {
      logStep("Device ID provided for push registration", { deviceId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: authResult.userId,
          email: authResult.userEmail,
          name: authResult.userName || name,
        },
        session: authResult.session,
        profile: profile ? {
          credits: profile.credits,
          plan: profile.plan,
        } : null,
        isNewUser: authResult.isNewUser || false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
