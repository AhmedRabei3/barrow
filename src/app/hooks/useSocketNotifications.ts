"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { NotificationType } from "@prisma/client";
import {
  closeWebSocket,
  initializeWebSocket,
  getWebSocket,
} from "@/lib/socketClient";

export interface NotificationPayload {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  createdAt: string;
  isRead: boolean;
}

/**
 * Hook للاستماع على الإشعارات الجديدة عبر WebSocket
 * اتصال فوري تماماً في الوقت الحقيقي
 */
export const useWebSocketNotifications = (
  onNewNotification?: (notification: NotificationPayload) => void,
  enabled = true,
) => {
  const { data: session, status } = useSession();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    if (status === "loading") {
      return;
    }

    if (!session?.user?.id) {
      if (status === "unauthenticated") {
        console.log("⚠️ No session user ID available");
        closeWebSocket();
      }
      setConnected(false);
      return;
    }

    /* تهيئة WebSocket */
    const ws = initializeWebSocket(session.user.id);

    if (
      ws?.readyState === WebSocket.OPEN ||
      ws?.readyState === WebSocket.CONNECTING
    ) {
      setConnected(true);
    }

    /* الاستماع للإشعارات الجديدة */
    const handleNotification = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail && onNewNotification) {
        onNewNotification(customEvent.detail);
      }
    };

    window.addEventListener("notification", handleNotification);

    const currentWs = getWebSocket();
    setConnected(currentWs?.readyState === WebSocket.OPEN);

    return () => {
      window.removeEventListener("notification", handleNotification);
    };
  }, [enabled, session?.user?.id, status, onNewNotification]);

  return { connected };
};
