"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type QueueStatus = "ALL" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
type FilterTab = "ALL" | "ACTIVE" | "COMPLETED" | "FAILED" | "MANUAL";

type ShamCashPayoutJobsPanelProps = {
  focusManualRequestId?: string;
};

type PayoutJob = {
  id: string;
  manualRequestId: string;
  source: "QUEUE_PLAYWRIGHT" | "MANUAL_FALLBACK";
  userId: string;
  userName: string;
  userEmail: string;
  walletCode: string;
  qrCode: string;
  amount: number;
  currency: string;
  note: string;
  requestedAt: string;
  attempts: number;
  status: Exclude<QueueStatus, "ALL">;
  transactionId: string;
  lastError: string;
  processingStartedAt: string;
  completedAt: string;
  failedAt: string;
  updatedAt: string;
  pendingPosition: number | null;
};

type JobsResponse = {
  filters: {
    status: QueueStatus;
    limit: number;
  };
  summary: {
    queueSize: number;
    totalJobs: number;
    filteredCount: number;
    statusCounts: Record<Exclude<QueueStatus, "ALL">, number>;
  };
  runtime: {
    payoutMode: string;
    workerRequired: boolean;
    queueEnabled: boolean;
  };
  jobs: PayoutJob[];
  message?: string;
};

const formatMoney = (amount: number) => Number(amount || 0).toFixed(2);

const statusClassName = (status: PayoutJob["status"]) => {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  if (status === "FAILED") return "bg-rose-100 text-rose-700";
  if (status === "PROCESSING") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
};

const toLocaleDateTime = (value: string, locale: string) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString(locale);
};

const statusLabel = (
  status: PayoutJob["status"],
  t: (ar: string, en: string) => string,
) => {
  if (status === "PENDING") return t("قيد الانتظار", "Pending");
  if (status === "PROCESSING") return t("قيد المعالجة", "Processing");
  if (status === "COMPLETED") return t("مكتمل", "Completed");
  return t("فاشل", "Failed");
};

