"use client";

import { useState } from "react";
import { MdShare, MdCheck } from "react-icons/md";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import toast from "react-hot-toast";

interface ShareButtonProps {
  /** عنوان العنصر لمشاركته في النص */
  title: string;
  className?: string;
}

/**
 * زر مشاركة رابط صفحة التفاصيل.
 * يستخدم Web Share API على الجوال إن كانت متاحة،
 * وإلا ينسخ الرابط للحافظة.
 */
const ShareButton = ({ title, className = "" }: ShareButtonProps) => {
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
      type="button"
      onClick={handleShare}
      aria-label={isArabic ? "مشاركة الرابط" : "Share link"}
      title={isArabic ? "مشاركة الرابط" : "Share link"}
      className={`
        inline-flex items-center gap-2
        rounded-xl
        border border-cyan-300/40 dark:border-cyan-300/35
        bg-slate-950/45 dark:bg-slate-950/55
        px-3.5 py-2
        text-[13px] font-semibold
        text-cyan-100 dark:text-cyan-100
        backdrop-blur-sm
        transition-all duration-200
        hover:-translate-y-0.5 hover:bg-slate-950/60 dark:hover:bg-slate-950/70
        hover:border-cyan-200/55 dark:hover:border-cyan-200/50
        hover:text-cyan-50
        active:translate-y-0 active:scale-[0.98]
        shadow-[0_8px_20px_rgba(2,132,199,0.22)]
        ${className}
      `}
    >
      {copied ? (
        <MdCheck size={16} className="text-emerald-300" />
      ) : (
        <MdShare size={16} className="text-cyan-200" />
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
