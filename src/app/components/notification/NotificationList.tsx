"use client";

import { memo, useEffect, useRef, useMemo, useCallback } from "react";
import { MdOutlineRefresh } from "react-icons/md";
import NotificationItem from "./NotificationItem";
import { NotificationDTO } from "./dto";
import { motion } from "framer-motion";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface Props {
  notifications: NotificationDTO[];
  hasMore: boolean;
  loadMore: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  onRefresh: () => Promise<void> | void;
  isLoading?: boolean;
}

const NotificationList = ({
  notifications,
  hasMore,
  loadMore,
  markAsRead,
  onRefresh,
  isLoading = false,
}: Props) => {
  const { isArabic } = useAppPreferences();
  const bottomRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(false);

  // Memoize listVariants للحد من إعادة الحسابات
  const listVariants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: 0.05,
        },
      },
    }),
    [],
  );

  // Memoize item variants للأداء الأفضل
  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: -10 },
      visible: { opacity: 1, y: 0 },
    }),
    [],
  );

  // تحسين الأداء بتجنب استدعاءات متعددة
  const handleLoadMore = useCallback(async () => {
    if (loadMoreRef.current || isLoading) return;
    loadMoreRef.current = true;
    try {
      await loadMore();
    } finally {
      loadMoreRef.current = false;
    }
  }, [loadMore, isLoading]);

  useEffect(() => {
    if (!hasMore) return;

    // Intersection Observer مع threshold متجاوبة
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px", // تحميل مسبق قبل الوصول للنهاية
      },
    );

    if (bottomRef.current) observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, handleLoadMore]);

  if (notifications.length === 0) {
    return (
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="text-center text-gray-400 py-8 sm:py-12 flex flex-col items-center gap-4"
      >
        <p className="text-sm sm:text-base">
          {isArabic ? "لا يوجد إشعارات" : "No notifications"}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="px-4 py-2 rounded-md border border-neutral-300 hover:bg-neutral-100 text-neutral-700 inline-flex items-center gap-2"
        >
          <MdOutlineRefresh className="text-lg" />
          {isArabic ? "إعادة المحاولة" : "Retry"}
        </button>
      </div>
    );
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="w-full overflow-hidden">
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="visible"
        className="space-y-1 sm:space-y-2"
      >
        {notifications.map((notification, index) => (
          <motion.div
            key={`${notification.id}-${notification.createdAt}-${index}`}
            variants={itemVariants}
          >
            <NotificationItem
              notification={notification}
              markAsRead={markAsRead}
            />
          </motion.div>
        ))}

        {/* Sentinel - Loading indicator */}
        {hasMore && (
          <div
            dir={isArabic ? "rtl" : "ltr"}
            ref={bottomRef}
            className="h-2 flex items-center justify-center pt-2 sm:pt-4"
          >
            {isLoading && (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-300 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-300 rounded-full animate-bounce delay-100" />
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-300 rounded-full animate-bounce delay-200" />
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default memo(NotificationList);