const ShamCashPayoutJobsPanel = ({
  focusManualRequestId,
}: ShamCashPayoutJobsPanelProps) => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const locale = isArabic ? "ar" : "en";

  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [retryingId, setRetryingId] = useState<string>("");
  const [completingId, setCompletingId] = useState<string>("");
  const [data, setData] = useState<JobsResponse | null>(null);

  const loadJobs = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const params = new URLSearchParams({
          status: "ALL",
          limit: "150",
        });

        const response = await fetch(
          `/api/admin/shamcash-payout-jobs?${params.toString()}`,
          {
            headers: {
              "x-lang": isArabic ? "ar" : "en",
            },
          },
        );

        const body = (await response.json()) as JobsResponse;

        if (!response.ok) {
          throw new Error(
            body.message ||
              t("تعذر تحميل طلبات السحب", "Failed to load payout jobs"),
          );
        }

        setData(body);
      } catch (error) {
        if (!silent) {
          toast.error(
            error instanceof Error
              ? error.message
              : t("حدث خطأ غير متوقع", "Unexpected error"),
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [isArabic, t],
  );

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadJobs(true);
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadJobs]);

  const handleRetry = useCallback(
    async (jobId: string) => {
      try {
        setRetryingId(jobId);

        const response = await fetch("/api/admin/shamcash-payout-jobs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lang": isArabic ? "ar" : "en",
          },
          body: JSON.stringify({
            action: "RETRY",
            jobId,
          }),
        });

        const body = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(
            body.message ||
              t("تعذر إعادة المحاولة", "Failed to retry payout job"),
          );
        }

        toast.success(
          body.message ||
            t("تمت إعادة الطلب للطابور", "Job was added back to queue"),
        );

        await loadJobs(true);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error"),
        );
      } finally {
        setRetryingId("");
      }
    },
    [isArabic, loadJobs, t],
  );

  const handleCompleteManual = useCallback(
    async (job: PayoutJob) => {
      try {
        setCompletingId(job.id);

        const transactionId =
          window.prompt(
            t(
              "أدخل رقم العملية في شام كاش (اختياري)",
              "Enter ShamCash transaction id (optional)",
            ),
          ) || "";

        const response = await fetch("/api/admin/shamcash-manual-withdrawals", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lang": isArabic ? "ar" : "en",
          },
          body: JSON.stringify({
            action: "COMPLETE_MANUAL",
            requestId: job.manualRequestId || job.id.replace(/^manual-/, ""),
            transactionId: transactionId.trim(),
            adminNote: "Completed from admin payout queue panel",
          }),
        });

        const body = (await response.json()) as { message?: string };

        if (!response.ok) {
          throw new Error(
            body.message ||
              t(
                "تعذر إتمام الطلب اليدوي",
                "Failed to complete manual withdrawal",
              ),
          );
        }

        toast.success(
          body.message ||
            t("تم إتمام الطلب اليدوي", "Manual withdrawal completed"),
        );

        await loadJobs(true);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error"),
        );
      } finally {
        setCompletingId("");
      }
    },
    [isArabic, loadJobs, t],
  );

  const jobs = useMemo(() => data?.jobs ?? [], [data?.jobs]);

  const filteredJobs = useMemo(() => {
    if (activeTab === "ALL") return jobs;
    if (activeTab === "ACTIVE") {
      return jobs.filter(
        (job) => job.status === "PENDING" || job.status === "PROCESSING",
      );
    }
    if (activeTab === "COMPLETED") {
      return jobs.filter((job) => job.status === "COMPLETED");
    }
    if (activeTab === "FAILED") {
      return jobs.filter((job) => job.status === "FAILED");
    }
    return jobs.filter((job) => job.source === "MANUAL_FALLBACK");
  }, [activeTab, jobs]);

  const totalAmount = useMemo(
    () => filteredJobs.reduce((sum, job) => sum + Number(job.amount || 0), 0),
    [filteredJobs],
  );

  const focusedJobExists = useMemo(
    () =>
      Boolean(
        focusManualRequestId &&
        jobs.some(
          (job) =>
            job.source === "MANUAL_FALLBACK" &&
            job.manualRequestId === focusManualRequestId,
        ),
      ),
    [focusManualRequestId, jobs],
  );

  useEffect(() => {
    if (!focusedJobExists) return;
    setActiveTab("MANUAL");
  }, [focusedJobExists]);

  useEffect(() => {
    if (!focusedJobExists || activeTab !== "MANUAL" || !focusManualRequestId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-manual-request-id="${focusManualRequestId}"]`,
        ),
      );

      const target =
        nodes.find((node) => node.offsetParent !== null) || nodes[0];
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [activeTab, focusManualRequestId, focusedJobExists, filteredJobs]);

  const activeCount =
    Number(data?.summary.statusCounts.PENDING || 0) +
    Number(data?.summary.statusCounts.PROCESSING || 0);
  const manualCount = jobs.filter(
    (job) => job.source === "MANUAL_FALLBACK",
  ).length;

  const tabs: Array<{ key: FilterTab; label: string; count: number }> = [
    {
      key: "ALL",
      label: t("الكل", "All"),
      count: Number(data?.summary.totalJobs || 0),
    },
    {
      key: "ACTIVE",
      label: t("قيد التنفيذ", "Active"),
      count: activeCount,
    },
    {
      key: "COMPLETED",
      label: t("مكتملة", "Completed"),
      count: Number(data?.summary.statusCounts.COMPLETED || 0),
    },
    {
      key: "FAILED",
      label: t("فاشلة", "Failed"),
      count: Number(data?.summary.statusCounts.FAILED || 0),
    },
    {
      key: "MANUAL",
      label: t("يدوية", "Manual"),
      count: manualCount,
    },
  ];

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t("مراقبة طابور سحب شام كاش", "ShamCash Payout Queue Monitor")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "تحديث تلقائي كل 8 ثوانٍ مع إمكانية إعادة محاولة الطلبات الفاشلة",
                "Auto-refresh every 8 seconds with manual retry for failed jobs",
              )}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start">
            <button
              type="button"
              onClick={() => loadJobs()}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t("تحديث", "Refresh")}
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-max items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-800/50 dark:text-cyan-100"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          <MetricCard
            title={t("حجم الطابور", "Queue size")}
            value={String(data?.summary.queueSize || 0)}
          />
          <MetricCard
            title={t("قيد الانتظار", "Pending")}
            value={String(data?.summary.statusCounts.PENDING || 0)}
          />
          <MetricCard
            title={t("قيد المعالجة", "Processing")}
            value={String(data?.summary.statusCounts.PROCESSING || 0)}
          />
          <MetricCard
            title={t("فاشلة", "Failed")}
            value={String(data?.summary.statusCounts.FAILED || 0)}
          />
          <MetricCard
            title={t("مكتملة", "Completed")}
            value={String(data?.summary.statusCounts.COMPLETED || 0)}
          />
          <MetricCard
            title={t("إجمالي المبلغ المعروض", "Visible amount")}
            value={`$${formatMoney(totalAmount)}`}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 whitespace-normal wrap-break-words">
          {t("وضع التنفيذ", "Runtime mode")}: {data?.runtime.payoutMode || "-"}
          {data?.runtime.workerRequired
            ? t(" (يتطلب عامل معالجة worker)", " (worker required)")
            : t(" (لا يحتاج worker)", " (worker not required)")}
        </p>

        {data && !data.runtime.queueEnabled ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300 whitespace-normal wrap-break-words">
            {t(
              "Redis غير مفعّل. يتم عرض الطلبات اليدوية من قاعدة البيانات داخل نفس قائمة الطابور.",
              "Redis is disabled. Manual fallback requests are shown from database in this queue view.",
            )}
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {t("جاري تحميل الطلبات...", "Loading payout jobs...")}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {t(
            "لا توجد طلبات مطابقة للفلتر الحالي",
            "No jobs found for this filter",
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                data-manual-request-id={
                  job.source === "MANUAL_FALLBACK"
                    ? job.manualRequestId
                    : undefined
                }
                className={`rounded-2xl border bg-white p-3 shadow-sm dark:bg-slate-900 ${
                  focusManualRequestId &&
                  job.source === "MANUAL_FALLBACK" &&
                  job.manualRequestId === focusManualRequestId
                    ? "border-cyan-400 ring-2 ring-cyan-300/70 dark:border-cyan-600 dark:ring-cyan-800/70"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClassName(job.status)}`}
                    >
                      {statusLabel(job.status, t)}
                    </span>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {job.source === "MANUAL_FALLBACK"
                        ? t("طلب يدوي", "Manual request")
                        : t("طلب طابور", "Queue request")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    ${formatMoney(job.amount)} {job.currency}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">
                      {t("المستخدم", "User")}
                    </p>
                    <p className="font-semibold whitespace-normal wrap-break-words">
                      {job.userName || job.userId}
                    </p>
                    {job.userEmail ? (
                      <p className="whitespace-normal break-all">
                        {job.userEmail}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">
                      {t("المحفظة", "Wallet")}
                    </p>
                    <p className="font-mono whitespace-normal break-all">
                      {job.walletCode || "-"}
                    </p>
                  </div>
                </div>

                {job.qrCode ? (
                  <div className="mt-3">
                    {job.qrCode.startsWith("data:image/") ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={job.qrCode}
                          alt={t("صورة كود QR", "QR image")}
                          className="h-20 w-20 rounded-md border border-slate-200 dark:border-slate-700 object-cover"
                        />
                        <a
                          href={job.qrCode}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-cyan-600 hover:underline"
                        >
                          {t("فتح صورة QR", "Open QR image")}
                        </a>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {job.note ? (
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 whitespace-normal wrap-break-words">
                    {job.note}
                  </p>
                ) : null}

                {job.lastError ? (
                  <p className="mt-2 text-xs text-rose-600 whitespace-normal wrap-break-words">
                    {job.lastError}
                  </p>
                ) : null}

                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <p>
                    {t("طلب", "Requested")}:{" "}
                    {toLocaleDateTime(job.requestedAt, locale)}
                  </p>
                  <p>
                    {t("تحديث", "Updated")}:{" "}
                    {toLocaleDateTime(job.updatedAt, locale)}
                  </p>
                </div>

                <div className="mt-3">
                  {job.source === "MANUAL_FALLBACK" ? (
                    <button
                      type="button"
                      disabled={
                        (job.status !== "PENDING" &&
                          job.status !== "PROCESSING") ||
                        completingId === job.id
                      }
                      onClick={() => handleCompleteManual(job)}
                      className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {completingId === job.id
                        ? t("جارِ التأكيد...", "Completing...")
                        : t("تم التحويل يدوياً", "Mark as completed")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={
                        job.status !== "FAILED" || retryingId === job.id
                      }
                      onClick={() => handleRetry(job.id)}
                      className="w-full rounded-lg bg-rose-600 px-3 py-2 text-xs font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {retryingId === job.id
                        ? t("جارِ الإرسال...", "Retrying...")
                        : t("إعادة المحاولة", "Retry")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead className="text-slate-500 dark:text-slate-400">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="w-32.5 text-right py-2 px-2">
                      {t("الحالة", "Status")}
                    </th>
                    <th className="w-27.5 text-right py-2 px-2">
                      {t("المبلغ", "Amount")}
                    </th>
                    <th className="w-42.5] text-right py-2 px-2">
                      {t("المستخدم", "User")}
                    </th>
                    <th className="w-55 text-right py-2 px-2">
                      {t("المحفظة", "Wallet")}
                    </th>
                    <th className="w-20 text-right py-2 px-2">
                      {t("المحاولات", "Attempts")}
                    </th>
                    <th className="w-42.5 text-right py-2 px-2">
                      {t("الوقت", "Time")}
                    </th>
                    <th className="w-55 text-right py-2 px-2">
                      {t("تفاصيل", "Details")}
                    </th>
                    <th className="w-32.5 text-right py-2 px-2">
                      {t("إجراء", "Action")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      data-manual-request-id={
                        job.source === "MANUAL_FALLBACK"
                          ? job.manualRequestId
                          : undefined
                      }
                      className={`border-b border-slate-100 dark:border-slate-800 align-top ${
                        focusManualRequestId &&
                        job.source === "MANUAL_FALLBACK" &&
                        job.manualRequestId === focusManualRequestId
                          ? "bg-cyan-50/70 dark:bg-cyan-900/20"
                          : ""
                      }`}
                    >
                      <td className="py-2 px-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClassName(job.status)}`}
                        >
                          {statusLabel(job.status, t)}
                        </span>
                        <p className="text-[11px] mt-1 text-slate-500 dark:text-slate-400 whitespace-normal wrap-break-words">
                          {job.source === "MANUAL_FALLBACK"
                            ? t("يدوي", "Manual")
                            : t("طابور", "Queue")}
                        </p>
                        {job.pendingPosition ? (
                          <p className="text-[11px] text-slate-500 mt-1">
                            {t("الترتيب", "Position")}: #{job.pendingPosition}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 px-2 text-slate-700 dark:text-slate-200">
                        ${formatMoney(job.amount)} {job.currency}
                      </td>
                      <td className="py-2 px-2 text-slate-700 dark:text-slate-200">
                        <p className="whitespace-normal wrap-break-words">
                          {job.userName || job.userId}
                        </p>
                        {job.userEmail ? (
                          <p className="text-xs text-slate-500 whitespace-normal wrap-break-words">
                            {job.userEmail}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 px-2 text-slate-700 dark:text-slate-200">
                        <p className="font-mono text-xs whitespace-normal wrap-break-words">
                          {job.walletCode}
                        </p>
                        {job.qrCode ? (
                          <div className="mt-2">
                            {job.qrCode.startsWith("data:image/") ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={job.qrCode}
                                  alt={t(
                                    "صورة كود QR الخاصة بالمستخدم",
                                    "User QR image",
                                  )}
                                  className="h-16 w-16 rounded border border-slate-200 dark:border-slate-700 object-cover"
                                />
                                <a
                                  href={job.qrCode}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-block text-[11px] text-cyan-600 hover:underline"
                                >
                                  {t("فتح صورة QR", "Open QR image")}
                                </a>
                              </>
                            ) : job.qrCode.startsWith("http") ? (
                              <a
                                href={job.qrCode}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-cyan-600 hover:underline"
                              >
                                {t("فتح QR", "Open QR")}
                              </a>
                            ) : (
                              <p className="font-mono text-[10px] wrap-break-words text-slate-500 dark:text-slate-400">
                                {job.qrCode.length > 80
                                  ? `${job.qrCode.slice(0, 80)}...`
                                  : job.qrCode}
                              </p>
                            )}
                          </div>
                        ) : null}
                        {job.note ? (
                          <p className="text-xs text-slate-500 mt-1 whitespace-normal wrap-break-words">
                            {job.note}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 px-2 text-slate-700 dark:text-slate-200">
                        {job.attempts}
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-600 dark:text-slate-300">
                        <p>
                          {t("طلب", "Requested")}:{" "}
                          {toLocaleDateTime(job.requestedAt, locale)}
                        </p>
                        <p>
                          {t("تحديث", "Updated")}:{" "}
                          {toLocaleDateTime(job.updatedAt, locale)}
                        </p>
                      </td>
                      <td className="py-2 px-2 text-xs text-slate-600 dark:text-slate-300">
                        {job.transactionId ? (
                          <p className="whitespace-normal break-all">
                            {t("المعاملة", "Transaction")}: {job.transactionId}
                          </p>
                        ) : null}
                        {job.lastError ? (
                          <p className="text-rose-600 whitespace-normal wrap-break-words max-h-20 overflow-auto pr-1">
                            {job.lastError}
                          </p>
                        ) : (
                          <p>-</p>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        {job.source === "MANUAL_FALLBACK" ? (
                          <button
                            type="button"
                            disabled={
                              (job.status !== "PENDING" &&
                                job.status !== "PROCESSING") ||
                              completingId === job.id
                            }
                            onClick={() => handleCompleteManual(job)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {completingId === job.id
                              ? t("جارِ التأكيد...", "Completing...")
                              : t("تم التحويل يدوياً", "Mark as completed")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={
                              job.status !== "FAILED" || retryingId === job.id
                            }
                            onClick={() => handleRetry(job.id)}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {retryingId === job.id
                              ? t("جارِ الإرسال...", "Retrying...")
                              : t("إعادة المحاولة", "Retry")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

const MetricCard = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
    <p className="text-[11px] leading-4 text-slate-500 dark:text-slate-400 whitespace-normal wrap-break-words">
      {title}
    </p>
    <p className="text-base font-semibold text-slate-800 dark:text-slate-100 mt-1 leading-none">
      {value}
    </p>
  </div>
);

export default ShamCashPayoutJobsPanel;
