"use client";

import { memo, useRef, useState } from "react";
import useClickOutside from "@/app/hooks/useOutsideClick";
import NotificationList from "./NotificationList";
import { useNotifications } from "./useNotifications";
import { motion, AnimatePresence } from "framer-motion";
import BellBtn from "./BellBtn";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const NotificationBell = ({
  hiddenWhenEmpty = false,
}: {
  hiddenWhenEmpty?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { isArabic } = useAppPreferences();

  useClickOutside(ref, () => setOpen(false));

  const {
    notifications,
    loadMore,
    hasMore,
    loading,
    isRefreshing,
    refetch,
    markAsRead,
    unreadCount,
  } = useNotifications(open);

  // On mobile: only render when there are unread notifications
  if (hiddenWhenEmpty && unreadCount === 0) return null;

  return (
    <div ref={ref}>
      <BellBtn setOpen={setOpen} unreadCount={unreadCount} />
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="
            absolute -right-2 sm:right-0 mt-5 w-80 sm:w-96
            rounded-xl shadow-lg bg-white dark:bg-slate-900
            z-50 flex flex-col max-h-96 max-w-[calc(100vw-1rem)]
          "
          >
            <div className="flex-1 overflow-y-auto px-3 py-2">
              <NotificationList
                notifications={notifications}
                hasMore={hasMore}
                loadMore={loadMore}
                markAsRead={markAsRead} // ✅ من الهوك
                onRefresh={refetch}
                isLoading={loading}
                isRefreshing={isRefreshing}
              />
            </div>

            {hasMore && (
              <div className="border-t px-3 py-2">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full text-sm text-emerald-600 hover:underline disabled:opacity-50"
                >
                  {loading
                    ? isArabic
                      ? "جاري التحميل..."
                      : "Loading..."
                    : isArabic
                      ? "عرض المزيد"
                      : "Show more"}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(NotificationBell);
