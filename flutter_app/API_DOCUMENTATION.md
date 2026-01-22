# Timeless AI - Backend API Documentation

Complete API reference for integrating with the Timeless AI backend.

## Base Configuration

```
Base URL: https://ifesxveahsbjhmrhkhhy.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZXN4dmVhaHNiamhtcmhraGh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4ODc4OTQsImV4cCI6MjA4NDQ2Mzg5NH0.uBRcVNQcTdJNk9gstOCW6xRcQsZ8pnQwy5IGxbhZD6g
```

## Authentication

All authenticated endpoints require these headers:

```http
Authorization: Bearer <user_access_token>
apikey: <anon_key>
Content-Type: application/json
```

### Sign Up

```http
POST /auth/v1/signup
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "data": {
    "display_name": "John Doe"
  }
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Sign In

```http
POST /auth/v1/token?grant_type=password
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:** Same as Sign Up

### Refresh Token

```http
POST /auth/v1/token?grant_type=refresh_token
```

**Request Body:**
```json
{
  "refresh_token": "your_refresh_token"
}
```

### Sign Out

```http
POST /auth/v1/logout
```

### Reset Password

```http
POST /auth/v1/recover
```

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

---

## Edge Functions

All edge functions use this base URL:
```
https://ifesxveahsbjhmrhkhhy.supabase.co/functions/v1
```

---

### 1. Generate (Image/Video)

Create AI-generated images or videos.

```http
POST /functions/v1/generate
```

**Headers:**
```http
Authorization: Bearer <access_token>
apikey: <anon_key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "prompt": "A beautiful sunset over mountains",
  "model": "nano-banana-pro",
  "type": "image",
  "aspectRatio": "16:9",
  "quality": "1080p",
  "imageUrl": "https://...",        // Optional: for image-to-video
  "endImageUrl": "https://..."      // Optional: for video interpolation
}
```

**Available Models:**

| Model ID | Type | Description |
|----------|------|-------------|
| `nano-banana-pro` | image | Fast image generation (Gemini) |
| `fal-ai/flux/schnell` | image | FLUX Schnell |
| `fal-ai/flux-pro/v1.1` | image | FLUX Pro v1.1 |
| `fal-ai/flux-pro/v1.1-ultra` | image | FLUX Pro Ultra |
| `fal-ai/recraft-v3` | image | Recraft v3 |
| `fal-ai/ideogram/v2` | image | Ideogram v2 |
| `fal-ai/stable-diffusion-v35-large` | image | SD 3.5 Large |
| `fal-ai/wan/v2.1/1.3b/text-to-video` | video | Wan 2.1 T2V |
| `fal-ai/wan/v2.1/14b/text-to-video` | video | Wan 2.1 14B |
| `fal-ai/kling-video/v2.0/master/text-to-video` | video | Kling 2.0 Master |
| `fal-ai/kling-video/v2.1/pro/text-to-video` | video | Kling 2.1 Pro |
| `fal-ai/minimax-video/video-01-live` | video | Minimax Live |
| `fal-ai/hunyuan-video` | video | Hunyuan |
| `fal-ai/luma-dream-machine` | video | Luma Dream Machine |
| `sora` | video | OpenAI Sora |

