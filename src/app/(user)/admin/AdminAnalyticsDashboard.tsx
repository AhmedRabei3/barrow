"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  activeUntil: string | null;
  activatedSince: string | null;
  activeForDays: number;
  balance: number;
  pendingReferralEarnings: number;
  totalCharged: number;
  rechargeCount: number;
  repeatedSubscription: boolean;
  invitedCount: number;
  activeInvitedCount: number;
  daysToExpiry: number | null;
  monthlyProfitPotential: boolean;
  renewalIncentiveCandidate: boolean;
  lowEarningsCandidate: boolean;
};

type DashboardResponse = {
  overview: {
    totalSubscribers: number;
    activeSubscribers: number;
    repeatedSubscribers: number;
    totalPendingReferralEarnings: number;
    totalUserBalances: number;
    monthlyProfitPotentialUsers: number;
    renewalIncentiveCandidates: number;
    lowEarningCandidates: number;
    lowEarningsThreshold: number;
    platformEarningsTotal: number;
    platformEarningsToday: number;
    platformEarningsMonth: number;
    programEarningsTotal: number;
    programEarningsToday: number;
    programEarningsMonth: number;
    receivedAmountTotal: number;
    receivedAmountToday: number;
    receivedAmountMonth: number;
    paidOutAmountTotal: number;
    paidOutAmountToday: number;
    paidOutAmountMonth: number;
    netProfitAmount: number;
    receivedViaPaypal: number;
    receivedViaShamCash: number;
    paidOutViaPaypal: number;
    paidOutViaShamCash: number;
    paidOutManualSettlements: number;
    paypalWalletEstimatedBalance: number;
    shamCashWalletEstimatedBalance: number;
  };
  users: DashboardUser[];
};

type RewardSettings = {
  lowEarningsThreshold: number;
  candidateCount: number;
  minReward: number;
  maxReward: number;
};

const REWARD_SETTINGS_STORAGE_KEY = "admin-random-reward-settings-v1";

type SortKey =
  | "name"
  | "status"
  | "balance"
  | "activeInvitedCount"
  | "rechargeCount"
  | "activeForDays";
type SortDirection = "asc" | "desc";

