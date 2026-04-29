"use client";

import { memo } from "react";
import { NotificationType } from "@prisma/client";
import clsx from "clsx";
import SetReadBtn from "./SetReadBtn";
import { DynamicIcon } from "../addCategory/IconSetter";
import {
  extractItemModerationTarget,
  extractRequestId,
  extractShamCashActivationRequestId,
  extractShamCashRequestId,
} from "./notificationHelper";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { getUiLocale } from "@/lib/locale-format";

const typeStyles: Record<NotificationType, string> = {
  INFO: "border-blue-400 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/50",
  PURCHASEREQUEST:
    "border-emerald-500 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/50",
  WARNING:
    "border-yellow-500 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/50",
  ERROR: "border-red-500 bg-red-50 dark:border-red-700 dark:bg-red-900/50",
};

interface Props {
  notification: {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    isRead: boolean;
    createdAt: string;
  };
  markAsRead: (id: string) => Promise<void>;
}

const NotificationItem = ({ notification, markAsRead }: Props) => {
  const { isArabic } = useAppPreferences();
  const { title, message, type, isRead, createdAt } = notification;
  const requestId =
    type === "PURCHASEREQUEST" ? extractRequestId(message) : null;
  const shamCashRequestId = extractShamCashRequestId(message, title);
  const shamCashActivationRequestId = extractShamCashActivationRequestId(
    message,
    title,
  );
  const moderationTarget = extractItemModerationTarget(message, title);
  const hasShamCashQueueLink = Boolean(shamCashRequestId);
  const hasShamCashActivationLink = Boolean(shamCashActivationRequestId);
  const hasModerationLink = Boolean(moderationTarget?.itemId);
  const shamCashQueueHref = shamCashRequestId
    ? `/admin?page=shamcash-payout-jobs&manualRequestId=${shamCashRequestId}`
    : null;
  const shamCashActivationHref = shamCashActivationRequestId
    ? `/admin?page=shamcash-activation-requests&activationRequestId=${shamCashActivationRequestId}`
    : null;
  const moderationHref =
    moderationTarget?.itemId && moderationTarget.itemType
      ? `/admin?page=image-moderation&itemType=${moderationTarget.itemType}&itemId=${moderationTarget.itemId}`
      : null;

  const navigateTo = (href?: string | null) => {
    if (!href || typeof window === "undefined") return;
    window.location.assign(href);
  };

  const openShamCashQueue = () => {
    navigateTo(shamCashQueueHref);
  };

  const openShamCashActivationRequest = () => {
    navigateTo(shamCashActivationHref);
  };

  const openModerationTarget = () => {
    navigateTo(moderationHref);
  };

  const claimRequest = async () => {
    if (!requestId) return;

    const res = await fetch("/api/purchase/admin_claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(
        data.message ||
          (isArabic ? "فشل استلام الطلب" : "Failed to claim request"),
      );
      return;
    }

    toast.success(
      isArabic
        ? "تم استلام الطلب وأصبحتَ المشرف عليه"
        : "Request claimed successfully",
    );
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onClick={
        hasModerationLink
          ? openModerationTarget
          : hasShamCashActivationLink
            ? openShamCashActivationRequest
            : hasShamCashQueueLink
              ? openShamCashQueue
              : undefined
      }
      className={clsx(
        "p-4 rounded-lg border-l-4 shadow-sm",
        typeStyles[type],
        !isRead && "ring-1 ring-emerald-300",
        (hasShamCashQueueLink ||
          hasShamCashActivationLink ||
          hasModerationLink) &&
          "cursor-pointer",
      )}
    >
      <div className="flex justify-between items-start">
        <h4 className="font-semibold text-gray-800 dark:text-slate-200">
          {title}
        </h4>
        <span className="text-xs text-gray-500 dark:text-slate-400">
          {new Date(createdAt).toLocaleString(getUiLocale(isArabic))}
        </span>
      </div>

      <p
        className="mt-1 text-sm
       text-gray-700 
       dark:text-slate-200
       dark:before:bg-slate-700/50
       dark:bg-gray-700/50
       dark:hover:bg-gray-700/70
       whitespace-pre-line"
      >
        {message}
      </p>
      {!isRead ? (
        <div
          className="w-full mt-3"
          onClick={(event) => event.stopPropagation()}
        >
          <span
            className={clsx(
              "flex w-fit text-xs p-2 rounded-md text-rose-600 font-medium bg-rose-200 shadow-md hover:cursor-pointer",
              isArabic ? "mr-auto" : "ml-auto",
            )}
          >
            <SetReadBtn
              notificationId={notification.id}
              onMarkAsRead={markAsRead}
            />
          </span>
        </div>
      ) : (
        <div className="w-full mt-3">
          <span
            className={clsx(
              "flex w-fit p-2 text-xs text-emerald-600 rounded-md shadow-md font-medium gap-2 items-center bg-emerald-200",
              isArabic ? "mr-auto" : "ml-auto",
            )}
          >
            <DynamicIcon iconName="MdDoneAll" />
            {isArabic ? "مقروء" : "Read"}
          </span>
        </div>
      )}
      {notification.type === "PURCHASEREQUEST" && requestId && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            claimRequest();
          }}
          className="mt-3 w-full text-sm text-emerald-600 hover:underline"
        >
          {isArabic ? "متابعة الطلب" : "Track request"}
        </button>
      )}

      {hasShamCashQueueLink && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            openShamCashQueue();
          }}
          className="mt-3 w-full text-sm text-cyan-700 hover:underline"
        >
          {isArabic ? "متابعة طلب السحب" : "Open withdrawal queue request"}
        </button>
      )}

      {hasShamCashActivationLink && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            openShamCashActivationRequest();
          }}
          className="mt-3 w-full text-sm text-cyan-700 hover:underline"
        >
          {isArabic
            ? "فتح طلب تفعيل شام كاش"
            : "Open ShamCash activation request"}
        </button>
      )}

      {hasModerationLink && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            openModerationTarget();
          }}
          className="mt-3 w-full text-sm text-cyan-700 hover:underline"
        >
          {isArabic ? "فتح مراجعة العنصر" : "Open item review"}
        </button>
      )}
    </motion.div>
  );
};

export default memo(NotificationItem);