**Aspect Ratios:** `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `21:9`

**Quality Options:** `480p`, `720p`, `1080p`, `2K`, `4K`

**Response (Sync - completed immediately):**
```json
{
  "status": "completed",
  "outputUrl": "https://...",
  "thumbnailUrl": "https://...",
  "generationId": "uuid"
}
```

**Response (Async - needs polling):**
```json
{
  "status": "pending",
  "taskId": "fal-task-id",
  "endpoint": "fal-ai/kling-video/v2.0/master/text-to-video",
  "generationId": "uuid"
}
```

---

### 2. Check Generation Status

Poll for async generation completion.

```http
POST /functions/v1/check-generation
```

**Request Body:**
```json
{
  "taskId": "fal-task-id",
  "endpoint": "fal-ai/kling-video/v2.0/master/text-to-video",
  "generationId": "uuid"
}
```

**Response:**
```json
{
  "status": "completed",
  "outputUrl": "https://...",
  "thumbnailUrl": "https://...",
  "progress": 100
}
```

**Status Values:** `pending`, `processing`, `completed`, `failed`

---

### 3. Chat (AI Conversation)

Stream AI chat responses.

```http
POST /functions/v1/chat
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "openai/gpt-4o",
  "conversationId": "uuid",
  "stream": true
}
```

**Available Chat Models:**
- `openai/gpt-4o` - GPT-4o
- `openai/gpt-4o-mini` - GPT-4o Mini
- `google/gemini-2.0-flash-001` - Gemini 2.0 Flash
- `google/gemini-2.5-pro-preview-06-05` - Gemini 2.5 Pro
- `x-ai/grok-3-beta` - Grok 3
- `meta-llama/llama-4-maverick` - Llama 4
- `deepseek/deepseek-chat-v3-0324` - DeepSeek v3

**Response (Streaming):**
Server-Sent Events (SSE) format:
```
data: {"content": "Hello", "done": false}
data: {"content": "! How", "done": false}
data: {"content": " can I help?", "done": true, "title": "Greeting"}
```

---

### 4. Image Tools

Process images with AI tools.

```http
POST /functions/v1/image-tools
```

**Request Body:**
```json
{
  "tool": "upscale",
  "imageUrl": "https://...",
  "prompt": "enhance details",
  "params": {
    "scale": 2,
    "intensity": 0.8
  }
}
```

**Available Tools:**

| Tool ID | Description | Extra Params |
|---------|-------------|--------------|
| `upscale` | Upscale image resolution | `scale`: 2-4 |
| `remove-bg` | Remove background | - |
| `inpainting` | Edit specific areas | `mask_url`, `prompt` |
| `relight` | Change lighting | `intensity`, `direction` |
| `angle` | Change viewing angle | `angle` |
| `skin-enhancer` | Enhance skin texture | `intensity` |
| `object-erase` | Remove objects | `mask_url` |
| `colorize` | Add color to B&W | - |
| `style-transfer` | Apply art style | `style`, `strength` |

**Response:**
```json
{
  "status": "completed",
  "outputUrl": "https://...",
  "generationId": "uuid"
}
```

---

### 5. Video Tools

Process videos with AI tools.

```http
POST /functions/v1/video-tools
```

**Request Body:**
```json
{
  "tool": "upscale",
  "videoUrl": "https://...",
  "params": {
    "resolution": "4K"
  }
}
```

**Available Tools:**

| Tool ID | Description |
|---------|-------------|
| `upscale` | Upscale video resolution |
| `lipsync` | Sync lips to audio |
| `extend` | Extend video duration |
| `interpolate` | Increase frame rate |
| `mixed-media` | Combine video elements |
| `edit` | AI video editing |
| `click-to-ad` | Generate ad from product |
| `draw-to-video` | Convert drawing to video |
| `sketch-to-video` | Convert sketch to video |
| `ugc-factory` | Generate UGC content |

---

### 6. Cinema Tools

Professional cinema-grade video tools.

```http
POST /functions/v1/cinema-tools
```

**Request Body:**
```json
{
  "tool": "camera-control",
  "videoUrl": "https://...",
  "params": {
    "movement": "dolly-zoom",
    "intensity": 0.7
  }
}
```

**Available Tools:**

| Tool ID | Description | Params |
|---------|-------------|--------|
| `camera-control` | Camera movement effects | `movement`, `intensity` |
| `motion-path` | Custom motion paths | `path`, `speed` |
| `depth-control` | Depth of field | `aperture`, `focus_distance` |
| `lens-effects` | Lens effects | `type`, `intensity` |
| `color-grade` | Color grading LUTs | `lut`, `intensity` |
| `stabilize` | Video stabilization | `strength` |

**Camera Movements:**
`static`, `pan-left`, `pan-right`, `tilt-up`, `tilt-down`, `dolly-in`, `dolly-out`, `zoom-in`, `zoom-out`, `crane-up`, `crane-down`, `arc-left`, `arc-right`, `tracking`, `handheld`, `dolly-zoom`

---

### 7. Music Tools

Audio processing tools.

```http
POST /functions/v1/music-tools
```

**Request Body:**
```json
{
  "tool": "stems",
  "audioUrl": "https://...",
  "params": {
    "stems": ["vocals", "drums", "bass", "other"]
  }
}
```

**Available Tools:**

| Tool ID | Description |
|---------|-------------|
| `stems` | Separate audio stems |
| `vocals` | Extract/remove vocals |
| `enhance` | Audio enhancement |
| `mastering` | Audio mastering |
| `tempo-pitch` | Change tempo/pitch |
| `sound-effects` | Generate sound effects |
| `remix` | AI remix generation |

---

### 8. Video Translation

Translate and dub videos.

```http
POST /functions/v1/translate-video
```

**Request Body:**
```json
{
  "videoUrl": "https://...",
  "targetLanguage": "es",
  "voiceClone": true
}
```

**Supported Languages:**
`en`, `es`, `fr`, `de`, `it`, `pt`, `zh`, `ja`, `ko`, `ar`, `hi`, `ru`

---

### 9. Create Checkout (Stripe)

Create a Stripe checkout session.

```http
POST /functions/v1/create-checkout
```

**Request Body (Credits):**
```json
{
  "type": "credits",
  "amount": 100
}
```

**Request Body (Subscription):**
```json
{
  "type": "subscription"
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

---

### 10. Customer Portal (Stripe)

Get Stripe customer portal URL.

```http
POST /functions/v1/customer-portal
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/..."
}
```

---

## Database Tables

### Profiles

User profile and subscription data.

```sql
Table: profiles
- id: uuid (PK)
- user_id: uuid (FK to auth.users)
- display_name: text
- avatar_url: text
- credits: integer (default: 50)
- plan: text (default: 'free')
- subscription_status: text ('none', 'active')
- subscription_id: text
- subscription_end_date: timestamp
- created_at: timestamp
- updated_at: timestamp
```

**Query Example:**
```http
GET /rest/v1/profiles?user_id=eq.<user_id>
```

---

### Generations

User's generated content.

```sql
Table: generations
- id: uuid (PK)
- user_id: uuid
- prompt: text
- model: text
- type: text ('image', 'video')
- status: text ('pending', 'processing', 'completed', 'failed')
- output_url: text
- thumbnail_url: text
- task_id: text
- provider_endpoint: text
- aspect_ratio: text
- quality: text
- title: text
- credits_used: integer
- created_at: timestamp
```

**Query Examples:**
```http
# Get all generations
GET /rest/v1/generations?user_id=eq.<user_id>&order=created_at.desc

# Get images only
GET /rest/v1/generations?user_id=eq.<user_id>&type=eq.image

# Get videos only
GET /rest/v1/generations?user_id=eq.<user_id>&type=eq.video

# Delete a generation
DELETE /rest/v1/generations?id=eq.<generation_id>
```

---

### Conversations

Chat conversation metadata.

```sql
Table: conversations
- id: uuid (PK)
- user_id: uuid
- title: text
- model: text
- folder_id: uuid
- pinned: boolean
- created_at: timestamp
- updated_at: timestamp
```

---

### Chat Messages

Individual chat messages.

```sql
Table: chat_messages
- id: uuid (PK)
- conversation_id: uuid (FK)
- role: text ('user', 'assistant')
- content: jsonb
- images: text[]
- created_at: timestamp
```

**Query Example:**
```http
GET /rest/v1/chat_messages?conversation_id=eq.<conv_id>&order=created_at.asc
```

---

### Chat Folders

Organize conversations.

```sql
Table: chat_folders
- id: uuid (PK)
- user_id: uuid
- name: text
- color: text
- created_at: timestamp
- updated_at: timestamp
```

---

## Credit Costs

| Model/Tool | Credits |
|------------|---------|
| nano-banana-pro | 1 |
| FLUX Schnell | 1 |
| FLUX Pro | 3 |
| FLUX Pro Ultra | 5 |
| Recraft v3 | 2 |
| Ideogram v2 | 3 |
| SD 3.5 | 2 |
| Wan 2.1 (1.3B) | 5 |
| Wan 2.1 (14B) | 10 |
| Kling 2.0 | 15 |
| Kling 2.1 Pro | 20 |
| Minimax | 12 |
| Hunyuan | 10 |
| Luma | 15 |
| Sora | 25 |
| Image Tools | 2-5 |
| Video Tools | 10-20 |
| Cinema Tools | 10-15 |
| Music Tools | 5-10 |

**Note:** Active subscribers bypass credit costs.

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (insufficient credits)
- `404` - Not Found
- `422` - Validation Error
- `500` - Server Error

---

## Rate Limits

- **Auth endpoints:** 5 requests/minute
- **Edge functions:** 100 requests/minute per user
- **Database queries:** 1000 requests/minute per user

---

## Flutter SDK Example

```dart
import 'package:supabase_flutter/supabase_flutter.dart';

// Initialize
await Supabase.initialize(
  url: 'https://ifesxveahsbjhmrhkhhy.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
);

final supabase = Supabase.instance.client;

// Sign in
final response = await supabase.auth.signInWithPassword(
  email: 'user@example.com',
  password: 'password',
);

// Call edge function
final result = await supabase.functions.invoke(
  'generate',
  body: {
    'prompt': 'A sunset',
    'model': 'nano-banana-pro',
    'type': 'image',
  },
);

// Query database
final generations = await supabase
    .from('generations')
    .select()
    .eq('user_id', supabase.auth.currentUser!.id)
    .order('created_at', ascending: false);
```

---

## Storage

Upload files to the `generation-inputs` bucket:

```dart
final bytes = await file.readAsBytes();
final path = '${userId}/${DateTime.now().millisecondsSinceEpoch}.jpg';

await supabase.storage
    .from('generation-inputs')
    .uploadBinary(path, bytes);

final url = supabase.storage
    .from('generation-inputs')
    .getPublicUrl(path);
```

---

## Webhooks (Stripe)

The backend handles Stripe webhooks at:
```
POST /functions/v1/stripe-webhook
```

Events handled:
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## Support

For API issues, check:
1. Authentication headers are correct
2. User has sufficient credits
3. Request body matches expected schema
4. Network connectivity to Supabase

---

*Last updated: January 2025*
