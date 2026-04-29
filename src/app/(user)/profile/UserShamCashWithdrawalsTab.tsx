"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { useStaleResource } from "@/app/hooks/useStaleResource";
import { getUiLocale } from "@/lib/locale-format";

type WithdrawalStatus =
  | "ALL"
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

type WithdrawalRow = {
  id: string;
  status: Exclude<WithdrawalStatus, "ALL">;
  amount: number;
  currency: string;
  walletCode: string;
  note: string;
  requestedAt: string;
  updatedAt: string;
  transactionId: string;
  lastError: string;
  pendingPosition: number | null;
  source: "MANUAL_FALLBACK";
};

type WithdrawalsResponse = {
  filters: {
    status: WithdrawalStatus;
    limit: number;
  };
  runtime: {
    payoutMode: string;
    queueEnabled: boolean;
  };
  summary: {
    totalRows: number;
    filteredCount: number;
    statusCounts: Record<Exclude<WithdrawalStatus, "ALL">, number>;
    availableBalance: number;
  };
  rows: WithdrawalRow[];
  message?: string;
};

const formatMoney = (amount: number) => Number(amount || 0).toFixed(2);

type TimelineState = "done" | "active" | "upcoming" | "failed";

const statusClassName = (status: WithdrawalRow["status"]) => {
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700";
  if (status === "FAILED") return "bg-rose-100 text-rose-700";
  if (status === "PROCESSING") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
};

const formatDateTime = (value: string, locale: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(locale);
};

const TimelinePill = ({
  label,
  state,
}: {
  label: string;
  state: TimelineState;
}) => {
  let classes = "border-slate-200 bg-slate-50 text-slate-400";

  if (state === "done") {
    classes = "border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (state === "active") {
    classes = "border-cyan-200 bg-cyan-50 text-cyan-700";
  } else if (state === "failed") {
    classes = "border-rose-200 bg-rose-50 text-rose-700";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
};

const WithdrawalTimeline = ({
  status,
  t,
}: {
  status: WithdrawalRow["status"];
  t: (ar: string, en: string) => string;
}) => {
  const pendingState: TimelineState =
    status === "PENDING"
      ? "active"
      : status === "PROCESSING" || status === "COMPLETED" || status === "FAILED"
        ? "done"
        : "upcoming";

  const processingState: TimelineState =
    status === "PROCESSING"
      ? "active"
      : status === "COMPLETED" || status === "FAILED"
        ? "done"
        : "upcoming";

  const outcomeState: TimelineState =
    status === "COMPLETED"
      ? "active"
      : status === "FAILED"
        ? "failed"
        : "upcoming";

  const outcomeLabel =
    status === "FAILED"
      ? t("فشل", "Failed")
      : status === "COMPLETED"
        ? t("مكتمل", "Completed")
        : t("مكتمل/فشل", "Completed/Failed");

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap">
      <TimelinePill label={t("انتظار", "Pending")} state={pendingState} />
      <span className="text-slate-300 text-[11px]">-&gt;</span>
      <TimelinePill label={t("معالجة", "Processing")} state={processingState} />
      <span className="text-slate-300 text-[11px]">-&gt;</span>
      <TimelinePill label={outcomeLabel} state={outcomeState} />
    </div>
  );
};

interface UserShamCashWithdrawalsTabProps {
  availableToWithdraw: number;
  onOpenShamCashWithdraw: () => void;
  isWithdrawingShamCash: boolean;
}

