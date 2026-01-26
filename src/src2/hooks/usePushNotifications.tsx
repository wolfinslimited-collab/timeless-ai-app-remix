import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Check if we're in a native app context (Capacitor) with platform support
const isNativeApp = () => {
  const capacitor = (window as any).Capacitor;
  if (!capacitor) return false;
  const platform = capacitor.getPlatform?.();
  // Only consider it native if running on iOS or Android
  return platform === 'ios' || platform === 'android';
};

// Check if the browser supports push notifications
const isPushSupported = () => {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

// Detect device type
const getDeviceType = (): 'ios' | 'android' | 'web' => {
  if (isNativeApp()) {
    const capacitor = (window as any).Capacitor;
    const platform = capacitor?.getPlatform?.();
    if (platform === 'ios') return 'ios';
    if (platform === 'android') return 'android';
  }
  return 'web';
};

// Get device name
const getDeviceName = (): string => {
  const userAgent = navigator.userAgent;
  if (/iPhone/.test(userAgent)) return 'iPhone';
  if (/iPad/.test(userAgent)) return 'iPad';
  if (/Android/.test(userAgent)) return 'Android Device';
  if (/Windows/.test(userAgent)) return 'Windows PC';
  if (/Mac/.test(userAgent)) return 'Mac';
  if (/Linux/.test(userAgent)) return 'Linux PC';
  return 'Unknown Device';
};

interface UsePushNotificationsOptions {
  onMessage?: (payload: any) => void;
  onTokenRefresh?: (token: string) => void;
}

export const usePushNotifications = (options: UsePushNotificationsOptions = {}) => {
  const { user, session } = useAuth();
  const registeredRef = useRef(false);
  const tokenRef = useRef<string | null>(null);

  // Register FCM token with backend
  const registerToken = useCallback(async (fcmToken: string) => {
    if (!session?.access_token || !fcmToken) return;

    try {
      const { data, error } = await supabase.functions.invoke('register-device', {
        body: {
          fcmToken,
          deviceType: getDeviceType(),
          deviceName: getDeviceName(),
        },
      });

      if (error) {
        console.error('[Push] Failed to register device:', error);
        return;
      }

      console.log('[Push] Device registered:', data);
      tokenRef.current = fcmToken;
      registeredRef.current = true;

      if (options.onTokenRefresh) {
        options.onTokenRefresh(fcmToken);
      }
    } catch (error) {
      console.error('[Push] Registration error:', error);
    }
  }, [session?.access_token, options]);

  // Initialize Firebase and get token (for web)
  const initializeWebPush = useCallback(async () => {
    if (!isPushSupported()) {
      console.log('[Push] Push notifications not supported');
      return null;
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('[Push] Notification permission denied');
        return null;
      }

      // Check if Firebase is initialized (loaded via script tag or npm)
      const firebase = (window as any).firebase;
      if (!firebase?.messaging) {
        console.log('[Push] Firebase messaging not initialized');
        return null;
      }

      const messaging = firebase.messaging();
      
      // Get the FCM token
      const token = await messaging.getToken();
      console.log('[Push] FCM token obtained');
      
      return token;
    } catch (error) {
      console.error('[Push] Error initializing web push:', error);
      return null;
    }
  }, []);

  // Initialize native push (Capacitor)
  const initializeNativePush = useCallback(async () => {
    if (!isNativeApp()) {
      console.log('[Push] Not a native app, skipping native push');
      return null;
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.log('[Push] Native push permission denied');
        return null;
      }

      // Register for push
      await PushNotifications.register();

      // Return a promise that resolves with the token
      return new Promise<string | null>((resolve) => {
        PushNotifications.addListener('registration', (token) => {
          console.log('[Push] Native push registered:', token.value);
          resolve(token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('[Push] Native registration error:', error);
          resolve(null);
        });

        // Set up message handler
        if (options.onMessage) {
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('[Push] Notification received:', notification);
            options.onMessage?.(notification);
          });

          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('[Push] Notification action:', action);
            options.onMessage?.(action.notification);
          });
        }
      });
    } catch (error) {
      console.error('[Push] Native push error:', error);
      return null;
    }
  }, [options]);

  // Main initialization
  const initialize = useCallback(async () => {
    if (!user || registeredRef.current) return;

    let token: string | null = null;

    if (isNativeApp()) {
      token = await initializeNativePush();
    } else {
      token = await initializeWebPush();
    }

    if (token) {
      await registerToken(token);
    }
  }, [user, initializeNativePush, initializeWebPush, registerToken]);

  // Auto-initialize when user is authenticated
  useEffect(() => {
    if (user && !registeredRef.current) {
      // Defer initialization to avoid auth deadlock
      setTimeout(() => {
        initialize();
      }, 1000);
    }

    // Reset on logout
    if (!user) {
      registeredRef.current = false;
      tokenRef.current = null;
    }
  }, [user, initialize]);

  // Manual registration method for external use
  const registerManually = useCallback(async (fcmToken: string) => {
    await registerToken(fcmToken);
  }, [registerToken]);

  // Request permission and initialize
  const requestPermission = useCallback(async () => {
    if (!user) {
      console.log('[Push] User not authenticated');
      return false;
    }

    if (isNativeApp()) {
      const token = await initializeNativePush();
      if (token) {
        await registerToken(token);
        return true;
      }
    } else if (isPushSupported()) {
      const token = await initializeWebPush();
      if (token) {
        await registerToken(token);
        return true;
      }
    }

    return false;
  }, [user, initializeNativePush, initializeWebPush, registerToken]);

  return {
    isSupported: isPushSupported() || isNativeApp(),
    isRegistered: registeredRef.current,
    token: tokenRef.current,
    requestPermission,
    registerManually,
    deviceType: getDeviceType(),
  };
};
