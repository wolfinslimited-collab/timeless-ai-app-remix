# Timeless AI - Flutter App

A complete Flutter application that connects to your existing Lovable Cloud backend.

## Features

- 🔐 **Authentication** - Email/password login & signup
- 🖼️ **Image Generation** - AI image creation with multiple models
- 🎬 **Video Generation** - AI video creation with Wan, Kling, Sora, etc.
- 🎵 **Music Tools** - Audio enhancement, stems, mastering
- 🎥 **Cinema Studio** - Professional video creation workspace
- 💬 **AI Chat** - Multi-model chat (GPT, Gemini, Grok, etc.)
- 📱 **AI Apps** - Specialized tools (upscale, background removal, etc.)
- 💳 **Subscription** - Stripe integration for credits & pro plans
- 📚 **Library** - View all your generations

## Setup

### 1. Install Flutter
```bash
# macOS
brew install flutter

# Or download from https://flutter.dev/docs/get-started/install
```

### 2. Install Dependencies
```bash
cd flutter_app
flutter pub get
```

### 3. Configure Backend
Update `lib/core/config.dart` with your Supabase credentials (already configured).

### 4. Run the App
```bash
# iOS Simulator
flutter run -d ios

# Android Emulator
flutter run -d android

# Both platforms
flutter run
```

## Project Structure

```
lib/
├── core/                  # Core utilities & config
│   ├── config.dart        # Supabase credentials
│   ├── theme.dart         # App theme (dark mode)
│   └── routes.dart        # Navigation routes
├── models/                # Data models
│   ├── user_model.dart
│   ├── generation_model.dart
│   └── conversation_model.dart
├── services/              # Backend services
│   ├── auth_service.dart
│   ├── generation_service.dart
│   ├── chat_service.dart
│   └── subscription_service.dart
├── providers/             # State management
│   ├── auth_provider.dart
│   ├── credits_provider.dart
│   └── generation_provider.dart
├── screens/               # UI screens
│   ├── auth/
│   ├── home/
│   ├── create/
│   ├── chat/
│   ├── library/
│   └── subscription/
├── widgets/               # Reusable widgets
│   ├── common/
│   ├── generation/
│   └── chat/
└── main.dart              # App entry point
```

## API Endpoints

Your backend Edge Functions:

| Function | Purpose |
|----------|---------|
| `generate` | Image/video generation |
| `check-generation` | Poll generation status |
| `chat` | AI chat with streaming |
| `image-tools` | Image processing tools |
| `video-tools` | Video processing tools |
| `music-tools` | Audio processing tools |
| `cinema-tools` | Cinema studio features |
| `create-checkout` | Stripe checkout |
| `customer-portal` | Manage subscription |

## Building for Production

```bash
# Android APK
flutter build apk --release

# Android App Bundle (for Play Store)
flutter build appbundle --release

# iOS (requires Mac with Xcode)
flutter build ios --release
```

## Requirements

- Flutter 3.16+
- Dart 3.2+
- iOS 12.0+ / Android API 21+
