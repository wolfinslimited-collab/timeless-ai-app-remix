// Facebook Pixel tracking utilities
// Pixel ID: 673958775792141

declare global {
  interface Window {
    fbq: (
      action: string,
      event: string,
      params?: Record<string, unknown>
    ) => void;
  }
}

/**
 * Track a Facebook Pixel event
 */
export const trackEvent = (
  event: string,
  params?: Record<string, unknown>
): void => {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', event, params);
    console.log(`[FB Pixel] Tracked: ${event}`, params);
  }
};

/**
 * Track user registration/sign-up
 */
export const trackSignUp = (params?: {
  content_name?: string;
  status?: string;
}): void => {
  trackEvent('CompleteRegistration', {
    content_name: params?.content_name || 'User Sign Up',
    status: params?.status || 'success',
  });
};

/**
 * Track subscription purchase
 */
export const trackSubscribe = (params: {
  value: number;
  currency?: string;
  predicted_ltv?: number;
}): void => {
  trackEvent('Subscribe', {
    value: params.value,
    currency: params.currency || 'USD',
    predicted_ltv: params.predicted_ltv,
  });
};

/**
 * Track credit package purchase
 */
export const trackPurchase = (params: {
  value: number;
  currency?: string;
  content_name?: string;
  content_type?: string;
}): void => {
  trackEvent('Purchase', {
    value: params.value,
    currency: params.currency || 'USD',
    content_name: params.content_name,
    content_type: params.content_type || 'credits',
  });
};

/**
 * Track when user initiates checkout
 */
export const trackInitiateCheckout = (params?: {
  value?: number;
  currency?: string;
  content_name?: string;
}): void => {
  trackEvent('InitiateCheckout', params);
};
