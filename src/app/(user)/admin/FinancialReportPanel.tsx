"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MdOutlineTune } from "react-icons/md";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { useStaleResource } from "@/app/hooks/useStaleResource";

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

type ChannelBreakdownRow = {
  channel: Exclude<ReportChannel, "ALL">;
  amount: number;
  count: number;
};

type SubscriptionMethodBreakdownRow = {
  method:
    | "PAYPAL"
    | "SHAMCASH"
    | "CARD"
    | "BANK_TRANSFER"
    | "CRYPTO"
    | "BALANCE"
    | "OTHER";
  amount: number;
  count: number;
  percentage: number;
};

type ProfitLedgerBreakdownRow = {
  type: string;
  amount: number;
  count: number;
};

type ProfitLedgerEntryRow = {
  id: string;
  type: string;
  amount: number;
  createdAt: string;
  referenceId: string;
  note: string;
  userId: string;
  userName: string;
  userEmail: string;
};

type MonthlyTrendRow = {
  monthKey: string;
  receivedAmount: number;
  paidOutAmount: number;
  netProfitAmount: number;
  receivedCount: number;
  paidOutCount: number;
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
    readyUserBalances: number;
    pendingReferralEarnings: number;
    totalLiveUserLiabilities: number;
    operatingReserveAmount: number;
    previousOwnerWithdrawalsTotal: number;
    availableToWithdraw: number;
    totalSubscribers: number;
    activeSubscribers: number;
    pendingManualWithdrawalAmount: number;
    pendingManualWithdrawalCount: number;
  };
  walletEstimates: {
    paypal: number;
    shamCash: number;
  };
  breakdowns: {
    inflowByChannel: ChannelBreakdownRow[];
    outflowByChannel: ChannelBreakdownRow[];
    subscriptionMethodBreakdown: SubscriptionMethodBreakdownRow[];
    profitLedgerBreakdown: ProfitLedgerBreakdownRow[];
  };
  monthlyTrend: MonthlyTrendRow[];
  adminWithdrawals: AdminWithdrawalRow[];
  recentProfitLedgerEntries: ProfitLedgerEntryRow[];
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
  const cacheKey = useMemo(
    () =>
      `admin:financial-report:${dateFrom}:${dateTo}:${channel}:${isArabic ? "ar" : "en"}`,
    [channel, dateFrom, dateTo, isArabic],
  );

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

  const subscriptionMethodLabel = useCallback(
    (method: SubscriptionMethodBreakdownRow["method"]) => {
      if (method === "PAYPAL") return "PayPal";
      if (method === "SHAMCASH") return "ShamCash";
      if (method === "CARD") return t("بطاقة", "Card");
      if (method === "BANK_TRANSFER")
        return t("تحويل/كود تفعيل", "Transfer / activation code");
      if (method === "CRYPTO") return t("عملة رقمية", "Crypto");
      if (method === "BALANCE") return t("الرصيد", "Balance");
      return t("أخرى", "Other");
    },
    [t],
  );

  const profitLedgerTypeLabel = useCallback(
    (type: string) => {
      if (type === "SUBSCRIPTION_REVENUE") {
        return t("إيراد اشتراكات", "Subscription revenue");
      }
      if (type === "OPERATING_RESERVE") {
        return t("احتياطي تشغيل", "Operating reserve");
      }
      if (type === "PENDING_REFERRAL_LIABILITY") {
        return t("التزام إحالات معلقة", "Pending referral liability");
      }
      if (type === "READY_BALANCE_BONUS_LIABILITY") {
        return t("رصيد مكافآت جاهز", "Ready bonus balance liability");
      }
      if (type === "ACTIVATION_CODE_LIABILITY") {
        return t("شحن كود تفعيل", "Activation code liability");
      }
      if (type === "TRANSACTION_PAYOUT_LIABILITY") {
        return t("تحرير رصيد مالك", "Owner payout liability");
      }
      if (type === "TRANSACTION_REFUND_LIABILITY") {
        return t("استرداد معاملة", "Transaction refund liability");
      }
      if (type === "USER_WITHDRAWAL_LIABILITY_RELEASE") {
        return t(
          "تحرير التزام بسحب مستخدم",
          "User withdrawal liability release",
        );
      }
      if (type === "FORFEITED_PENDING_EARNINGS_RELEASE") {
        return t("إرجاع إحالات منتهية", "Expired pending earnings release");
      }
      if (type === "MANUAL_REWARD_LIABILITY") {
        return t("مكافأة يدوية", "Manual reward liability");
      }
      if (type === "RANDOM_LOW_REWARD_LIABILITY") {
        return t("مكافأة الأقل ربحاً", "Random low-earning reward liability");
      }
      return type;
    },
    [t],
  );

  const profitLedgerEffectLabel = useCallback(
    (amount: number) =>
      amount >= 0
        ? t("يزيد صافي الربح", "Increases net profit")
        : t("يخفض صافي الربح", "Reduces net profit"),
    [t],
  );

  const formatMonthLabel = useCallback(
    (monthKey: string) => {
      const date = new Date(`${monthKey}-01T00:00:00Z`);
      if (Number.isNaN(date.getTime())) {
        return monthKey;
      }

      return date.toLocaleDateString(isArabic ? "ar" : "en", {
        year: "numeric",
        month: "short",
      });
    },
    [isArabic],
  );

  const fetchReport = useCallback(
    async (signal: AbortSignal) => {
      const params = new URLSearchParams({ dateFrom, dateTo, channel });
      const res = await fetch(
        `/api/admin/financial-report?${params.toString()}`,
        {
          signal,
          cache: "no-store",
        },
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

      return body;
    },
    [channel, dateFrom, dateTo, t],
  );

  const { data, loading, isRefreshing, error, refetch } =
    useStaleResource<FinancialReportResponse>({
      cacheKey,
      fetcher: fetchReport,
    });

  useEffect(() => {
    if (!error) {
      return;
    }

    toast.error(
      error instanceof Error
        ? error.message
        : t("فشل تحميل التقرير المالي", "Failed to load financial report"),
    );
  }, [error, t]);

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

  if (loading && !data) {
    return (
      <p className="text-slate-500 dark:text-slate-300">
        {t("جاري تحميل التقرير المالي...", "Loading financial report...")}
      </p>
    );
  }

  return (
    <section className="space-y-5">
      <div className="admin-card rounded-[28px] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="admin-kicker">
              {t("فلاتر التقرير", "Report filters")}
            </div>
            <h2 className="mt-1 text-lg font-black tracking-tight text-white">
              {t("تصفية الحركة المالية", "Filter financial activity")}
            </h2>
          </div>

          <div className="admin-card-soft inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs text-zinc-300">
            <MdOutlineTune className="text-orange-300" size={16} />
            <span>
              {t("طريقة الدفع الحالية:", "Current payment method:")}{" "}
              {channelLabel(channel)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm text-slate-300">
            {t("من تاريخ", "From")}
            <input
              type="date"
              name="reportDateFrom"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="admin-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>

          <label className="text-sm text-slate-300">
            {t("طريقة الدفع", "Payment Method")}
            <select
              name="reportChannel"
              value={channel}
              onChange={(event) =>
                setChannel(event.target.value as ReportChannel)
              }
              className="admin-select mt-1 w-full rounded-xl px-3 py-2 text-sm"
            >
              <option value="ALL">{t("الكل", "All")}</option>
              <option value="PAYPAL">PayPal</option>
              <option value="SHAMCASH">ShamCash</option>
              <option value="MANUAL">{t("يدوي", "Manual")}</option>
              <option value="OTHER">{t("أخرى", "Other")}</option>
            </select>
          </label>

          <label className="text-sm text-slate-300">
            {t("إلى تاريخ", "To")}
            <input
              type="date"
              name="reportDateTo"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="admin-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={() => void refetch()}
            className="admin-btn-primary rounded-xl px-4 py-2.5 text-sm"
          >
            {t("تحديث التقرير", "Refresh report")}
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="admin-btn-secondary rounded-xl px-4 py-2.5 text-sm"
          >
            {t("تصدير CSV", "Export CSV")}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyThisWeekRange}
            className="admin-card-soft rounded-xl px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800/80"
          >
            {t("هذا الأسبوع", "This week")}
          </button>
          <button
            type="button"
            onClick={applyThisMonthRange}
            className="admin-card-soft rounded-xl px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800/80"
          >
            {t("هذا الشهر", "This month")}
          </button>
        </div>

        {isRefreshing && data && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white/85 px-3 py-1.5 text-xs text-neutral-600 shadow-sm backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            <span>{t("يتم تحديث التقرير...", "Refreshing report...")}</span>
          </div>
        )}
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
          title={t("المصاريف التشغيلية 10%", "10% operating reserve")}
          value={`$${formatMoney(data?.summary.operatingReserveAmount || 0)}`}
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
        <KpiCard
          title={t("أرصدة المستخدمين الجاهزة", "Ready user balances")}
          value={`$${formatMoney(data?.summary.readyUserBalances || 0)}`}
        />
        <KpiCard
          title={t("إحالات معلقة", "Pending referral earnings")}
          value={`$${formatMoney(data?.summary.pendingReferralEarnings || 0)}`}
        />
        <KpiCard
          title={t("جمالي الالتزامات", "Total liabilities")}
          value={`$${formatMoney(data?.summary.totalLiveUserLiabilities || 0)}`}
        />
        <KpiCard
          title={t("سحوبات المالك السابقة", "Previous owner withdrawals")}
          value={`$${formatMoney(data?.summary.previousOwnerWithdrawalsTotal || 0)}`}
        />
        <KpiCard
          title={t("المتاح لسحب المالك", "Owner withdrawable balance")}
          value={`$${formatMoney(data?.summary.availableToWithdraw || 0)}`}
        />
        <KpiCard
          title={t(
            "طلبات السحب اليدوي المفتوحة",
            "Open manual withdrawal requests",
          )}
          value={`${Number(data?.summary.pendingManualWithdrawalCount || 0)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="admin-card-soft rounded-3xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-100">
            {t("إجماليات اليوم", "Daily totals")}
          </h3>
          <div className="space-y-1 text-sm text-zinc-300">
            <p>
              {t("المستلم", "Received")}: $
              {formatMoney(data?.summary.todayReceivedAmount || 0)}
            </p>
            <p className="font-semibold text-white">
              {t("بعد خصم 10% تشغيل", "After 10% reserve")}: $
              {formatMoney(data?.summary.todayNetProfitAmount || 0)}
            </p>
          </div>
        </div>

        <div className="admin-card-soft rounded-3xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-100">
            {t("إجماليات الأسبوع", "Weekly totals")}
          </h3>
          <div className="space-y-1 text-sm text-zinc-300">
            <p>
              {t("المستلم", "Received")}: $
              {formatMoney(data?.summary.weekReceivedAmount || 0)}
            </p>
            <p className="font-semibold text-white">
              {t("بعد خصم 10% تشغيل", "After 10% reserve")}: $
              {formatMoney(data?.summary.weekNetProfitAmount || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="admin-card-soft rounded-3xl p-4">
          <h3 className="mb-2 text-sm font-semibold text-zinc-100">
            {t("لقطة تشغيلية حالية", "Current operational snapshot")}
          </h3>
          <div className="space-y-1 text-sm text-zinc-300">
            <p>
              {t("إجمالي المشتركين", "Total subscribers")}:{" "}
              {data?.summary.totalSubscribers || 0}
            </p>
            <p>
              {t("المشتركون النشطون", "Active subscribers")}:{" "}
              {data?.summary.activeSubscribers || 0}
            </p>
            <p>
              {t(
                "مبلغ طلبات السحب اليدوي المفتوحة",
                "Open manual withdrawal amount",
              )}
              : ${formatMoney(data?.summary.pendingManualWithdrawalAmount || 0)}
            </p>
            <p>
              {t(
                "صافي الربح = المستلم - الالتزامات - 10% تشغيل",
                "Net profit = received - live liabilities - 10% reserve",
              )}
            </p>
            <p>
              {t(
                "المتاح لسحب المالك = صافي الربح - سحوبات المالك السابقة",
                "Owner withdrawable = net profit - previous owner withdrawals",
              )}
            </p>
          </div>
        </div>

        <BreakdownCard
          title={t("توزيع الوارد حسب طريقة الدفع", "Inflow by payment method")}
          rows={data?.breakdowns.inflowByChannel || []}
          channelLabel={channelLabel}
          formatMoney={formatMoney}
        />

        <BreakdownCard
          title={t("توزيع الصادر حسب طريقة الدفع", "Outflow by payment method")}
          rows={data?.breakdowns.outflowByChannel || []}
          channelLabel={channelLabel}
          formatMoney={formatMoney}
        />

        <SubscriptionMethodCard
          title={t("توزيع طرق الاشتراك", "Subscription method percentages")}
          rows={data?.breakdowns.subscriptionMethodBreakdown || []}
          methodLabel={subscriptionMethodLabel}
          formatMoney={formatMoney}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="admin-card rounded-[28px] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">
              {t("تفصيل دفتر الربح", "Profit ledger breakdown")}
            </h3>
            <p className="text-xs text-zinc-500">
              {t(
                "القيم الموجبة ترفع الربح والقيم السالبة تمثل احتياطياً أو التزاماً على المنصة",
                "Positive values raise profit while negative values represent reserve or platform liabilities",
              )}
            </p>
          </div>

          {!data || data.breakdowns.profitLedgerBreakdown.length === 0 ? (
            <p className="text-sm text-zinc-500">
              {t(
                "لا توجد حركات ledger ضمن النطاق",
                "No ledger activity in range",
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="admin-table w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-right">
                      {t("البند", "Entry")}
                    </th>
                    <th className="px-2 py-2 text-right">
                      {t("الأثر", "Effect")}
                    </th>
                    <th className="px-2 py-2 text-right">
                      {t("الصافي", "Net")}
                    </th>
                    <th className="px-2 py-2 text-right">
                      {t("العدد", "Count")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.breakdowns.profitLedgerBreakdown.map((row) => (
                    <tr key={row.type}>
                      <td className="px-2 py-2">
                        {profitLedgerTypeLabel(row.type)}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            row.amount >= 0
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {profitLedgerEffectLabel(row.amount)}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-semibold">
                        ${formatMoney(row.amount)}
                      </td>
                      <td className="px-2 py-2">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="admin-card-soft rounded-3xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-100">
            {t("معادلة الصافي الحالية", "Current net formula")}
          </h3>
          <div className="space-y-2 text-sm text-zinc-300">
            <div className="flex items-center justify-between gap-3">
              <span>{t("الإيراد المستلم", "Received revenue")}</span>
              <span className="font-semibold text-white">
                ${formatMoney(data?.summary.receivedAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t("مجموع الالتزامات", "Total liabilities")}</span>
              <span className="font-semibold text-amber-300">
                -${formatMoney(data?.summary.totalLiveUserLiabilities || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>{t("احتياطي التشغيل", "Operating reserve")}</span>
              <span className="font-semibold text-amber-300">
                -${formatMoney(data?.summary.operatingReserveAmount || 0)}
              </span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between gap-3 text-base">
              <span className="font-semibold text-white">
                {t("صافي الربح", "Net profit")}
              </span>
              <span className="font-black text-white">
                ${formatMoney(data?.summary.netProfitAmount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>
                {t("سحوبات المالك السابقة", "Previous owner withdrawals")}
              </span>
              <span className="font-semibold text-rose-300">
                -$
                {formatMoney(data?.summary.previousOwnerWithdrawalsTotal || 0)}
              </span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between gap-3 text-base">
              <span className="font-semibold text-white">
                {t("المتاح لسحب المالك", "Owner withdrawable balance")}
              </span>
              <span className="font-black text-emerald-300">
                ${formatMoney(data?.summary.availableToWithdraw || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card rounded-[28px] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-100">
            {t("آخر قيود ledger", "Recent ledger entries")}
          </h3>
          <p className="text-xs text-zinc-500">
            {t(
              "آخر 30 حركة دخلت في حساب الربح التاريخي",
              "Latest 30 entries used in historical profit accounting",
            )}
          </p>
        </div>

        {!data || data.recentProfitLedgerEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("لا توجد قيود حديثة", "No recent ledger entries")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-right py-2 px-2">{t("النوع", "Type")}</th>
                  <th className="text-right py-2 px-2">
                    {t("المبلغ", "Amount")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("المستخدم", "User")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("ملاحظة", "Note")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("التاريخ", "Date")}
                  </th>
                  <th className="text-right py-2 px-2">
                    {t("المرجع", "Reference")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.recentProfitLedgerEntries.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2 px-2">
                      {profitLedgerTypeLabel(row.type)}
                    </td>
                    <td className="py-2 px-2 font-semibold">
                      <span
                        className={
                          row.amount >= 0
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }
                      >
                        ${formatMoney(row.amount)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="leading-5">
                        <p>{row.userName || "-"}</p>
                        <p className="text-xs text-zinc-500">
                          {row.userEmail || row.userId || "-"}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-2 text-zinc-300">
                      {row.note || "-"}
                    </td>
                    <td className="py-2 px-2">
                      {new Date(row.createdAt).toLocaleString(
                        isArabic ? "ar" : "en",
                      )}
                    </td>
                    <td className="py-2 px-2 font-mono text-xs">
                      {row.referenceId || row.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card rounded-[28px] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-100">
            {t("الاتجاه الشهري", "Monthly trend")}
          </h3>
          <p className="text-xs text-zinc-500">
            {t(
              "يعرض الوارد والصادر والصافي ضمن الفترة المحددة",
              "Shows inflow, outflow, and net values within the selected range",
            )}
          </p>
        </div>

        {!data || data.monthlyTrend.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t("لا توجد بيانات شهرية ضمن النطاق", "No monthly data in range")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-right">
                    {t("الشهر", "Month")}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {t("الوارد", "Inflow")}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {t("الصادر", "Outflow")}
                  </th>
                  <th className="px-2 py-2 text-right">{t("الصافي", "Net")}</th>
                  <th className="px-2 py-2 text-right">
                    {t("عدد الوارد", "Inflow count")}
                  </th>
                  <th className="px-2 py-2 text-right">
                    {t("عدد الصادر", "Outflow count")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.monthlyTrend.map((row) => (
                  <tr key={row.monthKey}>
                    <td className="px-2 py-2">
                      {formatMonthLabel(row.monthKey)}
                    </td>
                    <td className="px-2 py-2">
                      ${formatMoney(row.receivedAmount)}
                    </td>
                    <td className="px-2 py-2">
                      ${formatMoney(row.paidOutAmount)}
                    </td>
                    <td className="px-2 py-2 font-semibold">
                      ${formatMoney(row.netProfitAmount)}
                    </td>
                    <td className="px-2 py-2">{row.receivedCount}</td>
                    <td className="px-2 py-2">{row.paidOutCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="admin-card rounded-[28px] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-zinc-100">
            {t("سحوبات المدير من الصندوق", "Admin fund withdrawals")}
          </h3>
          <p className="text-xs text-zinc-500">
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
          <p className="text-sm text-zinc-500">
            {t(
              "لا توجد سحوبات يدوية ضمن الفترة المحددة",
              "No manual admin withdrawals in selected range",
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr>
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
                  <tr key={row.id}>
                    <td className="py-2 px-2">${formatMoney(row.amount)}</td>
                    <td className="py-2 px-2">
                      <div className="leading-5">
                        <p>{row.userName || "-"}</p>
                        <p className="text-xs text-zinc-500">
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

      <div className="admin-card rounded-[28px] p-4">
        <h3 className="mb-3 text-sm font-semibold text-zinc-100">
          {t("حركات التقرير", "Report movements")}
        </h3>

        {!data || data.rows.length === 0 ? (
          <p className="text-sm text-zinc-500">
            {t(
              "لا توجد عمليات ضمن الفترة المحددة",
              "No records in selected range",
            )}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-right py-2 px-2">{t("النوع", "Type")}</th>
                  <th className="text-right py-2 px-2">
                    {t("طريقة الدفع", "Payment Method")}
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
                  <tr key={row.id}>
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
                        <p className="text-xs text-zinc-500">
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
  <div className="admin-stat-card rounded-3xl p-4">
    <p className="text-xs font-medium dark:text-zinc-100 text-slate-600">
      {title}
    </p>
    <p className="mt-2 text-2xl font-bold tracking-tight dark:text-white text-slate-900">
      {value}
    </p>
  </div>
);

const BreakdownCard = ({
  title,
  rows,
  channelLabel,
  formatMoney,
}: {
  title: string;
  rows: ChannelBreakdownRow[];
  channelLabel: (channel: string) => string;
  formatMoney: (amount: number) => string;
}) => (
  <div className="admin-card-soft rounded-3xl p-4">
    <h3 className="mb-3 text-sm font-semibold text-zinc-500 dark:text-slate-200">
      {title}
    </h3>
    <div className="space-y-2 text-sm text-zinc-300">
      {rows.map((row) => (
        <div
          key={row.channel}
          className="rounded-2xl border border-zinc-800 dark:bg-zinc-950/65 bg-zinc-100 px-3 py-2"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium dark:text-zinc-100 text-slate-500">
                {channelLabel(row.channel)}
              </p>
              <p className="text-xs dark:text-zinc-200 text-zinc-500">
                {row.count} عمليات
              </p>
            </div>
            <p className="font-semibold dark:text-white text-slate-500">
              ${formatMoney(row.amount)}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const SubscriptionMethodCard = ({
  title,
  rows,
  methodLabel,
  formatMoney,
}: {
  title: string;
  rows: SubscriptionMethodBreakdownRow[];
  methodLabel: (method: SubscriptionMethodBreakdownRow["method"]) => string;
  formatMoney: (amount: number) => string;
}) => (
  <div className="admin-card-soft rounded-3xl p-4">
    <h3 className="mb-3 text-sm font-semibold text-zinc-100">{title}</h3>
    <div className="space-y-2 text-sm text-zinc-300">
      {rows.map((row) => (
        <div
          key={row.method}
          className="rounded-2xl border border-zinc-800 dark:bg-zinc-950/65 bg-zinc-100 px-3 py-2"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium dark:text-zinc-100 text-slate-500">
              {methodLabel(row.method)}
            </p>
            <p className="font-semibold text-orange-300">
              {row.percentage.toFixed(2)}%
            </p>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs dark:text-zinc-200 text-zinc-500">
            <span>{row.count} عمليات</span>
            <span>${formatMoney(row.amount)}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default FinancialReportPanel;
