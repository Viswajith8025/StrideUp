export type PushPermissionState =
  | "unsupported"
  | "ios-install-required"
  | "default"
  | "granted"
  | "denied";

export type PushSupportState = {
  supported: boolean;
  permission: PushPermissionState;
  reason?: string;
};

export function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function getPushSupportState(): PushSupportState {
  if (typeof window === "undefined") {
    return { supported: false, permission: "unsupported", reason: "Not in browser" };
  }

  if (!("Notification" in window) || !("PushManager" in window) || !("serviceWorker" in navigator)) {
    return {
      supported: false,
      permission: "unsupported",
      reason: "Push notifications are not supported in this browser.",
    };
  }

  if (isIos() && !isStandalonePwa()) {
    return {
      supported: false,
      permission: "ios-install-required",
      reason: "On iPhone, install StrideUp to your Home Screen first, then enable push notifications here.",
    };
  }

  const permission = Notification.permission as PushPermissionState;
  return { supported: true, permission };
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function subscriptionToRow(
  userId: string,
  subscription: PushSubscription
): {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
  last_seen_at: string;
} {
  const json = subscription.toJSON();
  const keys = json.keys;
  if (!keys?.p256dh || !keys.auth) {
    throw new Error("Push subscription is missing encryption keys");
  }
  return {
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: navigator.userAgent,
    last_seen_at: new Date().toISOString(),
  };
}