const AdminAnalyticsDashboard = () => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "BLOCKED"
  >("ALL");
  const [repeatFilter, setRepeatFilter] = useState<"ALL" | "YES" | "NO">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [overview, setOverview] = useState<DashboardResponse["overview"]>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    repeatedSubscribers: 0,
    totalPendingReferralEarnings: 0,
    totalUserBalances: 0,
    monthlyProfitPotentialUsers: 0,
    renewalIncentiveCandidates: 0,
    lowEarningCandidates: 0,
    lowEarningsThreshold: 20,
    platformEarningsTotal: 0,
    platformEarningsToday: 0,
    platformEarningsMonth: 0,
    programEarningsTotal: 0,
    programEarningsToday: 0,
    programEarningsMonth: 0,
    receivedAmountTotal: 0,
    receivedAmountToday: 0,
    receivedAmountMonth: 0,
    paidOutAmountTotal: 0,
    paidOutAmountToday: 0,
    paidOutAmountMonth: 0,
    netProfitAmount: 0,
    receivedViaPaypal: 0,
    receivedViaShamCash: 0,
    paidOutViaPaypal: 0,
    paidOutViaShamCash: 0,
    paidOutManualSettlements: 0,
    paypalWalletEstimatedBalance: 0,
    shamCashWalletEstimatedBalance: 0,
  });
  const [rewardSettings, setRewardSettings] = useState<RewardSettings>({
    lowEarningsThreshold: 20,
    candidateCount: 12,
    minReward: 2,
    maxReward: 8,
  });
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(REWARD_SETTINGS_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as Partial<RewardSettings>;
      setRewardSettings((prev) => ({
        lowEarningsThreshold:
          typeof parsed.lowEarningsThreshold === "number" &&
          parsed.lowEarningsThreshold >= 0
            ? parsed.lowEarningsThreshold
            : prev.lowEarningsThreshold,
        candidateCount:
          typeof parsed.candidateCount === "number" &&
          parsed.candidateCount >= 1
            ? parsed.candidateCount
            : prev.candidateCount,
        minReward:
          typeof parsed.minReward === "number" && parsed.minReward > 0
            ? parsed.minReward
            : prev.minReward,
        maxReward:
          typeof parsed.maxReward === "number" &&
          parsed.maxReward >= (parsed.minReward ?? prev.minReward)
            ? parsed.maxReward
            : prev.maxReward,
      }));
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      REWARD_SETTINGS_STORAGE_KEY,
      JSON.stringify(rewardSettings),
    );
  }, [rewardSettings]);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        lowEarningsThreshold: String(rewardSettings.lowEarningsThreshold),
      });
      const res = await fetch(`/api/admin/dashboard?${params.toString()}`);
      if (!res.ok) {
        throw new Error(
          t("فشل تحميل لوحة الإدارة", "Failed to load admin dashboard"),
        );
      }

      const data = (await res.json()) as DashboardResponse;
      setOverview(data.overview);
      setUsers(data.users);
    } catch {
      toast.error(
        t("فشل تحميل لوحة الإدارة", "Failed to load admin dashboard"),
      );
    } finally {
      setLoading(false);
    }
  }, [rewardSettings.lowEarningsThreshold, t]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const totalRewardsEstimate = useMemo(
    () => users.reduce((sum, user) => sum + user.balance, 0),
    [users],
  );

  const renewalCandidates = useMemo(
    () => users.filter((user) => user.renewalIncentiveCandidate),
    [users],
  );

  const earningsChartData = useMemo(
    () => [
      {
        name: t("اليوم", "Today"),
        platform: overview.platformEarningsToday,
        program: overview.programEarningsToday,
      },
      {
        name: t("هذا الشهر", "This month"),
        platform: overview.platformEarningsMonth,
        program: overview.programEarningsMonth,
      },
      {
        name: t("الإجمالي", "Total"),
        platform: overview.platformEarningsTotal,
        program: overview.programEarningsTotal,
      },
    ],
    [
      overview.platformEarningsMonth,
      overview.platformEarningsToday,
      overview.platformEarningsTotal,
      overview.programEarningsMonth,
      overview.programEarningsToday,
      overview.programEarningsTotal,
      t,
    ],
  );

  const usersStatusChartData = useMemo(
    () => [
      {
        name: t("مفعل", "Active"),
        value: overview.activeSubscribers,
        color: "#10b981",
      },
      {
        name: t("غير مفعل", "Inactive"),
        value: Math.max(
          overview.totalSubscribers - overview.activeSubscribers,
          0,
        ),
        color: "#f59e0b",
      },
      {
        name: t("محظور", "Blocked"),
        value: Math.max(users.filter((user) => user.isDeleted).length, 0),
        color: "#ef4444",
      },
    ],
    [overview.activeSubscribers, overview.totalSubscribers, t, users],
  );

  const filteredUsers = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !searchTerm ||
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && user.isActive && !user.isDeleted) ||
        (statusFilter === "INACTIVE" && !user.isActive && !user.isDeleted) ||
        (statusFilter === "BLOCKED" && user.isDeleted);

      const matchesRepeat =
        repeatFilter === "ALL" ||
        (repeatFilter === "YES" && user.repeatedSubscription) ||
        (repeatFilter === "NO" && !user.repeatedSubscription);

      return matchesSearch && matchesStatus && matchesRepeat;
    });
  }, [users, search, statusFilter, repeatFilter]);

  const exportCsv = useCallback(() => {
    if (filteredUsers.length === 0) {
      toast.error(t("لا توجد بيانات للتصدير", "No data to export"));
      return;
    }

    const headers = [
      "name",
      "email",
      "status",
      "balance",
      "pendingReferralEarnings",
      "monthlyProfitPotential",
      "renewalIncentiveCandidate",
      "daysToExpiry",
      "totalCharged",
      "invitedCount",
      "activeInvitedCount",
      "rechargeCount",
      "repeatedSubscription",
      "activeForDays",
      "activeUntil",
    ];

    const rows = filteredUsers.map((user) => [
      user.name,
      user.email,
      user.isDeleted ? "BLOCKED" : user.isActive ? "ACTIVE" : "INACTIVE",
      user.balance.toFixed(2),
      user.pendingReferralEarnings.toFixed(2),
      user.monthlyProfitPotential ? "YES" : "NO",
      user.renewalIncentiveCandidate ? "YES" : "NO",
      user.daysToExpiry === null ? "" : String(user.daysToExpiry),
      user.totalCharged.toFixed(2),
      String(user.invitedCount),
      String(user.activeInvitedCount),
      String(user.rechargeCount),
      user.repeatedSubscription ? "YES" : "NO",
      String(user.activeForDays),
      user.activeUntil ?? "",
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
    link.download = `admin-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredUsers, t]);

  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];

    list.sort((a, b) => {
      const statusRank = (user: DashboardUser) => {
        if (user.isDeleted) return 0;
        if (user.isActive) return 2;
        return 1;
      };

      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "status":
          aValue = statusRank(a);
          bValue = statusRank(b);
          break;
        case "balance":
          aValue = a.balance;
          bValue = b.balance;
          break;
        case "activeInvitedCount":
          aValue = a.activeInvitedCount;
          bValue = b.activeInvitedCount;
          break;
        case "rechargeCount":
          aValue = a.rechargeCount;
          bValue = b.rechargeCount;
          break;
        case "activeForDays":
          aValue = a.activeForDays;
          bValue = b.activeForDays;
          break;
        case "name":
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredUsers, sortBy, sortDirection]);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortBy === key) {
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
        return;
      }

      setSortBy(key);
      setSortDirection("asc");
    },
    [sortBy],
  );

  const callAction = useCallback(
    async (
      action: "BLOCK" | "NOTIFY" | "REWARD" | "RANDOM_LOW_REWARD",
      payload?: {
        userId?: string;
        message?: string;
        amount?: number;
        candidateCount?: number;
        maxBalance?: number;
        minReward?: number;
        maxReward?: number;
      },
    ) => {
      try {
        setActionLoadingId(payload?.userId ?? "__batch__");
        const res = await fetch("/api/admin/dashboard/actions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...payload }),
        });

        if (!res.ok) {
          const data = (await res.json()) as { message?: string };
          throw new Error(
            data.message || t("فشل تنفيذ الإجراء", "Action failed"),
          );
        }

        if (action === "RANDOM_LOW_REWARD") {
          const data = (await res.json()) as {
            rewardedUserName?: string;
            amount?: number;
          };
          toast.success(
            data.rewardedUserName
              ? isArabic
                ? `🎉 تمت مكافأة ${data.rewardedUserName} بمبلغ $${Number(data.amount ?? 0).toFixed(2)}`
                : `🎉 ${data.rewardedUserName} was rewarded $${Number(data.amount ?? 0).toFixed(2)}`
              : t(
                  "تم تنفيذ المكافأة العشوائية بنجاح",
                  "Random reward completed successfully",
                ),
          );
        } else {
          toast.success(
            t("تم تنفيذ الإجراء بنجاح", "Action completed successfully"),
          );
        }

        await loadDashboard();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("فشل تنفيذ الإجراء", "Action failed"),
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [isArabic, loadDashboard, t],
  );

  const handleNotify = async (userId: string) => {
    const message = window.prompt(
      t("اكتب رسالة التنبيه للمستخدم:", "Write the notification message:"),
    );
    if (!message) return;
    await callAction("NOTIFY", { userId, message });
  };

  const handleReward = async (userId: string) => {
    const amountRaw = window.prompt(
      t("قيمة المكافأة بالدولار:", "Reward amount in USD:"),
    );
    if (!amountRaw) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("قيمة المكافأة غير صحيحة", "Invalid reward amount"));
      return;
    }
    const message = window.prompt(
      t("رسالة المكافأة (اختياري)", "Reward message (optional)"),
      t(
        "تهانينا، تمت مكافأتك من الإدارة تقديراً لتميزك.",
        "Congratulations, you received an admin reward for your performance.",
      ),
    );
    await callAction("REWARD", {
      userId,
      amount,
      message: message || undefined,
    });
  };

  const handleRenewalReward = async (userId: string) => {
    const amountRaw = window.prompt(
      t("قيمة مكافأة التجديد بالدولار:", "Renewal reward amount in USD:"),
      "3",
    );
    if (!amountRaw) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("قيمة المكافأة غير صحيحة", "Invalid reward amount"));
      return;
    }

    await callAction("REWARD", {
      userId,
      amount,
      message: t(
        "🎯 مكافأة تحفيزية للتجديد: يسعدنا استمرارك معنا، وجدد اشتراكك للاستفادة الكاملة من مزايا الحساب.",
        "🎯 Renewal incentive reward: we’re glad to have you with us—renew to enjoy all account benefits.",
      ),
    });
  };

  const handleRandomLowReward = async () => {
    if (
      !Number.isFinite(rewardSettings.lowEarningsThreshold) ||
      rewardSettings.lowEarningsThreshold < 0
    ) {
      toast.error(
        t("حد الأقل ربحًا غير صالح", "Invalid low-earnings threshold"),
      );
      return;
    }

    if (
      !Number.isFinite(rewardSettings.minReward) ||
      !Number.isFinite(rewardSettings.maxReward) ||
      rewardSettings.minReward <= 0 ||
      rewardSettings.maxReward < rewardSettings.minReward
    ) {
      toast.error(t("نطاق المكافأة غير صالح", "Invalid reward range"));
      return;
    }

    await callAction("RANDOM_LOW_REWARD", {
      maxBalance: rewardSettings.lowEarningsThreshold,
      candidateCount: Math.max(1, Math.floor(rewardSettings.candidateCount)),
      minReward: rewardSettings.minReward,
      maxReward: rewardSettings.maxReward,
    });
  };

  const handleBlock = async (userId: string) => {
    const message = window.prompt(
      t("سبب الحظر (اختياري)", "Block reason (optional)"),
      t(
        "تم تقييد حسابك من قبل الإدارة. يرجى التواصل مع الدعم.",
        "Your account was restricted by admin. Please contact support.",
      ),
    );
    if (
      !window.confirm(
        t(
          "هل أنت متأكد من حظر هذا المستخدم؟",
          "Are you sure you want to block this user?",
        ),
      )
    )
      return;
    await callAction("BLOCK", { userId, message: message || undefined });
  };

  if (loading) {
    return (
      <p className="text-slate-500 dark:text-slate-300">
        {t("جاري تحميل لوحة التحكم...", "Loading dashboard...")}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title={t("إجمالي المشتركين", "Total subscribers")}
          value={overview.totalSubscribers}
        />
        <KpiCard
          title={t("المشتركون المفعلون", "Active subscribers")}
          value={overview.activeSubscribers}
        />
        <KpiCard
          title={t("كرروا الاشتراك", "Repeated subscriptions")}
          value={overview.repeatedSubscribers}
        />
        <KpiCard
          title={t("إجمالي الأرصدة الحالية", "Total current balances")}
          value={`$${overview.totalUserBalances.toFixed(2)}`}
        />
        <KpiCard
          title={t(
            "إجمالي أرباح الإحالة المعلقة",
            "Total pending referral earnings",
          )}
          value={`$${overview.totalPendingReferralEarnings.toFixed(2)}`}
        />
        <KpiCard
          title={t(
            "مرشحون لربح شهري شبه ثابت",
            "Potential monthly-profit users",
          )}
          value={overview.monthlyProfitPotentialUsers}
        />
        <KpiCard
          title={t("مرشحون لمكافأة التجديد", "Renewal incentive candidates")}
          value={overview.renewalIncentiveCandidates}
        />
        <KpiCard
          title={t("الأقل ربحًا (مرشحون)", "Low-earnings candidates")}
          value={overview.lowEarningCandidates}
        />
        <KpiCard
          title={t("أرباح المنصة الكلية", "Total platform earnings")}
          value={`$${overview.platformEarningsTotal.toFixed(2)}`}
        />
        <KpiCard
          title={t("أرباح المنصة اليوم", "Platform earnings today")}
          value={`$${overview.platformEarningsToday.toFixed(2)}`}
        />
        <KpiCard
          title={t("أرباح المنصة هذا الشهر", "Platform earnings this month")}
          value={`$${overview.platformEarningsMonth.toFixed(2)}`}
        />
        <KpiCard
          title={t("أرباح البرنامج الكلية", "Total program earnings")}
          value={`$${overview.programEarningsTotal.toFixed(2)}`}
        />
        <KpiCard
          title={t("أرباح البرنامج اليوم", "Program earnings today")}
          value={`$${overview.programEarningsToday.toFixed(2)}`}
        />
        <KpiCard
          title={t("أرباح البرنامج هذا الشهر", "Program earnings this month")}
          value={`$${overview.programEarningsMonth.toFixed(2)}`}
        />
        <KpiCard
          title={t("إجمالي المستلَم", "Total received")}
          value={`$${overview.receivedAmountTotal.toFixed(2)}`}
        />
        <KpiCard
          title={t("إجمالي المدفوع", "Total paid out")}
          value={`$${overview.paidOutAmountTotal.toFixed(2)}`}
        />
        <KpiCard
          title={t("الربح الصافي", "Net profit")}
          value={`$${overview.netProfitAmount.toFixed(2)}`}
        />
        <KpiCard
          title={t("رصيد PayPal (تقديري)", "PayPal wallet (estimated)")}
          value={`$${overview.paypalWalletEstimatedBalance.toFixed(2)}`}
        />
        <KpiCard
          title={t("رصيد ShamCash (تقديري)", "ShamCash wallet (estimated)")}
          value={`$${overview.shamCashWalletEstimatedBalance.toFixed(2)}`}
        />
        <KpiCard
          title={t("مستلم عبر PayPal", "Received via PayPal")}
          value={`$${overview.receivedViaPaypal.toFixed(2)}`}
        />
        <KpiCard
          title={t("مستلم عبر ShamCash", "Received via ShamCash")}
          value={`$${overview.receivedViaShamCash.toFixed(2)}`}
        />
        <KpiCard
          title={t("مدفوع عبر PayPal", "Paid via PayPal")}
          value={`$${overview.paidOutViaPaypal.toFixed(2)}`}
        />
        <KpiCard
          title={t("مدفوع عبر ShamCash", "Paid via ShamCash")}
          value={`$${overview.paidOutViaShamCash.toFixed(2)}`}
        />
        <KpiCard
          title={t("مدفوع يدويًا", "Paid manually")}
          value={`$${overview.paidOutManualSettlements.toFixed(2)}`}
        />
      </div>

      <div className="rounded-2xl border border-sky-200 bg-linear-to-r from-sky-50 to-cyan-50 p-4 sm:p-5 dark:border-sky-900 dark:from-sky-950/40 dark:to-slate-900">
        <h4 className="text-sm font-semibold text-sky-900 dark:text-sky-200">
          {t("ملخص التدفق المالي", "Financial flow summary")}
        </h4>
        <p className="mt-1 text-xs text-sky-800 dark:text-sky-300">
          {t(
            "المستلم = مدفوعات مكتملة داخل النظام. المدفوع = سحوبات PayPal + ShamCash + التسويات اليدوية. أرصدة المحافظ تقديرية (الوارد - الصادر) بحسب العمليات المسجلة.",
            "Received = completed payments tracked in-system. Paid out = PayPal + ShamCash withdrawals + manual settlements. Wallet balances are estimated as inflow minus outflow based on recorded operations.",
          )}
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 border border-sky-200 dark:border-slate-700 p-3">
            <p className="text-slate-500 dark:text-slate-400">
              {t("المستلم اليوم", "Received today")}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
              ${overview.receivedAmountToday.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 border border-sky-200 dark:border-slate-700 p-3">
            <p className="text-slate-500 dark:text-slate-400">
              {t("المدفوع اليوم", "Paid out today")}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
              ${overview.paidOutAmountToday.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-slate-900/70 border border-sky-200 dark:border-slate-700 p-3">
            <p className="text-slate-500 dark:text-slate-400">
              {t("الصافي هذا الشهر", "Net this month")}
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-800 dark:text-slate-100">
              $
              {(
                overview.receivedAmountMonth - overview.paidOutAmountMonth
              ).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("اتجاه الأرباح", "Earnings Trend")}
          </h3>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
            {t(
              "مقارنة أرباح المنصة وأرباح البرنامج عبر اليوم، هذا الشهر، والإجمالي.",
              "Compare platform and program earnings across today, this month, and total.",
            )}
          </p>
          <div className="h-72 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={earningsChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#475569", fontSize: 12 }}
                />
                <YAxis tick={{ fill: "#475569", fontSize: 12 }} />
                <Tooltip />
                <Bar
                  dataKey="platform"
                  radius={[6, 6, 0, 0]}
                  fill="#0ea5e9"
                  name={t("أرباح المنصة", "Platform")}
                />
                <Bar
                  dataKey="program"
                  radius={[6, 6, 0, 0]}
                  fill="#6366f1"
                  name={t("أرباح البرنامج", "Program")}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("توزيع حالة المستخدمين", "Users Status Split")}
          </h3>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
            {t(
              "نسبة المفعلين مقابل غير المفعلين والمحظورين.",
              "Active vs inactive vs blocked users distribution.",
            )}
          </p>
          <div className="h-72 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={usersStatusChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={84}
                  paddingAngle={3}
                >
                  {usersStatusChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 gap-1 text-xs text-slate-600 dark:text-slate-300">
            {usersStatusChartData.map((entry) => (
              <div
                key={`legend-${entry.name}`}
                className="flex items-center justify-between"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}
                </span>
                <span className="font-semibold">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-cyan-50 p-4 sm:p-5 dark:border-emerald-900 dark:from-emerald-950/40 dark:to-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              {t(
                "مؤشرات الربح الشهري والتحفيز",
                "Monthly profit & incentive indicators",
              )}
            </h4>
            <p className="text-xs text-emerald-800 mt-1 dark:text-emerald-300">
              {t(
                'المستخدمون المصنفون كـ "ربح شهري شبه ثابت" لديهم نمط اشتراك متكرر + دعوات مفعلة، ويمكن تحفيز المرشحين القريبين من انتهاء الاشتراك بمكافآت بسيطة لرفع معدل التجديد.',
                "Users marked as monthly-profit potential usually have repeated subscriptions + active invites. Near-expiry users can be encouraged with small rewards to improve renewal rate.",
              )}
            </p>
          </div>
          <span className="text-xs rounded-full bg-white border border-emerald-300 px-2 py-1 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-200">
            {t("إجمالي الأرصدة", "Total balances")}: $
            {totalRewardsEstimate.toFixed(2)}
          </span>
        </div>

        <div className="mt-3 text-xs text-emerald-900 dark:text-emerald-200">
          {t("مرشحو التحفيز الحاليون", "Current incentive candidates")}:{" "}
          {renewalCandidates.length}
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <label className="text-xs text-emerald-900 dark:text-emerald-200">
            {t("حد الأقل ربحًا", "Low-earnings threshold")}
            <input
              type="number"
              min={0}
              value={rewardSettings.lowEarningsThreshold}
              onChange={(event) =>
                setRewardSettings((prev) => ({
                  ...prev,
                  lowEarningsThreshold: Number(event.target.value || 0),
                }))
              }
              className="mt-1 w-full border border-emerald-300 rounded px-2 py-1 bg-white dark:bg-slate-900 dark:border-emerald-700 dark:text-slate-100"
            />
          </label>

          <label className="text-xs text-emerald-900 dark:text-emerald-200">
            {t("عدد المرشحين", "Candidate count")}
            <input
              type="number"
              min={1}
              value={rewardSettings.candidateCount}
              onChange={(event) =>
                setRewardSettings((prev) => ({
                  ...prev,
                  candidateCount: Number(event.target.value || 1),
                }))
              }
              className="mt-1 w-full border border-emerald-300 rounded px-2 py-1 bg-white dark:bg-slate-900 dark:border-emerald-700 dark:text-slate-100"
            />
          </label>

          <label className="text-xs text-emerald-900 dark:text-emerald-200">
            {t("أقل مكافأة", "Min reward")}
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={rewardSettings.minReward}
              onChange={(event) =>
                setRewardSettings((prev) => ({
                  ...prev,
                  minReward: Number(event.target.value || 0),
                }))
              }
              className="mt-1 w-full border border-emerald-300 rounded px-2 py-1 bg-white dark:bg-slate-900 dark:border-emerald-700 dark:text-slate-100"
            />
          </label>

          <label className="text-xs text-emerald-900 dark:text-emerald-200">
            {t("أعلى مكافأة", "Max reward")}
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={rewardSettings.maxReward}
              onChange={(event) =>
                setRewardSettings((prev) => ({
                  ...prev,
                  maxReward: Number(event.target.value || 0),
                }))
              }
              className="mt-1 w-full border border-emerald-300 rounded px-2 py-1 bg-white dark:bg-slate-900 dark:border-emerald-700 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="mt-2 text-[11px] text-emerald-800 dark:text-emerald-300">
          {t("الحد الفعلي المطبق حاليًا", "Current applied threshold")}: $
          {overview.lowEarningsThreshold.toFixed(2)}
        </div>

        <button
          onClick={handleRandomLowReward}
          disabled={actionLoadingId === "__batch__"}
          className="mt-3 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 text-white text-xs px-4 py-2.5 disabled:opacity-50 hover:from-emerald-700 hover:to-teal-700 shadow-sm"
        >
          {t("مكافأة عشوائية للأقل ربحًا", "Random reward for low earners")}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("بحث بالاسم أو البريد", "Search by name or email")}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "ALL" | "ACTIVE" | "INACTIVE" | "BLOCKED",
              )
            }
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="ALL">{t("كل الحالات", "All statuses")}</option>
            <option value="ACTIVE">{t("مفعل", "Active")}</option>
            <option value="INACTIVE">{t("غير مفعل", "Inactive")}</option>
            <option value="BLOCKED">{t("محظور", "Blocked")}</option>
          </select>

          <select
            value={repeatFilter}
            onChange={(event) =>
              setRepeatFilter(event.target.value as "ALL" | "YES" | "NO")
            }
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="ALL">
              {t("الكل (تكرار الاشتراك)", "All (subscription repeat)")}
            </option>
            <option value="YES">{t("كرر الاشتراك", "Repeated")}</option>
            <option value="NO">{t("لم يكرر الاشتراك", "Not repeated")}</option>
          </select>

          <button
            onClick={exportCsv}
            className="rounded-xl bg-linear-to-r from-slate-800 to-indigo-700 text-white text-sm px-3 py-2.5 dark:from-slate-700 dark:to-indigo-600"
          >
            {t("تصدير CSV", "Export CSV")}
          </button>
        </div>

        <p className="text-xs text-slate-500 mt-2 dark:text-slate-400">
          {t("النتائج المعروضة", "Displayed results")}: {filteredUsers.length}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full min-w-275 text-sm">
          <thead className="bg-linear-to-r from-slate-50 to-indigo-50 text-slate-700 dark:from-slate-800 dark:to-slate-800 dark:text-slate-200">
            <tr>
              <ThSortable
                sortable
                sortKey="name"
                activeSort={sortBy}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t("المستخدم", "User")}
              </ThSortable>
              <ThSortable
                sortable
                sortKey="status"
                activeSort={sortBy}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t("الحالة", "Status")}
              </ThSortable>
              <ThSortable
                sortable
                sortKey="balance"
                activeSort={sortBy}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t("الأرباح/الرصيد", "Earnings/Balance")}
              </ThSortable>
              <ThSortable
                sortable
                sortKey="activeInvitedCount"
                activeSort={sortBy}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t("دعوات مفعلة", "Active invites")}
              </ThSortable>
              <ThSortable
                sortable
                sortKey="rechargeCount"
                activeSort={sortBy}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t("كرر الاشتراك", "Repeated subscription")}
              </ThSortable>
              <ThSortable
                sortable
                sortKey="activeForDays"
                activeSort={sortBy}
                direction={sortDirection}
                onSort={handleSort}
              >
                {t("مفعل منذ", "Active since")}
              </ThSortable>
              <Th>{t("الإجراءات", "Actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map((user) => {
              const activeSince = user.activatedSince
                ? new Date(user.activatedSince).toLocaleDateString(
                    isArabic ? "ar" : "en-US",
                  )
                : "—";

              return (
                <tr
                  key={user.id}
                  className="border-t border-slate-100 align-top dark:border-slate-800"
                >
                  <Td>
                    <div className="font-semibold text-slate-800 dark:text-slate-100">
                      {user.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {user.email}
                    </div>
                  </Td>
                  <Td>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        user.isDeleted
                          ? "bg-red-100 text-red-700"
                          : user.isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {user.isDeleted
                        ? t("محظور", "Blocked")
                        : user.isActive
                          ? t("مفعل", "Active")
                          : t("غير مفعل", "Inactive")}
                    </span>
                  </Td>
                  <Td>
                    <div>
                      {t("الرصيد", "Balance")}: ${user.balance.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t("أرباح إحالة معلقة", "Pending referral earnings")}: $
                      {user.pendingReferralEarnings.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t("إجمالي الشحن", "Total recharged")}: $
                      {user.totalCharged.toFixed(2)}
                    </div>
                    {user.monthlyProfitPotential && (
                      <div className="text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        {t("ربح شهري شبه ثابت", "Monthly-profit potential")}
                      </div>
                    )}
                    {user.renewalIncentiveCandidate && (
                      <div className="text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        {t("يحتاج تحفيز تجديد", "Needs renewal incentive")}
                      </div>
                    )}
                    {user.lowEarningsCandidate && (
                      <div className="text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                        {t("من الأقل ربحًا", "Low-earner candidate")}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <div>
                      {user.activeInvitedCount} {t("مفعل", "active")}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t("من أصل", "Out of")} {user.invitedCount}
                    </div>
                  </Td>
                  <Td>
                    {user.repeatedSubscription ? (
                      <span className="text-emerald-700 font-semibold">
                        {t("نعم", "Yes")}
                      </span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">
                        {t("لا", "No")}
                      </span>
                    )}
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {user.rechargeCount} {t("مرة", "times")}
                    </div>
                  </Td>
                  <Td>
                    <div>{activeSince}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {user.activeForDays} {t("يوم", "days")}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {t("متبقي", "Remaining")}:{" "}
                      {user.daysToExpiry === null
                        ? "—"
                        : `${user.daysToExpiry} ${t("يوم", "days")}`}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleNotify(user.id)}
                        disabled={actionLoadingId === user.id}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs disabled:opacity-50"
                      >
                        {t("تنبيه", "Notify")}
                      </button>
                      <button
                        onClick={() => handleReward(user.id)}
                        disabled={actionLoadingId === user.id || user.isDeleted}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs disabled:opacity-50"
                      >
                        {t("مكافأة", "Reward")}
                      </button>
                      <button
                        onClick={() => handleRenewalReward(user.id)}
                        disabled={
                          actionLoadingId === user.id ||
                          user.isDeleted ||
                          !user.renewalIncentiveCandidate
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs disabled:opacity-50"
                      >
                        {t("مكافأة تجديد", "Renewal reward")}
                      </button>
                      <button
                        onClick={() => handleBlock(user.id)}
                        disabled={actionLoadingId === user.id || user.isDeleted}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs disabled:opacity-50"
                      >
                        {t("حظر", "Block")}
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const KpiCard = ({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900">
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
      {title}
    </p>
    <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
      {value}
    </p>
  </div>
);

const Th = ({ children }: { children: React.ReactNode }) => (
  <th className="text-right px-3 py-3 font-semibold">{children}</th>
);

const SortIcon = ({
  isActive,
  direction,
}: {
  isActive: boolean;
  direction: SortDirection;
}) => {
  if (!isActive)
    return <span className="text-slate-300 dark:text-slate-500">↕</span>;
  return (
    <span className="text-slate-600 dark:text-slate-300">
      {direction === "asc" ? "↑" : "↓"}
    </span>
  );
};

const ThSortable = ({
  children,
  sortable,
  sortKey,
  activeSort,
  direction,
  onSort,
}: {
  children: React.ReactNode;
  sortable?: boolean;
  sortKey?: SortKey;
  activeSort?: SortKey;
  direction?: SortDirection;
  onSort?: (key: SortKey) => void;
}) => {
  if (!sortable || !sortKey || !onSort || !activeSort || !direction) {
    return <th className="text-right px-3 py-3 font-semibold">{children}</th>;
  }

  const isActive = activeSort === sortKey;

  return (
    <th className="text-right px-3 py-3 font-semibold">
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-slate-900"
        onClick={() => onSort(sortKey)}
      >
        {children}
        <SortIcon isActive={isActive} direction={direction} />
      </button>
    </th>
  );
};

const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="px-3 py-3 text-slate-700 dark:text-slate-200">{children}</td>
);

export default AdminAnalyticsDashboard;
