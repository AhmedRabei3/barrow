"use client";

import { useEffect, useRef } from "react";
import { messaging, getToken, onMessage } from "../lib/firebase";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

const VAPID_KEY =
  "BKk02EJN6T1ZuZKV0xUx4MHz7Vw1Oz05PCvz5O577a5B1ZNylZ7xJjXk6wU0PR_ezNoCqyVSTIOJr36ot32HTFg";

const updateDocumentTitleUnreadBadge = (unreadCount: number) => {
  if (typeof document === "undefined") {
    return;
  }

  const cleaned = document.title.replace(/^\(\d+\)\s*/, "").trim();
  const baseTitle = cleaned.length > 0 ? cleaned : "Barrow";

  document.title =
    unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;
};

const refreshUnreadBadge = async () => {
  try {
    const response = await fetch("/api/unread-badge-count", {
      cache: "no-store",
    });

    if (!response.ok) return;

    const data = (await response.json()) as { unreadCount?: number };
    const unreadCount = Number(data.unreadCount ?? 0);
    updateDocumentTitleUnreadBadge(unreadCount);

    if ("setAppBadge" in navigator) {
      if (unreadCount > 0) {
        await (
          navigator as Navigator & {
            setAppBadge: (value?: number) => Promise<void>;
          }
        ).setAppBadge(unreadCount);
      } else if ("clearAppBadge" in navigator) {
        await (
          navigator as Navigator & {
            clearAppBadge: () => Promise<void>;
          }
        ).clearAppBadge();
      }
    }
  } catch (err) {
    console.error("Badge update error:", err);
  }
};

export default function FCMProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { isArabic } = useAppPreferences();

  const isInitialized = useRef(false);

  useEffect(() => {
    if (!userId || isInitialized.current) return;

    isInitialized.current = true;

    let unsubscribe: (() => void) | null = null;

    const setupFCM = async () => {
      try {
        await refreshUnreadBadge();

        if (!messaging) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!token) return;

        // Save token to PostgreSQL via API — no Firestore writes.
        await fetch("/api/chat/register-fcm-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        unsubscribe = onMessage(messaging, (payload) => {
          const title =
            payload?.notification?.title ??
            (isArabic ? "لديك رسالة جديدة" : "New message");

          const body =
            payload?.notification?.body ??
            (isArabic ? "لديك رسالة جديدة" : "You have a new message");

          const conversationId = payload?.data?.conversationId;

          toast(`${title}: ${body}`);

          if (conversationId) {
            const isOnConversation =
              typeof window !== "undefined" &&
              window.location.pathname === "/messages" &&
              window.location.search.includes(
                `conversationId=${encodeURIComponent(conversationId)}`,
              );

            if (isOnConversation) {
              void fetch("/api/chat/messages/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ conversationId }),
              }).finally(() => {
                void refreshUnreadBadge();
              });
              return;
            }
          }

          void refreshUnreadBadge();
        });
      } catch (err) {
        console.error("FCM setup error:", err);
      }
    };

    setupFCM();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, isArabic]);

  useEffect(() => {
    const handleBadgeRefresh = () => {
      void refreshUnreadBadge();
    };

    window.addEventListener("app-badge:refresh", handleBadgeRefresh);

    return () => {
      window.removeEventListener("app-badge:refresh", handleBadgeRefresh);
    };
  }, []);

  return <>{children}</>;
}
