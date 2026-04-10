"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { request } from "@/app/utils/axios";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type RequestStatus =
  | "PENDING"
  | "VERIFIED"
  | "REJECTED"
  | "ADMIN_REVIEW"
  | "ACTIVATED";

type ActivationRequest = {
  id: string;
  userId: string;
  txNumber: string;
  amount: number;
  status: RequestStatus;
  adminNote?: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

type RequestsTab = "REVIEWED" | "NEW";

type ShamCashActivationRequestsPanelProps = {
  focusActivationRequestId?: string;
};

const STATUS_LABELS: Record<RequestStatus, { ar: string; en: string }> = {
  PENDING: { ar: "بانتظار مراجعة الأدمن", en: "Waiting for admin review" },
  VERIFIED: { ar: "تم التحقق", en: "Verified" },
  REJECTED: { ar: "مرفوض", en: "Rejected" },
  ADMIN_REVIEW: { ar: "قيد مراجعة الأدمن", en: "Admin review" },
  ACTIVATED: { ar: "تم التفعيل", en: "Activated" },
};

const reviewedStatuses: RequestStatus[] = ["ACTIVATED", "REJECTED"];

export default function ShamCashActivationRequestsPanel({
  focusActivationRequestId,
}: ShamCashActivationRequestsPanelProps) {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [requests, setRequests] = useState<ActivationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RequestsTab>(
    focusActivationRequestId ? "NEW" : "REVIEWED",
  );
  const [actionLoadingId, setActionLoadingId] = useState("");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await request.get(
        "/api/admin/shamcash-activation-requests",
      );
      setRequests(response.data?.requests || []);
    } catch (error) {
      console.error("Failed to load activation requests", error);
      toast.error(
        t(
          "فشل تحميل طلبات تفعيل شام كاش",
          "Failed to load ShamCash activation requests",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const groupedRequests = useMemo(() => {
    const reviewed = requests.filter((entry) =>
      reviewedStatuses.includes(entry.status),
    );
    const fresh = requests.filter(
      (entry) => !reviewedStatuses.includes(entry.status),
    );
    return { reviewed, fresh };
  }, [requests]);

  const visibleRequests =
    activeTab === "REVIEWED" ? groupedRequests.reviewed : groupedRequests.fresh;

  const focusedRequestExists = useMemo(
    () =>
      Boolean(
        focusActivationRequestId &&
        requests.some((entry) => entry.id === focusActivationRequestId),
      ),
    [focusActivationRequestId, requests],
  );

  useEffect(() => {
    if (!focusActivationRequestId) {
      return;
    }

    setActiveTab(
      reviewedStatuses.includes(
        requests.find((entry) => entry.id === focusActivationRequestId)
          ?.status || "PENDING",
      )
        ? "REVIEWED"
        : "NEW",
    );
  }, [focusActivationRequestId, requests]);

  useEffect(() => {
    if (!focusActivationRequestId || !focusedRequestExists) {
      return;
    }

    const timer = window.setTimeout(() => {
      const element = document.querySelector(
        `[data-activation-request-id="${focusActivationRequestId}"]`,
      );

      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 150);

    return () => window.clearTimeout(timer);
  }, [
    activeTab,
    focusActivationRequestId,
    focusedRequestExists,
    visibleRequests,
  ]);

  const handleApprove = async (entry: ActivationRequest) => {
    try {
      setActionLoadingId(entry.id);
      await request.post("/api/admin/shamcash-activation-requests/approve", {
        id: entry.id,
      });

      setRequests((current) =>
        current.map((item) =>
          item.id === entry.id ? { ...item, status: "ACTIVATED" } : item,
        ),
      );

      toast.success(
        t(
          "تم تفعيل الحساب ونقل الطلب إلى تمت المراجعة",
          "Account activated and request moved to reviewed",
        ),
      );
      setActiveTab("REVIEWED");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("تعذر تفعيل الحساب", "Failed to activate account"),
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const handleReject = async (entry: ActivationRequest) => {
    const reason =
      window.prompt(
        t(
          "سبب رفض التفعيل لعدم وجود عملية دفع حقيقية (اختياري)",
          "Reason for rejection because no real payment was found (optional)",
        ),
      ) || "";

    try {
      setActionLoadingId(entry.id);
      await request.post("/api/admin/shamcash-activation-requests/reject", {
        id: entry.id,
        reason,
      });

      setRequests((current) =>
        current.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                status: "REJECTED",
                adminNote: reason || item.adminNote,
              }
            : item,
        ),
      );

      toast.success(
        t(
          "تم رفض التفعيل ونقل الطلب إلى تمت المراجعة",
          "Activation rejected and request moved to reviewed",
        ),
      );
      setActiveTab("REVIEWED");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("تعذر رفض الطلب", "Failed to reject request"),
      );
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <section className="space-y-5">
      <div className="admin-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="admin-kicker">
              {t("طلبات التفعيل", "Activation review")}
            </div>
            <h3 className="mt-2 text-lg font-bold text-white">
              {t("طلبات التفعيل", "Activation requests")}
            </h3>
            <p className="text-sm text-slate-400">
              {t(
                "تفعيل الحساب أو رفضه بعد التحقق اليدوي، ثم نقل الطلب مباشرة إلى تمت المراجعة.",
                "Activate or reject the account after manual review, then move the request directly to reviewed.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("REVIEWED")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "REVIEWED"
                  ? "admin-tab admin-tab-active"
                  : "admin-tab"
              }`}
            >
              {t("تمت المراجعة", "Reviewed")} ({groupedRequests.reviewed.length}
              )
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("NEW")}
              className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === "NEW" ? "admin-tab admin-tab-active" : "admin-tab"
              }`}
            >
              {t("الطلبات الجديدة", "New requests")} (
              {groupedRequests.fresh.length})
            </button>
          </div>
        </div>
      </div>

      <div className="admin-card rounded-3xl p-3 sm:p-4">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            {t("جاري تحميل الطلبات...", "Loading requests...")}
          </div>
        ) : visibleRequests.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            {activeTab === "REVIEWED"
              ? t("لا توجد طلبات تمت مراجعتها", "No reviewed requests")
              : t("لا توجد طلبات جديدة", "No new requests")}
          </div>
        ) : (
          <div className="admin-table-shell overflow-x-auto rounded-2xl">
            <table className="admin-table min-w-230 text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-right">
                    {t("المستخدم", "User")}
                  </th>
                  <th className="px-4 py-3 text-right">
                    {t("رقم العملية", "Transaction")}
                  </th>
                  <th className="px-4 py-3 text-right">
                    {t("المبلغ", "Amount")}
                  </th>
                  <th className="px-4 py-3 text-right">
                    {t("الحالة", "Status")}
                  </th>
                  <th className="px-4 py-3 text-right">
                    {t("ملاحظات", "Notes")}
                  </th>
                  <th className="px-4 py-3 text-right">
                    {t("التاريخ", "Date")}
                  </th>
                  <th className="px-4 py-3 text-right">
                    {t("الإجراء", "Action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleRequests.map((entry) => {
                  const isReviewed = reviewedStatuses.includes(entry.status);
                  const statusLabel = STATUS_LABELS[entry.status];

                  return (
                    <tr
                      key={entry.id}
                      data-activation-request-id={entry.id}
                      className={`align-top ${
                        focusActivationRequestId &&
                        entry.id === focusActivationRequestId
                          ? "bg-cyan-500/10 ring-1 ring-inset ring-cyan-400/40"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-100">
                          {entry.user?.name || entry.userId}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {entry.user?.email || entry.userId}
                        </div>
                      </td>
                      <td className="px-4 py-4 font-mono text-slate-200">
                        {entry.txNumber}
                      </td>
                      <td className="px-4 py-4 text-slate-200">
                        ${Number(entry.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="admin-badge rounded-full px-2.5 py-1 text-xs font-semibold">
                          {isArabic ? statusLabel.ar : statusLabel.en}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-300">
                        {entry.adminNote || t("لا توجد ملاحظات", "No notes")}
                      </td>
                      <td className="px-4 py-4 text-slate-200">
                        {new Date(entry.createdAt).toLocaleDateString(
                          isArabic ? "ar" : "en-US",
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {isReviewed ? (
                          <span className="text-xs font-semibold text-slate-500">
                            {t("تمت المعالجة", "Handled")}
                          </span>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={actionLoadingId === entry.id}
                              onClick={() => handleApprove(entry)}
                              className="admin-btn-success rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {actionLoadingId === entry.id
                                ? t("جارٍ التنفيذ...", "Processing...")
                                : t("تفعيل الحساب", "Activate account")}
                            </button>
                            <button
                              type="button"
                              disabled={actionLoadingId === entry.id}
                              onClick={() => handleReject(entry)}
                              className="admin-btn-danger rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t("رفض التفعيل", "Reject activation")}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
