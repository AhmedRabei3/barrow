"use client";

import { useMemo, useState } from "react";
import { ItemType } from "@prisma/client";
import { FaStar } from "react-icons/fa";
import { AiFillStar } from "react-icons/ai";
import { useSession } from "next-auth/react";
import useLoginModal from "@/app/hooks/useLoginModal";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type ReviewEntry = {
  id: string;
  userId: string;
  rate: number;
  comment?: string | null;
};

interface RatingSectionProps {
  itemId: string;
  itemType: ItemType;
  reviews: ReviewEntry[];
}

const RatingSection = ({ itemId, itemType, reviews }: RatingSectionProps) => {
  const { data: session, status } = useSession();
  const { isArabic } = useAppPreferences();
  const loginModal = useLoginModal();
  const [saving, setSaving] = useState(false);
  const [localReviews, setLocalReviews] = useState<ReviewEntry[]>(
    reviews || [],
  );

  const userId = session?.user?.id;
  const isSessionLoading = status === "loading";

  const { average, count, myRate } = useMemo(() => {
    const countValue = localReviews.length;
    const sum = localReviews.reduce((acc, review) => acc + review.rate, 0);
    const avg = countValue ? sum / countValue : 0;
    const mine = userId
      ? localReviews.find((review) => review.userId === userId)?.rate || 0
      : 0;

    return {
      average: Number(avg.toFixed(1)),
      count: countValue,
      myRate: mine,
    };
  }, [localReviews, userId]);

  const submitRate = async (rate: number) => {
    if (isSessionLoading) {
      return;
    }

    if (!userId) {
      toast(
        (isArabic
          ? "يرجى تسجيل الدخول أولًا"
          : "Please log in first") as string,
      );
      loginModal.onOpen();
      return;
    }

    if (saving) return;

    try {
      setSaving(true);

      const res = await fetch("/api/ratings/item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemType, rate }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        toast.error(
          json?.message ||
            (isArabic ? "فشل حفظ التقييم" : "Failed to save rating"),
        );
        return;
      }

      const saved = json.review as ReviewEntry;

      setLocalReviews((prev) => {
        const exists = prev.some((entry) => entry.id === saved.id);
        if (exists) {
          return prev.map((entry) => (entry.id === saved.id ? saved : entry));
        }
        return [...prev, saved];
      });

      toast.success(isArabic ? "تم حفظ تقييمك" : "Your rating is saved");
    } catch {
      toast.error(isArabic ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="market-panel rounded-[26px] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="market-kicker">{isArabic ? "التقييمات" : "Ratings"}</p>
          <h3 className="mt-2 text-base font-semibold text-white sm:text-lg">
            {isArabic ? "تقييم العنصر" : "Item rating"}
          </h3>
        </div>
        <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300 sm:text-sm">
          {count > 0
            ? `${average.toFixed(1)} (${count})`
            : isArabic
              ? "قيّم العنصر"
              : "Rate item"}
          <AiFillStar className="mx-1 text-yellow-300" />
        </span>
      </div>

      <div className={`mt-4 flex flex-wrap items-center gap-1 ${isArabic ? "rtl" : "ltr"} dark:bg-slate-950/40 p-3`}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= (myRate || Math.round(average));
          return (
            <button
              key={star}
              type="button"
              onClick={() => submitRate(star)}
              disabled={saving || isSessionLoading}
              className="rounded-xl p-2 transition hover:bg-yellow-200/70 disabled:opacity-60"
              aria-label={`${isArabic ? "تقييم" : "Rate"} ${star}`}
            >
              <FaStar
                size={22}
                className={filled ? "text-amber-400" : "text-slate-300"}
              />
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs leading-6 text-slate-400">
        {isSessionLoading
          ? isArabic
            ? "جارٍ التحقق من حالة الحساب..."
            : "Checking account status..."
          : userId
            ? isArabic
              ? "يمكنك تعديل تقييمك بالنقر على عدد النجوم مرة أخرى"
              : "You can update your rating by clicking stars again"
            : isArabic
              ? "لإضافة تقييم، سجّل الدخول أولًا"
              : "Log in first to submit your rating"}
      </p>
    </div>
  );
};

export default RatingSection;
