"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MdOutlineRefresh } from "react-icons/md";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface PurchaseRequest {
  id: string;
  price: number;
  note: string | null;
  createdAt: string;
  buyer: {
    name: string | null;
    email: string;
  };
}

export default function MyPurchaseRequests() {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMyRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/purchase-req/my-req");
      const data = await res.json();

      if (!res.ok) {
        toast.error(
          data.message || t("فشل جلب الطلبات", "Failed to load requests"),
        );
        return;
      }

      setRequests(data);
    } catch {
      toast.error(t("خطأ غير متوقع", "Unexpected error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMyRequests();
  }, [fetchMyRequests]);

  if (loading)
    return (
      <p className="p-6 text-slate-600 dark:text-slate-300">
        {t("جاري تحميل العناصر...", "Loading items...")}
      </p>
    );

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <div className="text-slate-500 dark:text-slate-400 flex flex-col items-center gap-4 py-4">
          <p>
            {t(
              "لا توجد طلبات تشرف عليها حالياً",
              "No requests assigned to you currently",
            )}
          </p>
          <button
            type="button"
            onClick={fetchMyRequests}
            className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-2"
          >
            <MdOutlineRefresh className="text-lg" />
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : (
        requests.map((req) => (
          <div
            key={req.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 space-y-2"
          >
            <div className="flex justify-between">
              <div>
                <p className="font-medium">
                  {req.buyer.name || t("مستخدم", "User")}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {req.buyer.email}
                </p>
              </div>

              <span className="text-xs text-slate-400 dark:text-slate-500">
                {new Date(req.createdAt).toLocaleString()}
              </span>
            </div>

            {req.note && (
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {t("ملاحظة", "Note")}: {req.note}
              </p>
            )}

            <Link
              href={`/admin/purchase-request/${req.id}`}
              className="mt-2 text-sm text-cyan-700 dark:text-cyan-300 hover:underline"
              onClick={() =>
                toast(
                  t(
                    "سيتم لاحقًا فتح صفحة تفاصيل الطلب",
                    "Request details page will open",
                  ),
                )
              }
              // TODO replace with link (/admin/purchase-request/[requestId])
            >
              {t("متابعة الطلب", "Track request")}
            </Link>
          </div>
        ))
      )}
    </div>
  );
}
