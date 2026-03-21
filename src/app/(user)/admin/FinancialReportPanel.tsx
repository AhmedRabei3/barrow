"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type FinancialReportRow = {
  id: string;
  kind: "RECEIVED" | "PAID_OUT";
  channel: string;
  amount: number;
  currency: string;
  createdAt: string;
  reference: string;
  userId: string;
  userName: string;
  userEmail: string;
};

type ReportChannel = "ALL" | "PAYPAL" | "SHAMCASH" | "MANUAL" | "OTHER";

type AdminWithdrawalRow = {
  id: string;
  amount: number;
  createdAt: string;
  userId: string;
  userName: string;
  userEmail: string;
};

type FinancialReportResponse = {
  range: {
    dateFrom: string;
    dateTo: string;
  };
  filters: {
    channel: ReportChannel;
  };
  summary: {
    receivedAmount: number;
    paidOutAmount: number;
    netProfitAmount: number;
    todayReceivedAmount: number;
    todayPaidOutAmount: number;
    todayNetProfitAmount: number;
    weekReceivedAmount: number;
    weekPaidOutAmount: number;
    weekNetProfitAmount: number;
    receivedViaPaypal: number;
    receivedViaShamCash: number;
    paidOutViaPaypal: number;
    paidOutViaShamCash: number;
    paidOutManualSettlements: number;
  };
  walletEstimates: {
    paypal: number;
    shamCash: number;
  };
  adminWithdrawals: AdminWithdrawalRow[];
  rows: FinancialReportRow[];
};

const formatDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMoney = (amount: number) => Number(amount || 0).toFixed(2);

const formatTimestampForFilename = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const getStartOfWeek = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diffToMonday);
  return result;
};

