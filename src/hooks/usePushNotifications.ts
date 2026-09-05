"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getPushSupportState,
  subscriptionToRow,
  urlBase64ToUint8Array,
  type PushPermissionState,
  type PushSupportState,
} from "@/lib/push/support";
import type { PushCategory } from "@/lib/push/categories";

export function usePushNotifications(userId: string | undefined) {
  const [support, setSupport] = useState<PushSupportState>(() => getPushSupportState());
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const refreshSupport = useCallback(() => {
    setSupport(getPushSupportState());
  }, []);

  const syncSubscriptionState = useCallback(async () => {
    if (!userId || !support.supported) {
      setSubscribed(false);
      setLoading(false);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();

      if (!existing) {
        setSubscribed(false);
        setLoading(false);
        return;
      }

      const row = subscriptionToRow(userId, existing);
      await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
      setSubscribed(true);
    } catch (error) {
      console.error("Failed to sync push subscription:", error);
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [userId, support.supported, supabase]);

  useEffect(() => {
    refreshSupport();
  }, [refreshSupport]);

  useEffect(() => {
    syncSubscriptionState();
  }, [syncSubscriptionState]);

  const subscribe = useCallback(async (): Promise<PushPermissionState> => {
    if (!userId) throw new Error("Sign in to enable push notifications");

    const currentSupport = getPushSupportState();
    setSupport(currentSupport);
    if (!currentSupport.supported) {
      throw new Error(currentSupport.reason ?? "Push notifications are not supported");
    }

    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      refreshSupport();

      if (permission !== "granted") {
        return permission as PushPermissionState;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("Push is not configured (missing VAPID public key)");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const row = subscriptionToRow(userId, subscription);
      const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
      if (error) throw error;

      setSubscribed(true);
      return "granted";
    } finally {
      setBusy(false);
    }
  }, [userId, refreshSupport, supabase]);

  const unsubscribe = useCallback(async () => {
    if (!userId) return;

    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }

      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, [userId, supabase]);

  const sendTestNotification = useCallback(async () => {
    if (!userId) throw new Error("Sign in to send a test notification");

    const { error } = await supabase.functions.invoke("send-push", {
      body: {
        test: true,
        title: "StrideUp test",
        body: "Push notifications are working.",
        url: "/home",
        tag: "strideup-test",
      },
    });

    if (error) throw error;
  }, [userId, supabase]);

  const updateCategoryPref = useCallback(
    async (category: PushCategory, enabled: boolean) => {
      if (!userId) return;
      const { error } = await supabase
        .from("app_settings")
        .update({ [category]: enabled })
        .eq("user_id", userId);
      if (error) throw error;
    },
    [userId, supabase]
  );

  return {
    support,
    subscribed,
    loading,
    busy,
    subscribe,
    unsubscribe,
    sendTestNotification,
    updateCategoryPref,
    refreshSupport,
    syncSubscriptionState,
  };
}
