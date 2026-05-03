"use client";

import { useEffect, useRef } from "react";
import {
  messaging,
  getToken,
  onMessage,
  db,
  firebaseAuth,
} from "../lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

const VAPID_KEY =
  "BKk02EJN6T1ZuZKV0xUx4MHz7Vw1Oz05PCvz5O577a5B1ZNylZ7xJjXk6wU0PR_ezNoCqyVSTIOJr36ot32HTFg";

const refreshUnreadBadge = async () => {
  try {
    const response = await fetch("/api/chat/unread-count", {
      cache: "no-store",
    });

    if (!response.ok) return;

    const data = (await response.json()) as { unreadCount?: number };
    const unreadCount = Number(data.unreadCount ?? 0);

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
    if (!messaging || !userId || isInitialized.current) return;

    isInitialized.current = true;

    let unsubscribe: (() => void) | null = null;

    const signInFirebaseClient = async () => {
      try {
        if (firebaseAuth.currentUser?.uid === userId) return true;

        const response = await fetch("/api/chat/firebase-token", {
          cache: "no-store",
        });

        if (!response.ok) return false;

        const data = (await response.json()) as { token?: string };
        if (!data.token) return false;

        await signInWithCustomToken(firebaseAuth, data.token);
        return true;
      } catch (err) {
        console.error("Firebase auth error:", err);
        return false;
      }
    };

    const setupFCM = async () => {
      try {
        // ⚠️ يفضل ربط هذا بزر، لكن نتركه هنا مؤقتاً
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const signedIn = await signInFirebaseClient();
        if (!signedIn) return;

        if (!messaging) return;
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
        });

        if (!token) return;

        // ✅ دعم multi-device
        await setDoc(
          doc(db, "users", userId),
          {
            fcmTokens: arrayUnion(token),
            fcmToken: token,
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );

        console.log("FCM Token saved:", token);

        await refreshUnreadBadge();

        // ✅ listener مع cleanup
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
                `conversationId=${encodeURIComponent(conversationId)}`
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
    void refreshUnreadBadge();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId, isArabic]);

  return <>{children}</>;
}
