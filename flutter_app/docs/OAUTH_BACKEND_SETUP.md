# OAuth Backend Implementation Guide

## Overview

This document describes the backend requirements for handling OAuth authentication (Google, Apple, Facebook) with a unified callback endpoint. The Flutter app uses:
- **Native Google Sign-In** on Android (exchanges ID token directly with Supabase)
- **Native Apple Sign-In** on iOS (exchanges ID token directly with Supabase)
- **Web-based OAuth** fallback for cross-platform scenarios and Facebook

## Supabase Project Configuration

**Project ID:** `ifesxveahsbjhmrhkhhy`
**Callback URL:** `https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback`
**Mobile Redirect URL:** `io.supabase.genaiapp://login-callback/`

---

## 1. Google OAuth Configuration

### Supabase Dashboard Settings
Navigate to: Authentication → Providers → Google

| Field | Value |
|-------|-------|
| Enable Sign in with Google | ✅ Enabled |
| Client ID | Your Web Client ID from Google Cloud Console |
| Client Secret | Your Web Client Secret from Google Cloud Console |
| Authorized Redirect URIs | `https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback` |

### Google Cloud Console Setup

#### 1. Create OAuth Consent Screen
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to APIs & Services → OAuth consent screen
3. Configure:
   - App name: `Timeless AI`
   - User support email: Your email
   - Authorized domains: `supabase.co`, `lovable.app` (and any custom domains)
   - Scopes: `email`, `profile`, `openid`

#### 2. Create OAuth Credentials

**Web Client (Required for all platforms):**
```
Application type: Web application
Name: Timeless AI Web
Authorized redirect URIs:
  - https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback
```
→ Copy the Client ID and Client Secret to Supabase

**Android Client:**
```
Application type: Android
Name: Timeless AI Android
Package name: com.timelessai.app
SHA-1 certificate fingerprint: [Get from ./gradlew signingReport]
```

**iOS Client:**
```
Application type: iOS
Name: Timeless AI iOS
Bundle ID: com.timelessai.app
```
→ Add reversed client ID to iOS Info.plist URL schemes

### Get Android SHA-1 Fingerprint
```bash
cd flutter_app/android
./gradlew signingReport

# For debug builds:
# Look for "SHA1:" under "Variant: debug"

# For release builds (production):
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

---

## 2. Apple OAuth Configuration

### Supabase Dashboard Settings
Navigate to: Authentication → Providers → Apple

| Field | Value |
|-------|-------|
| Enable Sign in with Apple | ✅ Enabled |
| Services ID | Your Apple Services ID (e.g., `com.timelessai.app.signin`) |
| Team ID | Your Apple Developer Team ID |
| Key ID | Your Apple Sign In Key ID |
| Private Key | Contents of your .p8 file |
| Authorized Redirect URIs | `https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback` |

### Apple Developer Console Setup

#### 1. Register an App ID
1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Certificates, Identifiers & Profiles → Identifiers
3. Create App ID:
   - Description: `Timeless AI`
   - Bundle ID: `com.timelessai.app`
   - Capabilities: ✅ Sign In with Apple

#### 2. Create a Services ID (for web-based OAuth)
1. Identifiers → Create Services ID
   - Description: `Timeless AI Sign In`
   - Identifier: `com.timelessai.app.signin`
2. Configure Sign In with Apple:
   - Primary App ID: Select your app
   - Domains: `ifesxveahsbjhmrhkhhy.supabase.co`
   - Return URLs: `https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback`

#### 3. Create a Sign In with Apple Key
1. Keys → Create Key
   - Name: `Timeless AI Sign In Key`
   - ✅ Sign In with Apple
   - Configure: Select your Primary App ID
2. Download the .p8 file (you can only download once!)
3. Note the Key ID

### iOS Xcode Configuration
The Flutter app already has:
- `Runner.entitlements` with `com.apple.developer.applesignin` capability
- Proper `CODE_SIGN_ENTITLEMENTS` in project settings

---

## 3. Facebook OAuth Configuration

### Supabase Dashboard Settings
Navigate to: Authentication → Providers → Facebook

| Field | Value |
|-------|-------|
| Enable Sign in with Facebook | ✅ Enabled |
| App ID | `730921032871755` |
| App Secret | Your Facebook App Secret |
| Authorized Redirect URIs | `https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback` |

### Facebook Developer Console Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Select your app (ID: `730921032871755`)
3. Facebook Login → Settings:
   - Valid OAuth Redirect URIs:
     - `https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback`
   - Deauthorize Callback URL: (optional)
4. Settings → Basic:
   - App Domains: `supabase.co`
   - Privacy Policy URL: Your privacy policy
   - Terms of Service URL: Your terms

---

## 4. Supabase Auth Settings

### Site URL Configuration
Navigate to: Authentication → URL Configuration

| Field | Value |
|-------|-------|
| Site URL | `io.supabase.genaiapp://login-callback/` |
| Redirect URLs | Add all of these: |

```
io.supabase.genaiapp://login-callback/
io.supabase.genaiapp://
https://ifesxveahsbjhmrhkhhy.supabase.co/auth/v1/callback
https://your-web-app-domain.com/
```

### Email Templates
Ensure email confirmation links use the mobile deep link:
```
{{ .SiteURL }}/auth/v1/confirm?token={{ .Token }}&type=signup&redirect_to=io.supabase.genaiapp://login-callback/
```

---

## 5. Profile Sync Trigger (Database)

Create a trigger to automatically create user profiles on signup:

```sql
-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, credits, plan)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    100,  -- Default credits for new users
    'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 6. Testing Checklist

### Android Testing
- [ ] Native Google Sign-In works (opens Google account picker)
- [ ] Apple Sign-In redirects to web (expected behavior)
- [ ] Facebook Sign-In redirects to web
- [ ] Deep link redirect works after OAuth (`io.supabase.genaiapp://login-callback/`)

### iOS Testing
- [ ] Native Apple Sign-In works (shows Apple ID sheet)
- [ ] Google Sign-In redirects to web (expected behavior)
- [ ] Facebook Sign-In redirects to web
- [ ] Deep link redirect works after OAuth

### Common Issues

**"Invalid redirect URI"**
- Ensure callback URL is added to both provider console AND Supabase Redirect URLs

**"SHA-1 mismatch" (Android)**
- Add both debug and release SHA-1 fingerprints to Google Console

**"Sign In with Apple not available" (iOS)**
- Check `Runner.entitlements` has the capability
- Verify bundle ID matches Apple Developer configuration

**User profile not created**
- Check the `handle_new_user` trigger is active
- Verify RLS policies allow INSERT on profiles table

---

## 7. Required Secrets Summary

| Provider | Required Credentials |
|----------|---------------------|
| Google | Web Client ID, Web Client Secret, Android SHA-1 |
| Apple | Services ID, Team ID, Key ID, .p8 Private Key |
| Facebook | App ID (730921032871755), App Secret |

All secrets should be configured in the Supabase Dashboard under Authentication → Providers.
