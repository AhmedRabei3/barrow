"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Actions } from "./Actions";
import toast from "react-hot-toast";
import { Card, Info } from "./Card";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface PurchaseRequestDetails {
  status: string;
  createdAt: string;
  buyer: {
    name: string | null;
    email: string;
  };
  phoneNumber: string;
  offeredPrice: number | null;
  buyerNote?: string | null;
}

export default function PurchaseRequestDetailsPage() {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const { requestId } = useParams();
  const [request, setRequest] = useState<PurchaseRequestDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/purchase-req/details/${requestId}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(
          data.message ||
            t("فشل جلب تفاصيل الطلب", "Failed to load request details"),
        );
        return;
      }
      setRequest(data as PurchaseRequestDetails);
    } catch {
      toast.error(t("خطأ غير متوقع", "Unexpected error"));
    } finally {
      setLoading(false);
    }
  }, [requestId, t]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  if (loading)
    return (
      <p className="p-6 text-slate-600 dark:text-slate-300">
        {t("جاري تحميل العناصر...", "Loading items...")}
      </p>
    );
  if (!request) return null;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-4xl text-right">
      <h1 className="text-xl font-bold text-cyan-900 dark:text-cyan-300 text-right">
        {t("متابعة طلب الشراء", "Track purchase request")}
      </h1>

      {/* معلومات الطلب */}
      <Card title={t("معلومات الطلب", "Request info")}>
        <Info label={t("الحالة", "Status")} value={request.status} />
        <Info
          label={t("تاريخ الإنشاء", "Created at")}
          value={new Date(request.createdAt).toLocaleString(
            isArabic ? "ar" : "en-US",
          )}
        />
      </Card>

      {/* المشتري */}
      <Card title={t("بيانات المشتري", "Buyer details")}>
        <Info label={t("الاسم", "Name")} value={request.buyer.name || "—"} />
        <Info label={t("البريد", "Email")} value={request.buyer.email} />
        <Info
          label={t("رقم الهاتف", "Phone number")}
          value={request.phoneNumber}
        />
      </Card>

      {/* العرض */}
      <Card title={t("العرض", "Offer")}>
        <Info
          label={t("السعر المقترح", "Offered price")}
          value={request.offeredPrice ?? t("غير محدد", "Not specified")}
        />
        {request.buyerNote && (
          <p className="text-sm text-slate-700 dark:text-slate-300">
            {t("ملاحظة", "Note")}: {request.buyerNote}
          </p>
        )}
      </Card>

      {/* الإجراءات */}
      <Actions request={request} />
    </div>
  );
}

/* =====================
   Components
===================== */