const FinancialReportPanel = () => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const today = useMemo(() => new Date(), []);
  const firstDayOfMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

  const [dateFrom, setDateFrom] = useState<string>(
    formatDateInputValue(firstDayOfMonth),
  );
  const [dateTo, setDateTo] = useState<string>(formatDateInputValue(today));
  const [channel, setChannel] = useState<ReportChannel>("ALL");
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<FinancialReportResponse | null>(null);

  const applyThisWeekRange = useCallback(() => {
    const now = new Date();
    const weekStart = getStartOfWeek(now);
    setDateFrom(formatDateInputValue(weekStart));
    setDateTo(formatDateInputValue(now));
  }, []);

  const applyThisMonthRange = useCallback(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    setDateFrom(formatDateInputValue(monthStart));
    setDateTo(formatDateInputValue(now));
  }, []);

  const channelLabel = useCallback(
    (channelValue: string) => {
      if (channelValue === "PAYPAL") return "PayPal";
      if (channelValue === "SHAMCASH") return "ShamCash";
      if (channelValue === "MANUAL") return t("يدوي", "Manual");
      if (channelValue === "OTHER") return t("أخرى", "Other");
      if (channelValue === "ALL") return t("الكل", "All");
      return channelValue;
    },
    [t],
  );

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ dateFrom, dateTo, channel });
      const res = await fetch(
        `/api/admin/financial-report?${params.toString()}`,
      );
      const body = (await res.json()) as FinancialReportResponse & {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(
          body.message ||
            t("فشل تحميل التقرير المالي", "Failed to load financial report"),
        );
      }

      setData(body);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("فشل تحميل التقرير المالي", "Failed to load financial report"),
      );
    } finally {
      setLoading(false);
    }
  }, [channel, dateFrom, dateTo, t]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const exportCsv = useCallback(() => {
    if (!data || data.rows.length === 0) {
      toast.error(t("لا توجد بيانات للتصدير", "No data to export"));
      return;
    }

    const headers = [
      "kind",
      "channel",
      "amount",
      "currency",
      "createdAt",
      "reference",
      "userId",
      "userName",
      "userEmail",
    ];

    const rows = data.rows.map((row) => [
      row.kind,
      row.channel,
      formatMoney(row.amount),
      row.currency,
      row.createdAt,
      row.reference,
      row.userId,
      row.userName,
      row.userEmail,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = formatTimestampForFilename(new Date());
    link.download = `financial-report-${channel.toLowerCase()}-${dateFrom}-to-${dateTo}-${timestamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [channel, data, dateFrom, dateTo, t]);

  if (loading) {
    return (
      <p className="text-slate-500 dark:text-slate-300">
        {t("جاري تحميل التقرير المالي...", "Loading financial report...")}
      </p>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 items-end">
          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("من تاريخ", "From")}
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("القناة", "Channel")}
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as ReportChannel)
              }
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            >
              <option value="ALL">{t("الكل", "All")}</option>
              <option value="PAYPAL">PayPal</option>
              <option value="SHAMCASH">ShamCash</option>
              <option value="MANUAL">{t("يدوي", "Manual")}</option>
              <option value="OTHER">{t("أخرى", "Other")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-600 dark:text-slate-300">
            {t("إلى تاريخ", "To")}
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={loadReport}
            className="rounded-lg bg-linear-to-r from-sky-600 to-cyan-600 text-white text-sm px-4 py-2.5 hover:from-sky-700 hover:to-cyan-700"
          >
            {t("تحديث التقرير", "Refresh report")}
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t("تصدير CSV", "Export CSV")}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyThisWeekRange}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t("هذا الأسبوع", "This week")}
          </button>
          <button
            type="button"
            onClick={applyThisMonthRange}
            className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {t("هذا الشهر", "This month")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title={t("إجمالي المستلم", "Total received")}
          value={`$${formatMoney(data?.summary.receivedAmount || 0)}`}
        />
        <KpiCard
          title={t("إجمالي المدفوع", "Total paid out")}
          value={`$${formatMoney(data?.summary.paidOutAmount || 0)}`}
        />
        <KpiCard
          title={t("الربح الصافي", "Net profit")}
          value={`$${formatMoney(data?.summary.netProfitAmount || 0)}`}
        />
        <KpiCard
          title={t("رصيد PayPal (تقديري)", "PayPal wallet (estimated)")}
          value={`$${formatMoney(data?.walletEstimates.paypal || 0)}`}
        />
        <KpiCard
          title={t("رصيد ShamCash (تقديري)", "ShamCash wallet (estimated)")}
          value={`$${formatMoney(data?.walletEstimates.shamCash || 0)}`}
        />
        <KpiCard
          title={t("وارد PayPal", "PayPal inflow")}
          value={`$${formatMoney(data?.summary.receivedViaPaypal || 0)}`}
        />
        <KpiCard
          title={t("وارد ShamCash", "ShamCash inflow")}
          value={`$${formatMoney(data?.summary.receivedViaShamCash || 0)}`}
        />
        <KpiCard
          title={t("صادر PayPal", "PayPal outflow")}
          value={`$${formatMoney(data?.summary.paidOutViaPaypal || 0)}`}
        />
        <KpiCard
          title={t("صادر ShamCash", "ShamCash outflow")}
          value={`$${formatMoney(data?.summary.paidOutViaShamCash || 0)}`}
        />
        <KpiCard
          title={t("تسويات يدوية", "Manual settlements")}
          value={`$${formatMoney(data?.summary.paidOutManualSettlements || 0)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {t("إجماليات اليوم", "Daily totals")}
          </h3>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p>
              {t("المستلم", "Received")}: $
              {formatMoney(data?.summary.todayReceivedAmount || 0)}
            </p>
            <p>
              {t("المدفوع", "Paid out")}: $
              {formatMoney(data?.summary.todayPaidOutAmount || 0)}
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {t("الصافي", "Net")}: $
              {formatMoney(data?.summary.todayNetProfitAmount || 0)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {t("إجماليات الأسبوع", "Weekly totals")}
          </h3>
          <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
            <p>
              {t("المستلم", "Received")}: $
              {formatMoney(data?.summary.weekReceivedAmount || 0)}
            </p>
            <p>
              {t("المدفوع", "Paid out")}: $
              {formatMoney(data?.summary.weekPaidOutAmount || 0)}
            </p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">
              {t("الصافي", "Net")}: $
              {formatMoney(data?.summary.weekNetProfitAmount || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("سحوبات الأدمن من الصندوق", "Admin fund withdrawals")}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t("إجمالي السحوبات اليدوية", "Total manual withdrawals")}: $
            {formatMoney(
              (data?.adminWithdrawals || []).reduce(
                (sum, row) => sum + row.amount,
                0,
              ),
            )}
          </p>
        </div>

        {!data || data.adminWithdrawals.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              "لا توجد سحوبات يدوية ضمن الفترة المحددة",
              "No manual admin withdrawals in selected range",
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-right py-2 px-2">
                    {t("المبلغ", "Amount")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("المستخدم", "User")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("التاريخ", "Date")}
                  </th>
                  <th className="text-right py-2 px-2">ID</th>
                </tr>
              </thead>
              <tbody>
                {data.adminWithdrawals.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <td className="py-2 px-2">${formatMoney(row.amount)}</td>
                    <td className="py-2 px-2">
                      <div className="leading-5">
                        <p>{row.userName || "-"}</p>
                        <p className="text-xs text-slate-500">
                          {row.userEmail || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      {new Date(row.createdAt).toLocaleString(
                        isArabic ? "ar" : "en",
                      )}
                    </td>
                    <td className="py-2 px-2 font-mono text-xs">{row.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">
          {t("حركات التقرير", "Report movements")}
        </h3>

        {!data || data.rows.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              "لا توجد عمليات ضمن الفترة المحددة",
              "No records in selected range",
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-right py-2 px-2">{t("النوع", "Type")}</th>
                  <th className="text-right py-2 px-2">
                    {t("القناة", "Channel")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("المبلغ", "Amount")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("المستخدم", "User")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("التاريخ", "Date")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("مرجع", "Reference")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                  >
                    <td className="py-2 px-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          row.kind === "RECEIVED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {row.kind === "RECEIVED"
                          ? t("مستلم", "Received")
                          : t("مدفوع", "Paid out")}
                      </span>
                    </td>
                    <td className="py-2 px-2">{channelLabel(row.channel)}</td>
                    <td className="py-2 px-2">${formatMoney(row.amount)}</td>
                    <td className="py-2 px-2">
                      <div className="leading-5">
                        <p>{row.userName || "-"}</p>
                        <p className="text-xs text-slate-500">
                          {row.userEmail || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      {new Date(row.createdAt).toLocaleString(
                        isArabic ? "ar" : "en",
                      )}
                    </td>
                    <td className="py-2 px-2 font-mono text-xs">
                      {row.reference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};

const KpiCard = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900">
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
      {title}
    </p>
    <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
      {value}
    </p>
  </div>
);

export default FinancialReportPanel;
