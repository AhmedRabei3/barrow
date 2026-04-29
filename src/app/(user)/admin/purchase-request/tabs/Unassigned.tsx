"use client";

import { useCallback, useEffect, useState } from "react";
import { MdOutlineRefresh } from "react-icons/md";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { ARABIC_LATIN_DIGITS_LOCALE } from "@/lib/locale-format";

interface PurchaseRequest {
  id: string;
  price: number;
  note: string | null;
  createdAt: string;
  buyer: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function Unassigned() {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/purchase-req/unassigned");
      const data = await res.json();

      if (!res.ok) {
        toast.error(
          data.message || t("فشل جلب الطلبات", "Failed to load requests"),
        );
        return;
      }

      setRequests(data.data);
    } catch {
      toast.error(t("حدث خطأ غير متوقع", "Unexpected error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const claimRequest = async (requestId: string) => {
    const res = await fetch("/api/purchase/admin_claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(
        data.message || t("تعذر استلام الطلب", "Failed to claim request"),
      );
      return;
    }

    toast.success(t("تم استلام الطلب بنجاح", "Request claimed successfully"));
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  };

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  if (loading) {
    return (
      <p className="p-6 text-slate-600 dark:text-slate-300">
        {t("جاري تحميل العناصر...", "Loading items...")}
      </p>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl font-bold text-emerald-900 dark:text-emerald-300 ">
        {t("طلبات الشراء الجديدة", "New purchase requests")}
      </h1>

      {requests.length === 0 ? (
        <div className="text-slate-500 dark:text-slate-400 flex flex-col items-center gap-4 py-4">
          <p>
            {t(
              "لا توجد طلبات بانتظار الإشراف",
              "No requests pending admin assignment",
            )}
          </p>
          <button
            type="button"
            onClick={fetchRequests}
            className="px-4 py-2 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 inline-flex items-center gap-2"
          >
            <MdOutlineRefresh className="text-lg" />
            {t("إعادة المحاولة", "Retry")}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl shadow-sm w-full max-w-100 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            >
              <div className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">
                      {request.buyer.name || t("مستخدم", "User")}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {request.buyer.email}
                    </p>
                  </div>
                  <button
                    className="
                     p-2 shadow-md bg-emerald-500 
                     hover:bg-emerald-600 
                     rounded-md 
                     text-white
                    "
                    onClick={() => claimRequest(request.id)}
                  >
                    {t("استلام الطلب", "Claim request")}
                  </button>
                  <button
                    className="p-2 shadow-md bg-rose-500 hover:bg-rose-600 rounded-md text-white"
                    onClick={() => claimRequest(request.id)}
                  >
                    {t("حذف الطلب", "Delete request")}
                  </button>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 flex justify-self-end">
                  {new Date(request.createdAt).toLocaleString(
                    ARABIC_LATIN_DIGITS_LOCALE,
                  )}
                </span>

                <div className="text-sm text-slate-700 dark:text-slate-300">
                  {request.note && (
                    <p>
                      {t("ملاحظة", "Note")}: {request.note}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