const UserShamCashWithdrawalsTab = ({
  availableToWithdraw,
  onOpenShamCashWithdraw,
  isWithdrawingShamCash,
}: UserShamCashWithdrawalsTabProps) => {
  const { isArabic } = useAppPreferences();
  const locale = getUiLocale(isArabic);
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [status, setStatus] = useState<WithdrawalStatus>("ALL");
  const cacheKey = useMemo(
    () => `profile:withdrawals:shamcash:${status}:${isArabic ? "ar" : "en"}`,
    [isArabic, status],
  );

  const fetchRows = useCallback(
    async (signal: AbortSignal) => {
      const params = new URLSearchParams({
        status,
        limit: "120",
      });

      const response = await fetch(
        `/api/profile/withdrawals/shamcash?${params.toString()}`,
        {
          signal,
          headers: {
            "x-lang": isArabic ? "ar" : "en",
          },
          cache: "no-store",
        },
      );

      const body = (await response.json()) as WithdrawalsResponse;

      if (!response.ok) {
        throw new Error(
          body.message ||
            t(
              "تعذر تحميل سحوبات شام كاش",
              "Failed to load ShamCash withdrawals",
            ),
        );
      }

      return body;
    },
    [isArabic, status, t],
  );

  const { data, loading, isRefreshing, error, refetch } =
    useStaleResource<WithdrawalsResponse>({
      cacheKey,
      fetcher: fetchRows,
    });

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refetch();
    }, 8000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refetch]);

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);

  const visibleTotalAmount = useMemo(
    () => rows.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [rows],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm dark:border-cyan-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">
              {t("سحوباتي عبر شام كاش", "My ShamCash withdrawals")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t(
                "متابعة حالة السحب (انتظار/معالجة/اكتمل/فشل) مع تحديث تلقائي",
                "Track withdrawal status (pending/processing/completed/failed) with auto-refresh",
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenShamCashWithdraw}
            disabled={isWithdrawingShamCash}
            className="inline-flex items-center 
            justify-center gap-2 rounded-lg bg-white/80 hover:bg-white/90 px-3 py-2 text-xs sm:text-sm font-medium text-emerald-600/80 disabled:opacity-60"
          >
            <Image
              src="/images/shamcash-withdraw-icon.png"
              alt="ShamCash"
              width={18}
              height={18}
              className="h-4 w-4"
            />
            {isWithdrawingShamCash
              ? t("جارِ الإرسال...", "Submitting...")
              : t("سحب عبر شام كاش", "Withdraw via ShamCash")}
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <MetricCard
            title={t("الرصيد المتاح", "Available balance")}
            value={`$${formatMoney(availableToWithdraw)}`}
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
            title={t("مكتمل", "Completed")}
            value={String(data?.summary.statusCounts.COMPLETED || 0)}
          />
          <MetricCard
            title={t("فاشل", "Failed")}
            value={String(data?.summary.statusCounts.FAILED || 0)}
          />
          <MetricCard
            title={t("إجمالي المبلغ المعروض", "Visible amount")}
            value={`$${formatMoney(visibleTotalAmount)}`}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <select
            name="withdrawalStatus"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as WithdrawalStatus)
            }
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-xs sm:text-sm"
          >
            <option value="ALL">{t("الكل", "All")}</option>
            <option value="PENDING">{t("قيد الانتظار", "Pending")}</option>
            <option value="PROCESSING">
              {t("قيد المعالجة", "Processing")}
            </option>
            <option value="COMPLETED">{t("مكتمل", "Completed")}</option>
            <option value="FAILED">{t("فاشل", "Failed")}</option>
          </select>

          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("وضع التنفيذ", "Runtime mode")}:{" "}
              {data?.runtime.payoutMode || "-"}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t("تحديث", "Refresh")}
            </button>
          </div>
        </div>
      </div>

      {error && data ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          <div className="flex items-center justify-between gap-3">
            <p>
              {error instanceof Error
                ? error.message
                : t(
                    "تعذر تحديث البيانات حالياً",
                    "Could not refresh the data right now",
                  )}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-lg border border-current px-3 py-1 font-medium hover:opacity-80"
            >
              {t("إعادة المحاولة", "Retry")}
            </button>
          </div>
        </div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          {t("جاري تحميل السحوبات...", "Loading withdrawals...")}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-300">
            {t(
              "لا توجد سحوبات مطابقة للفلتر الحالي",
              "No withdrawals found for this filter",
            )}
          </p>
          <button
            type="button"
            onClick={onOpenShamCashWithdraw}
            disabled={isWithdrawingShamCash}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
          >
            <Image
              src="/images/shamcash-withdraw-icon.png"
              alt="ShamCash"
              width={18}
              height={18}
              className="h-4 w-4"
            />
            {isWithdrawingShamCash
              ? t("جارِ الإرسال...", "Submitting...")
              : t("ابدأ أول عملية سحب الآن", "Start your first withdrawal now")}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {isRefreshing && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/85 px-3 py-1.5 text-xs text-neutral-600 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span>
                {t("يتم تحديث السحوبات...", "Refreshing withdrawals...")}
              </span>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-right py-2 px-2">
                    {t("الحالة", "Status")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("المبلغ", "Amount")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("القناة", "Channel")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("المسار", "Timeline")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("المحفظة", "Wallet")}
                  </th>
                  <th className="text-right py-2 px-2">{t("الوقت", "Time")}</th>
                  <th className="text-right py-2 px-2">
                    {t("تفاصيل", "Details")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 dark:border-slate-800 align-top"
                  >
                    <td className="py-2 px-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusClassName(row.status)}`}
                      >
                        {row.status}
                      </span>
                      {row.pendingPosition ? (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {t("الترتيب", "Position")}: #{row.pendingPosition}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-2 px-2 text-slate-700 dark:text-slate-200">
                      ${formatMoney(row.amount)} {row.currency}
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-600 dark:text-slate-300">
                      {t("شام كاش", "ShamCash")}
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-600 dark:text-slate-300">
                      <WithdrawalTimeline status={row.status} t={t} />
                    </td>
                    <td className="py-2 px-2 text-slate-700 dark:text-slate-200">
                      {row.walletCode ? (
                        <p className="font-mono text-xs">{row.walletCode}</p>
                      ) : (
                        <p>-</p>
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-600 dark:text-slate-300">
                      <p>
                        {t("طلب", "Requested")}:{" "}
                        {formatDateTime(row.requestedAt, locale)}
                      </p>
                      <p>
                        {t("تحديث", "Updated")}:{" "}
                        {formatDateTime(row.updatedAt, locale)}
                      </p>
                    </td>
                    <td className="py-2 px-2 text-xs text-slate-600 dark:text-slate-300">
                      {row.transactionId ? (
                        <p>
                          {t("المعاملة", "Transaction")}: {row.transactionId}
                        </p>
                      ) : null}
                      {row.lastError ? (
                        <p className="text-rose-600">{row.lastError}</p>
                      ) : row.note ? (
                        <p>{row.note}</p>
                      ) : (
                        <p>-</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
};

const MetricCard = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/60">
    <p className="text-xs text-slate-500 dark:text-slate-400">{title}</p>
    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
      {value}
    </p>
  </div>
);

export default UserShamCashWithdrawalsTab;
