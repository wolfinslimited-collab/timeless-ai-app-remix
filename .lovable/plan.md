
# Fix Firebase Duplicate App Initialization Error

## Problem Analysis

The Flutter app is crashing with `[core/duplicate-app] A Firebase App named "[DEFAULT]" already exists` error. This occurs because:

1. **Native Auto-Initialization**: When `GoogleService-Info.plist` (iOS) or `google-services.json` (Android) is present, Firebase plugins can auto-initialize from the native side BEFORE Flutter's Dart code runs.

2. **Duplicate Background Handler**: The `firebaseMessagingBackgroundHandler` is registered in two places:
   - `main.dart` line 33
   - `push_notification_service.dart` line 40

3. **Race Condition**: The `Firebase.apps.isEmpty` check in Dart may still fail if native initialization happens in parallel with Dart initialization.

---

## Solution

### Step 1: Disable Firebase Auto-Configuration on iOS

Add a flag to `Info.plist` to prevent automatic Firebase initialization from the native side, giving Dart full control.

**File:** `flutter_app/ios/Runner/Info.plist`

Add the following key-value pair:
```xml
<key>FirebaseAppDelegateProxyEnabled</key>
<false/>
```

This prevents Firebase from auto-initializing on the native iOS side.

---

### Step 2: Use Try-Catch for Robust Initialization

Update `main.dart` to wrap Firebase initialization in a try-catch block for more robust error handling:

**File:** `flutter_app/lib/main.dart`

```dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase with error handling
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }
  } catch (e) {
    debugPrint('Firebase already initialized or error: $e');
  }

  // Set up background message handler
  FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

  // ... rest of initialization
}
```

---

### Step 3: Remove Duplicate Background Handler Registration

Remove the duplicate `onBackgroundMessage` call from `push_notification_service.dart` since it's already registered in `main.dart`.

**File:** `flutter_app/lib/services/push_notification_service.dart`

Remove line 40:
```dart
// DELETE THIS LINE:
FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);
```

---

### Step 4: Update firebase_options.dart with Real Values

The current `firebase_options.dart` has placeholder values like `'YOUR_ANDROID_API_KEY'`. These need to be replaced with actual values from your Firebase project.

**File:** `flutter_app/lib/core/firebase_options.dart`

Update with values from `GoogleService-Info.plist`:
```dart
static const FirebaseOptions ios = FirebaseOptions(
  apiKey: 'AIzaSyB9RBNguGjYVPupuD40Z_ZoBY_wBlY4H_k', // From API_KEY
  appId: '1:1012149210327:ios:77ca5f404f0ad61af8b492', // From GOOGLE_APP_ID
  messagingSenderId: '1012149210327', // From GCM_SENDER_ID
  projectId: 'timeless-983d7',
  storageBucket: 'timeless-983d7.firebasestorage.app',
  iosBundleId: 'com.health.timelessApp',
);
```

For Android, you'll need to extract values from `google-services.json` file.

---

## Files to Modify

| File | Change |
|------|--------|
| `flutter_app/ios/Runner/Info.plist` | Add `FirebaseAppDelegateProxyEnabled` = `false` |
| `flutter_app/lib/main.dart` | Add try-catch wrapper and import `debugPrint` |
| `flutter_app/lib/services/push_notification_service.dart` | Remove duplicate `onBackgroundMessage` registration |
| `flutter_app/lib/core/firebase_options.dart` | Update with real values from GoogleService-Info.plist |

---

## Post-Fix Steps (for you to run locally)

After I apply these changes, run:
```bash
cd flutter_app
flutter clean
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
flutter run
```
