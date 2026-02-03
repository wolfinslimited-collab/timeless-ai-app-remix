import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Apple's public key endpoint
const APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys";

// Google's public key endpoints
const GOOGLE_KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs";

// Valid audience values for Apple tokens (bundle ID for native iOS)
const VALID_APPLE_AUDIENCES = [
  "com.health.timelessApp", // iOS bundle ID (native Sign In with Apple)
];

// Valid audience values for Google tokens (OAuth Client IDs)
const VALID_GOOGLE_AUDIENCES = [
  "1012149210327-63j4hf0g83bqlad026c29q574hqdf1ka.apps.googleusercontent.com", // iOS Client ID
  "1012149210327-7dg02kf3k08bu0ksp41rhsntl5lpl4no.apps.googleusercontent.com", // Web Client ID (Firebase/Android)
];

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[MOBILE-AUTH] ${step}${detailsStr}`);
};

// Fetch public keys from a JWKS endpoint
async function fetchPublicKeys(url: string): Promise<jose.JWK[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch public keys from ${url}: ${response.status}`);
  }
  const data = await response.json();
  return data.keys;
}

// Verify Apple ID token manually
async function verifyAppleToken(
  idToken: string,
  nonce?: string,
): Promise<{
  sub: string;
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
}> {
  logStep("Verifying Apple token manually");

  const header = jose.decodeProtectedHeader(idToken);
  const kid = header.kid;

  if (!kid) {
    throw new Error("Token missing key ID (kid) in header");
  }

  const keys = await fetchPublicKeys(APPLE_KEYS_URL);
  const key = keys.find((k) => k.kid === kid);

  if (!key) {
    throw new Error(`No matching Apple public key found for kid: ${kid}`);
  }

  const publicKey = await jose.importJWK(key, header.alg || "RS256");

  const { payload } = await jose.jwtVerify(idToken, publicKey, {
    issuer: "https://appleid.apple.com",
    audience: VALID_APPLE_AUDIENCES,
  });

  logStep("Apple token verified", {
    sub: payload.sub,
    email: payload.email,
    aud: payload.aud,
  });

  // Verify nonce if provided
  if (nonce) {
    const tokenNonce = payload.nonce as string | undefined;
    if (!tokenNonce) {
      throw new Error("Token missing nonce but nonce was expected");
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(nonce);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashedNonce = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

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

// Verify Firebase ID token (works for Google, Facebook, and other Firebase Auth providers)
async function verifyFirebaseToken(
  idToken: string,
  firebaseProjectId: string,
): Promise<{
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  provider?: string;
}> {
  logStep("Verifying Firebase token");

  const header = jose.decodeProtectedHeader(idToken);
  const kid = header.kid;

  if (!kid) {
    throw new Error("Token missing key ID (kid) in header");
  }

  // Firebase uses Google's public keys
  const FIREBASE_KEYS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

  // Fetch Firebase/Google public certificates
  const response = await fetch(FIREBASE_KEYS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Firebase public keys: ${response.status}`);
  }
  const certs = await response.json();

  const certPem = certs[kid];
  if (!certPem) {
    throw new Error(`No matching Firebase public key found for kid: ${kid}`);
  }

  // Import the certificate
  const publicKey = await jose.importX509(certPem, "RS256");

  // Verify the token
  const { payload } = await jose.jwtVerify(idToken, publicKey, {
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
    audience: firebaseProjectId,
  });

  // Verify expiration and issued-at
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new Error("Token has expired");
  }
  if (payload.iat && payload.iat > now + 60) {
    // Allow 60s clock skew
    throw new Error("Token issued in the future");
  }
  if (payload.auth_time && (payload.auth_time as number) > now + 60) {
    throw new Error("Auth time is in the future");
  }

  // Get the sign-in provider from firebase identities
  // deno-lint-ignore no-explicit-any
  const firebase = payload.firebase as any;
  const signInProvider = firebase?.sign_in_provider || "unknown";

  logStep("Firebase token verified", {
    sub: payload.sub,
    email: payload.email,
    provider: signInProvider,
  });

  return {
    sub: payload.sub as string,
    email: payload.email as string | undefined,
    email_verified: payload.email_verified as boolean | undefined,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    provider: signInProvider,
  };
}

// Generic auth handler that creates or finds user and generates session
// deno-lint-ignore no-explicit-any
async function handleProviderAuth(
  supabaseAdmin: any,
  supabaseUrl: string,
  anonKey: string,
  providerPayload: {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
    provider: string;
  },
  additionalName?: string,
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
  isNewUser: boolean;
}> {
  const { sub, email, name, picture, provider } = providerPayload;
  const displayName = name || additionalName;

  logStep("Looking up user", { provider, sub, email });

  // Find existing user by provider identity or email
  const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  // Find user with matching provider identity
  // deno-lint-ignore no-explicit-any
  let existingUser = existingUsers.users.find(
    (user: any) =>
      // deno-lint-ignore no-explicit-any
      user.identities?.some((identity: any) => identity.provider === provider && identity.id === sub) ||
      // Also match by app_metadata provider_id
      (user.app_metadata?.provider === provider && user.user_metadata?.provider_id === sub),
  );

  // Check by email if no identity match
  if (!existingUser && email) {
    // deno-lint-ignore no-explicit-any
    existingUser = existingUsers.users.find((user: any) => user.email?.toLowerCase() === email.toLowerCase());
  }

  let userId: string;
  let userEmail: string | undefined;
  let isNewUser = false;

  if (existingUser) {
    logStep("Found existing user", { userId: existingUser.id });
    userId = existingUser.id;
    userEmail = existingUser.email;

    // Update user metadata if needed
    if (displayName || picture) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          full_name: displayName || existingUser.user_metadata?.full_name,
          avatar_url: picture || existingUser.user_metadata?.avatar_url,
        },
      });
    }
  } else {
    // Create new user
    logStep("Creating new user", { email, provider });

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email || `${provider}_${sub.substring(0, 20)}@placeholder.local`,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
        avatar_url: picture,
        provider: provider,
        provider_id: sub,
      },
      app_metadata: {
        provider: provider,
        providers: [provider],
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

  // Generate session using temporary password approach
  logStep("Generating session for user", { userId });

  const tempPassword = crypto.randomUUID() + crypto.randomUUID();
  const signInEmail = userEmail || `${provider}_${userId.replace(/-/g, "")}@placeholder.local`;

  // Set temp password
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    email: signInEmail,
    email_confirm: true,
    password: tempPassword,
  });

  // Sign in with temp password to get session
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
  });

  const { data: sessionData, error: sessionError } = await anonClient.auth.signInWithPassword({
    email: signInEmail,
    password: tempPassword,
  });

  if (sessionError || !sessionData.session) {
    throw new Error(`Failed to create session: ${sessionError?.message || "No session returned"}`);
  }

  logStep("Session created successfully", { userId });

  // Clear the temporary password
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: crypto.randomUUID() + crypto.randomUUID() + crypto.randomUUID(),
  });

  return {
    userId,
    userEmail,
    userName: displayName,
    session: {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_at: sessionData.session.expires_at,
      expires_in: sessionData.session.expires_in,
    },
    isNewUser,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // Firebase project ID for token verification
  const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID") || "timeless-983d7";

  try {
    const body = await req.json();
    const { provider, idToken, name, deviceId, nonce, source } = body;

    // source can be: "native" (native SDKs), "firebase" (Firebase Auth)
    const authSource = source || "native";

    logStep("Request received", { provider, source: authSource, hasIdToken: !!idToken, name, deviceId });

    if (!provider || !idToken) {
      throw new Error("Missing required fields: provider and idToken are required");
    }

    const validProviders = ["google", "apple", "facebook"];
    if (!validProviders.includes(provider)) {
      throw new Error(`Invalid provider. Supported providers: ${validProviders.join(", ")}`);
    }

    // Create admin client for user operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
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

    // Handle authentication based on source and provider
    if (authSource === "firebase") {
      // Firebase Auth flow (supports Google, Facebook, and other Firebase providers)
      if (!firebaseProjectId) {
        throw new Error("Firebase Project ID not configured. Add FIREBASE_PROJECT_ID to secrets.");
      }

      const firebasePayload = await verifyFirebaseToken(idToken, firebaseProjectId);

      authResult = await handleProviderAuth(
        supabaseAdmin,
        supabaseUrl,
        supabaseAnonKey,
        {
          sub: firebasePayload.sub,
          email: firebasePayload.email,
          email_verified: firebasePayload.email_verified,
          name: firebasePayload.name || name,
          picture: firebasePayload.picture,
          provider: provider, // Use the provider passed in (google, facebook, etc.)
        },
        name,
      );
    } else if (provider === "apple") {
      // Native Apple Sign In (iOS)
      const applePayload = await verifyAppleToken(idToken, nonce);

      authResult = await handleProviderAuth(
        supabaseAdmin,
        supabaseUrl,
        supabaseAnonKey,
        {
          sub: applePayload.sub,
          email: applePayload.email,
          email_verified: applePayload.email_verified,
          provider: "apple",
        },
        name,
      );
    } else if (provider === "google") {
      // Native Google Sign In (Android) - verify Google ID token directly
      logStep("Verifying native Google token");

      const header = jose.decodeProtectedHeader(idToken);
      const kid = header.kid;

      if (!kid) {
        throw new Error("Token missing key ID (kid) in header");
      }

      const keys = await fetchPublicKeys(GOOGLE_KEYS_URL);
      const key = keys.find((k) => k.kid === kid);

      if (!key) {
        throw new Error(`No matching Google public key found for kid: ${kid}`);
      }

      const publicKey = await jose.importJWK(key, header.alg || "RS256");

      // Verify with our list of valid Google Client IDs
      const { payload } = await jose.jwtVerify(idToken, publicKey, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: VALID_GOOGLE_AUDIENCES,
      });

      logStep("Google token verified", {
        sub: payload.sub,
        email: payload.email,
        aud: payload.aud,
      });

      authResult = await handleProviderAuth(
        supabaseAdmin,
        supabaseUrl,
        supabaseAnonKey,
        {
          sub: payload.sub as string,
          email: payload.email as string | undefined,
          email_verified: payload.email_verified as boolean | undefined,
          name: (payload.name as string | undefined) || name,
          picture: payload.picture as string | undefined,
          provider: "google",
        },
        name,
      );
    } else {
      throw new Error(`Provider ${provider} requires Firebase authentication. Set source: "firebase"`);
    }

    // Check/update profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, credits, plan, avatar_url")
      .eq("user_id", authResult.userId)
      .maybeSingle();

    // Update display name or avatar if needed
    if (profile) {
      const updates: Record<string, string> = {};
      if (name && !profile.display_name) {
        updates.display_name = name;
      }
      if (authResult.userName && !profile.display_name) {
        updates.display_name = authResult.userName;
      }
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from("profiles").update(updates).eq("user_id", authResult.userId);
        logStep("Updated profile", updates);
      }
    }

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
        profile: profile
          ? {
              credits: profile.credits,
              plan: profile.plan,
            }
          : null,
        isNewUser: authResult.isNewUser || false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
