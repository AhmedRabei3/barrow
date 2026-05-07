"use client";

import { useState } from "react";
import { MdShare,  MdCheck } from "react-icons/md";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import toast from "react-hot-toast";

interface ShareButtonProps {
  /** عنوان العنصر لمشاركته في النص */
  title: string;
}

/**
 * زر مشاركة رابط صفحة التفاصيل.
 * يستخدم Web Share API على الجوال إن كانت متاحة،
 * وإلا ينسخ الرابط للحافظة.
 */
const ShareButton = ({ title }: ShareButtonProps) => {
  const { isArabic } = useAppPreferences();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";

    // استخدام Web Share API إذا كانت متاحة (الجوال)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
        return;
      } catch {
        // المستخدم ألغى المشاركة — لا نفعل شيئاً
        return;
      }
    }

    // نسخ الرابط للحافظة كبديل
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(
        isArabic ? "تم نسخ رابط العنصر" : "Link copied to clipboard",
      );
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error(isArabic ? "تعذر نسخ الرابط" : "Failed to copy link");
    }
  };

  return (
    <button
      onClick={handleShare}
      aria-label={isArabic ? "مشاركة الرابط" : "Share link"}
      title={isArabic ? "مشاركة الرابط" : "Share link"}
      className="
        inline-flex items-center gap-1.5
        rounded-xl
        border border-blue-300/70 dark:border-sky-500/30
        bg-blue-50/90 dark:bg-slate-900/80
        px-3 py-2
        text-xs font-semibold
        text-blue-700 dark:text-sky-300
        transition-all duration-200
        hover:bg-blue-100 dark:hover:bg-slate-800
        hover:border-blue-400 dark:hover:border-sky-400
        active:scale-95
        shadow-sm
      "
    >
      {copied ? (
        <MdCheck size={16} className="text-emerald-500" />
      ) : (
        <MdShare size={16} />
      )}
      <span>
        {copied
          ? isArabic
            ? "تم النسخ!"
            : "Copied!"
          : isArabic
            ? "مشاركة"
            : "Share"}
      </span>
    </button>
  );
};

export default ShareButton;
