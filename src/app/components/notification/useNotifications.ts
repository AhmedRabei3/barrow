// src/app/components/notification/useNotifications.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationDTO } from "./dto";
import { useWebSocketNotifications } from "@/app/hooks/useSocketNotifications";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { useSession } from "next-auth/react";

interface NotificationsResponse {
  data: NotificationDTO[];
  nextCursor: string | null;
}

interface NotificationCounterResponse {
  unreadCount: number;
}

type NotificationsCacheSnapshot = {
  notifications: NotificationDTO[];
  nextCursor: string | null;
  unreadCount: number;
  hasMore: boolean;
};

let notificationsCache: NotificationsCacheSnapshot = {
  notifications: [],
  nextCursor: null,
  unreadCount: 0,
  hasMore: true,
};

const normalizeNotifications = (list: NotificationDTO[]): NotificationDTO[] => {
  const unique = new Map<string, NotificationDTO>();

  for (const notification of list) {
    if (!notification?.id) continue;
    unique.set(notification.id, notification);
  }

  return Array.from(unique.values()).sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );
};

export const useNotifications = (enabled: boolean) => {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const [notifications, setNotifications] = useState<NotificationDTO[]>(
    notificationsCache.notifications,
  );
  const [nextCursor, setNextCursor] = useState<string | null>(
    notificationsCache.nextCursor,
  );
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(notificationsCache.hasMore);
  const [unreadCount, setUnreadCount] = useState(
    notificationsCache.unreadCount,
  );
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const res = await fetch("/api/notifications/unread-count");
    if (!res.ok) {
      throw new Error(
        t(
          "فشل في جلب عدد الإشعارات غير المقروءة",
          "Failed to fetch unread notifications count",
        ),
      );
    }

    const result: NotificationCounterResponse = await res.json();
    setUnreadCount(Number(result.unreadCount ?? 0));
  }, [isAuthenticated, t]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    notificationsCache = {
      notifications,
      nextCursor,
      unreadCount,
      hasMore,
    };
  }, [hasMore, nextCursor, notifications, unreadCount]);

  const fetchNotifications = useCallback(
    async (cursor?: string, reset = false) => {
      if (!isAuthenticated) {
        if (reset) {
          setNotifications([]);
          setNextCursor(null);
          hasMoreRef.current = false;
          setHasMore(false);
        }
        return;
      }

      if (loadingRef.current || (!hasMoreRef.current && !reset)) return;

      try {
        loadingRef.current = true;
        if (reset && notificationsCache.notifications.length > 0) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }

        const url = new URL("/api/notifications", window.location.origin);
        if (cursor) url.searchParams.set("cursor", cursor);

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error(
            t("فشل في جلب الإشعارات", "Failed to fetch notifications"),
          );
        }

        const result: NotificationsResponse = await res.json();

        setNotifications((prev) =>
          normalizeNotifications(
            reset ? result.data : [...prev, ...result.data],
          ),
        );
        setNextCursor(result.nextCursor);
        const canLoadMore = Boolean(result.nextCursor);
        hasMoreRef.current = canLoadMore;
        setHasMore(canLoadMore);
      } finally {
        loadingRef.current = false;
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [isAuthenticated, t],
  );

  /* تحميل أولي */
  useEffect(() => {
    if (enabled && isAuthenticated) {
      fetchNotifications(undefined, true);
    } else if (!isAuthenticated) {
      setNotifications([]);
      setNextCursor(null);
      setIsRefreshing(false);
      hasMoreRef.current = false;
      setHasMore(false);
      notificationsCache = {
        notifications: [],
        nextCursor: null,
        unreadCount: 0,
        hasMore: false,
      };
    }
  }, [enabled, fetchNotifications, isAuthenticated]);

  /* تحديث عداد غير المقروء دائمًا حتى لو كانت القائمة مغلقة */
  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    const syncUnreadCount = async () => {
      try {
        await fetchUnreadCount();
      } catch {
        // Silent fail: the bell can still update from websocket events.
      }
    };

    syncUnreadCount();
    const onFocus = () => {
      void syncUnreadCount();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncUnreadCount();
      }
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetchUnreadCount, isAuthenticated]);

  /* جلب مسبق لأول دفعة من الإشعارات إذا كان هناك إشعارات غير مقروءة حتى تفتح القائمة فوراً */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (unreadCount <= 0 || notifications.length > 0 || loadingRef.current) {
      return;
    }

    void fetchNotifications(undefined, true);
  }, [fetchNotifications, isAuthenticated, notifications.length, unreadCount]);

  /* 🚀 استقبال الإشعارات الجديدة عبر WebSocket فوراً */
  const handleNewNotification = useCallback(
    (newNotification: NotificationDTO) => {
      if (!newNotification?.id) {
        return;
      }

      setNotifications((prev) => {
        /* تجنب التكرار */
        if (prev.some((n) => n.id === newNotification.id)) {
          return prev;
        }

        return normalizeNotifications([newNotification, ...prev]);
      });

      void fetchUnreadCount();
    },
    [fetchUnreadCount],
  );

  useWebSocketNotifications(handleNewNotification, isAuthenticated);

  /* تعيين كمقروء + إزالة فورية */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });

      if (!res.ok) {
        throw new Error(
          t("فشل تعيين الإشعار كمقروء", "Failed to mark notification as read"),
        );
      }

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    [t],
  );

  const refetch = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    await fetchNotifications(undefined, true);
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount, isAuthenticated]);

  return {
    notifications,
    unreadCount,
    loading,
    isRefreshing,
    hasMore,
    loadMore: () => fetchNotifications(nextCursor || undefined),
    markAsRead,
    refetch,
  };
};
