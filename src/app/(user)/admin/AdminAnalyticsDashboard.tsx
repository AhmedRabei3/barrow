"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import type {
  AdminDashboardResponse as DashboardResponse,
  DashboardUser,
} from "@/features/admin/dashboard/types";

type IdentityVerificationRequestDto = {
  id: string;
  fullName: string;
  nationalId: string;
  frontImageUrl: string;
  backImageUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    isIdentityVerified: boolean;
  };
  reviewedBy?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE" | "BLOCKED";

const COLORS = ["#10b981", "#f59e0b", "#f43f5e"];

const AdminAnalyticsDashboard = () => {
  const { isArabic } = useAppPreferences();
  const { data: session } = useSession();
  const isOwnerViewer = Boolean(session?.user?.isOwner);
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [verificationRequests, setVerificationRequests] = useState<
    IdentityVerificationRequestDto[]
  >([]);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [verificationActionId, setVerificationActionId] = useState("");
  const [data, setData] = useState<DashboardResponse>({
    overview: {
      totalUsers: 0,
      totalSubscribers: 0,
      paidSubscribers: 0,
      activeSubscribers: 0,
      repeatedSubscribers: 0,
      totalPendingReferralEarnings: 0,
      totalUserBalances: 0,
      totalLiveUserLiabilities: 0,
      operatingReserveAmount: 0,
      previousOwnerWithdrawalsTotal: 0,
      availableToWithdraw: 0,
      monthlyProfitPotentialUsers: 0,
      renewalIncentiveCandidates: 0,
      lowEarningCandidates: 0,
      lowEarningsThreshold: 0,
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
      statusDistribution: {
        active: 0,
        inactive: 0,
        blocked: 0,
      },
    },
    pagination: {
      page: 1,
      pageSize: 12,
      totalItems: 0,
      totalPages: 1,
    },
    users: [],
    filters: {
      search: "",
      status: "ALL",
      repeat: "ALL",
      sortBy: "name",
      sortDirection: "asc",
    },
  });

  const loadDashboard = useCallback(
    async (nextPage = page) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: "12",
          search,
          status,
        });

        const response = await fetch(
          `/api/admin/dashboard?${params.toString()}`,
        );
        const body = (await response.json()) as DashboardResponse & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(
            body.message ||
              t("تعذر تحميل بيانات المستخدمين", "Failed to load users data"),
          );
        }

        setData((current) => ({
          ...current,
          ...body,
        }));
        setPage(body.pagination.page);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error"),
        );
      } finally {
        setLoading(false);
      }
    },
    [page, search, status, t],
  );

  const loadVerificationRequests = useCallback(async () => {
    try {
      setVerificationLoading(true);
      const response = await fetch("/api/admin/identity-verifications");
      const body = (await response.json()) as {
        requests?: IdentityVerificationRequestDto[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          body.message ||
            t(
              "تعذر تحميل طلبات التوثيق",
              "Failed to load verification requests",
            ),
        );
      }

      setVerificationRequests(body.requests ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setVerificationLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadDashboard(1);
      void loadVerificationRequests();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadDashboard, loadVerificationRequests]);

  const chartData = useMemo(
    () => [
      {
        name: t("مفعل", "Active"),
        value: data.overview.statusDistribution.active,
      },
      {
        name: t("غير مفعل", "Inactive"),
        value: data.overview.statusDistribution.inactive,
      },
      {
        name: t("محظور", "Blocked"),
        value: data.overview.statusDistribution.blocked,
      },
    ],
    [data.overview.statusDistribution, t],
  );

  const formatCurrency = (value: number) => `$${Number(value || 0).toFixed(2)}`;

  const paymentMethodLabel = useCallback(
    (method: string | null, hasActiveSubscription: boolean) => {
      if (method === "PAYPAL") return "PayPal";
      if (method === "SHAMCASH") return "ShamCash";
      if (method === "CARD") return t("بطاقة", "Card");
      if (method === "BANK_TRANSFER")
        return t("تحويل/كود تفعيل", "Transfer / activation code");
      if (method === "CRYPTO") return t("عملة رقمية", "Crypto");
      if (method === "BALANCE") return t("الرصيد", "Balance");
      if (hasActiveSubscription) {
        return t("قديم أو غير موثق", "Legacy or untracked");
      }
      return t("لا يوجد", "None");
    },
    [t],
  );

  const formatDate = (value: string | null) => {
    if (!value) return t("غير متاح", "N/A");
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t("غير متاح", "N/A");
    return date.toLocaleDateString(isArabic ? "ar" : "en-US");
  };

  const handleAdminAction = useCallback(
    async (
      action:
        | "BLOCK"
        | "UNBLOCK"
        | "NOTIFY"
        | "REWARD"
        | "MAKE_ADMIN"
        | "REMOVE_ADMIN",
      user: DashboardUser,
      payload?: { message?: string; amount?: number },
    ) => {
      try {
        setActionLoadingId(user.id);

        const response = await fetch("/api/admin/dashboard/actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-lang": isArabic ? "ar" : "en",
          },
          body: JSON.stringify({
            action,
            userId: user.id,
            ...payload,
          }),
        });

        const body = (await response.json()) as { message?: string };
        if (!response.ok) {
          throw new Error(
            body.message ||
              t("تعذر تنفيذ الإجراء", "Failed to complete action"),
          );
        }

        toast.success(
          body.message ||
            (action === "NOTIFY"
              ? t("تم إرسال الإشعار", "Notification sent")
              : action === "REWARD"
                ? t("تمت إضافة المكافأة", "Reward added")
                : action === "UNBLOCK"
                  ? t("تم رفع الحظر", "User unblocked")
                  : t("تم حظر المستخدم", "User blocked")),
        );

        await loadDashboard(page);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error"),
        );
      } finally {
        setActionLoadingId("");
      }
    },
    [isArabic, loadDashboard, page, t],
  );

  const handleUserAction = async (user: DashboardUser) => {
    const isBlocked = user.isDeleted;
    const action = isBlocked ? "UNBLOCK" : "BLOCK";
    const confirmMessage = isBlocked
      ? t("تأكيد رفع الحظر عن هذا المستخدم؟", "Confirm unblocking this user?")
      : t("تأكيد حظر هذا المستخدم؟", "Confirm blocking this user?");

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const message = isBlocked
      ? undefined
      : window.prompt(t("سبب الحظر اختياري", "Optional block reason")) ||
        undefined;
    await handleAdminAction(action, user, { message });
  };

  const handleNotifyUser = async (user: DashboardUser) => {
    const message = window.prompt(
      t("اكتب نص الإشعار", "Write the notification message"),
    );

    if (!message || !message.trim()) {
      return;
    }

    await handleAdminAction("NOTIFY", user, { message: message.trim() });
  };

  const handleRewardUser = async (user: DashboardUser) => {
    const amountRaw = window.prompt(
      t("قيمة المكافأة بالدولار", "Reward amount in USD"),
      "5",
    );

    if (amountRaw === null) {
      return;
    }

    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("قيمة غير صالحة", "Invalid amount"));
      return;
    }

    const message =
      window.prompt(t("رسالة المكافأة اختيارية", "Optional reward message")) ||
      undefined;

    await handleAdminAction("REWARD", user, { amount, message });
  };

  const handleAdminRoleToggle = async (user: DashboardUser) => {
    const nextAction = user.isAdmin ? "REMOVE_ADMIN" : "MAKE_ADMIN";
    const confirmed = window.confirm(
      user.isAdmin
        ? t("تأكيد سحب صفة المشرف؟", "Confirm revoking admin access?")
        : t("تأكيد تعيينه كمشرف؟", "Confirm promoting this user to admin?"),
    );

    if (!confirmed) {
      return;
    }

    await handleAdminAction(nextAction, user);
  };

  const handleVerificationDecision = async (
    request: IdentityVerificationRequestDto,
    decision: "APPROVE" | "REJECT",
  ) => {
    const adminNote =
      decision === "REJECT"
        ? window.prompt(
            t(
              "سبب الرفض أو ملاحظة للمستخدم",
              "Rejection reason or note for the user",
            ),
          ) || undefined
        : window.prompt(t("ملاحظة إدارية اختيارية", "Optional admin note")) ||
          undefined;

    try {
      setVerificationActionId(request.id);
      const response = await fetch("/api/admin/identity-verifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: request.id,
          decision,
          adminNote,
        }),
      });

      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(
          body.message ||
            t("تعذر تحديث طلب التوثيق", "Failed to update request"),
        );
      }

      toast.success(
        body.message ||
          (decision === "APPROVE"
            ? t("تم اعتماد التوثيق", "Verification approved")
            : t("تم رفض التوثيق", "Verification rejected")),
      );

      await Promise.all([loadVerificationRequests(), loadDashboard(page)]);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setVerificationActionId("");
    }
  };

  return (
    <section className="min-w-0 space-y-6">
      <div className="admin-card min-w-0 overflow-hidden rounded-[28px] p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-2">
            <span className="admin-kicker">
              {t("تشغيل المستخدمين", "User operations")}
            </span>
            <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">
              {t("إدارة المستخدمين", "User Management")}
            </h2>
            <p className="max-w-2xl text-sm text-zinc-400">
              {t(
                "لوحة عملية لإدارة المستخدمين المشتركين وحالاتهم بدون عناصر إضافية غير مهمة.",
                "A focused user-management panel for subscriber status and account actions.",
              )}
            </p>
          </div>

          <div className="admin-card-soft rounded-2xl px-4 py-3 text-sm text-zinc-300">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
              {t("مراجعة سريعة", "Quick review")}
            </div>
            <div className="mt-2 text-zinc-100">
              {t(
                "الإحصاءات التالية هي فقط ما يحتاجه المشغل اليومي: عدد المستخدمين، المشتركون المدفوعون، وتوزيع الحالة.",
                "The metrics below are limited to what an operator actually needs: users, paid subscribers, and status distribution.",
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title={t("عدد المستخدمين الكلي", "Total users")}
            value={String(data.overview.totalUsers)}
            hint={t("يشمل جميع الحالات", "Includes all statuses")}
            accent="sky"
          />
          <MetricCard
            title={t("المشتركون", "Paid subscribers")}
            value={String(data.overview.paidSubscribers)}
            hint={t(
              "المفعلون بالاشتراك المدفوع",
              "Users with paid active subscriptions",
            )}
            accent="orange"
          />
          <MetricCard
            title={t("الربح الصافي", "Net profit")}
            value={formatCurrency(data.overview.netProfitAmount)}
            hint={t(
              "محسوب خادمياً = إجمالي المستلم - الالتزامات الحية - 10% تشغيل.",
              "Server-calculated = total received - live liabilities - 10% reserve.",
            )}
            accent="zinc"
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            title={t("الالتزامات الحية", "Live liabilities")}
            value={formatCurrency(data.overview.totalLiveUserLiabilities)}
            hint={t(
              "أرصدة المستخدمين الجاهزة + أرباح الإحالة المعلقة.",
              "Ready user balances + pending referral earnings.",
            )}
            accent="zinc"
          />
          <MetricCard
            title={t("المصاريف التشغيلية 10%", "10% operating reserve")}
            value={formatCurrency(data.overview.operatingReserveAmount)}
            hint={t(
              "احتياطي تشغيلي محسوب من إجمالي الدخل المدفوع.",
              "Operational reserve calculated from gross paid revenue.",
            )}
            accent="zinc"
          />
          <MetricCard
            title={t("المتاح لسحب المالك", "Owner withdrawable balance")}
            value={formatCurrency(data.overview.availableToWithdraw)}
            hint={t(
              "بعد خصم سحوبات المالك السابقة من صافي الربح.",
              "After subtracting previous owner withdrawals from net profit.",
            )}
            accent="sky"
          />
        </div>

        <div className="mt-6 rounded-[26px] border border-white/10 bg-black/15 p-4 sm:p-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                {t("طلبات توثيق الحساب", "Identity verification requests")}
              </h3>
              <p className="text-sm text-zinc-400">
                {t(
                  "مراجعة صور الهوية والرقم الوطني واعتماد الحسابات الموثقة.",
                  "Review identity uploads and approve verified accounts.",
                )}
              </p>
            </div>
            <div className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
              {t("الطلبات الحالية", "Current requests")}:{" "}
              {verificationRequests.length}
            </div>
          </div>

          <div className="mt-4 grid gap-4 2xl:grid-cols-2">
            {verificationLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-zinc-300">
                {t("جاري تحميل الطلبات...", "Loading requests...")}
              </div>
            ) : verificationRequests.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-sm text-zinc-300">
                {t(
                  "لا توجد طلبات توثيق حاليًا",
                  "No verification requests right now",
                )}
              </div>
            ) : (
              verificationRequests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-3xl border border-white/10 bg-slate-950/40 p-4 text-sm text-zinc-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-white">
                        {request.user.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {request.user.email}
                      </p>
                      <p className="mt-2 text-xs text-zinc-400">
                        {t("الاسم الرسمي", "Official name")}: {request.fullName}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {t("الرقم الوطني", "National ID")}: {request.nationalId}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        request.status === "APPROVED"
                          ? "border border-emerald-500/25 bg-emerald-500/15 text-emerald-300"
                          : request.status === "REJECTED"
                            ? "border border-rose-500/25 bg-rose-500/15 text-rose-300"
                            : "border border-amber-500/25 bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {request.status === "APPROVED"
                        ? t("معتمد", "Approved")
                        : request.status === "REJECTED"
                          ? t("مرفوض", "Rejected")
                          : t("قيد المراجعة", "Pending")}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={request.frontImageUrl}
                        alt={t("الوجه الأمامي", "Front side")}
                        className="h-44 w-full rounded-2xl object-cover"
                      />
                    </div>
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={request.backImageUrl}
                        alt={t("الوجه الخلفي", "Back side")}
                        className="h-44 w-full rounded-2xl object-cover"
                      />
                    </div>
                  </div>

                  {request.adminNote ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs leading-6 text-zinc-300">
                      {request.adminNote}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        handleVerificationDecision(request, "REJECT")
                      }
                      disabled={verificationActionId === request.id}
                      className="rounded-2xl border border-rose-500/25 bg-rose-500/15 px-4 py-2 text-xs font-semibold text-rose-200 transition disabled:opacity-60"
                    >
                      {t("رفض", "Reject")}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleVerificationDecision(request, "APPROVE")
                      }
                      disabled={verificationActionId === request.id}
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                    >
                      {verificationActionId === request.id
                        ? t("جارٍ الحفظ...", "Saving...")
                        : t("اعتماد التوثيق", "Approve verification")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid w-full min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <div className="admin-card min-w-0 rounded-[28px] p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                {t("حالة المشتركين", "Subscriber status")}
              </h3>
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t(
                  "ابحث بالاسم أو البريد",
                  "Search by name or email",
                )}
                className="admin-input min-w-0 rounded-2xl px-4 py-2.5 text-sm outline-none ring-0 transition sm:min-w-72"
              />
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StatusFilter)
                }
                className="admin-select w-full rounded-2xl px-4 py-2.5 text-sm outline-none transition sm:w-auto"
              >
                <option value="ACTIVE">{t("مفعل", "Active")}</option>
                <option value="INACTIVE">{t("غير مفعل", "Inactive")}</option>
                <option value="ALL">{t("كل الحالات", "All statuses")}</option>
                <option value="BLOCKED">{t("محظور", "Blocked")}</option>
              </select>
            </div>
          </div>

          <div className="admin-table-shell mt-5 overflow-x-auto rounded-3xl">
            <table className="admin-table min-w-225 text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="px-3 py-3 text-right">
                    {t("المستخدم", "User")}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t("الحالة", "Status")}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t("الاشتراك", "Subscription")}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t("الأرباح", "Profits")}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t("الإحالات", "Referrals")}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t("التفاصيل", "Details")}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t("الإجراء", "Action")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-1 py-4 text-center dark:text-slate-100 text-slate-500"
                    >
                      {t("جاري تحميل المستخدمين...", "Loading users...")}
                    </td>
                  </tr>
                ) : data.users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-1 py-4 text-center text-slate-500"
                    >
                      {t("لا توجد نتائج مطابقة", "No matching users found")}
                    </td>
                  </tr>
                ) : (
                  data.users.map((user) => {
                    const statusLabel = user.isDeleted
                      ? t("محظور", "Blocked")
                      : user.isActive
                        ? t("مفعل", "Active")
                        : t("غير مفعل", "Inactive");

                    const statusClassName = user.isDeleted
                      ? "bg-rose-500/15 text-rose-600 border border-rose-500/20"
                      : user.isActive
                        ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                        : "bg-amber-500/15 text-amber-600 border border-amber-500/20";

                    return (
                      <tr key={user.id} className="align-top">
                        <td className="px-3 py-4">
                          <div className="font-semibold text-slate-100">
                            {user.name}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {user.email}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {user.isOwner ? (
                              <span className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/15 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-300">
                                {t("مالك التطبيق", "Application owner")}
                              </span>
                            ) : null}
                            {user.isIdentityVerified ? (
                              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                {t("موثق", "Verified")}
                              </span>
                            ) : null}
                            {user.isAdmin && !user.isOwner ? (
                              <span className="rounded-full border border-sky-500/25 bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-300">
                                {t("مشرف", "Admin")}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 text-xs text-zinc-500">
                            {t("تاريخ الانضمام", "Joined")}:{" "}
                            {formatDate(user.createdAt)}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName}`}
                          >
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-3 py-4 text-slate-500">
                          <div>
                            {t("ينتهي في", "Expires")}:{" "}
                            {formatDate(user.activeUntil)}
                          </div>
                          <div className="mt-1">
                            {t("طريقة الدفع", "Payment method")}:{" "}
                            <span className="font-semibold text-sky-500">
                              {paymentMethodLabel(
                                user.subscriptionPaymentMethod,
                                Boolean(user.activeUntil),
                              )}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {t("مرات الدفع", "Recharge count")}:{" "}
                            {user.rechargeCount}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {t("آخر دفعة", "Last payment")}:{" "}
                            {user.latestPaymentAmount !== null
                              ? `${formatCurrency(user.latestPaymentAmount)} - ${formatDate(user.latestPaymentCreatedAt)}`
                              : t("غير موثقة", "Untracked")}
                          </div>
                          <div className="mt-1 text-xs text-zinc-500">
                            {user.repeatedSubscription
                              ? t("مشترك متكرر", "Repeated subscriber")
                              : t(
                                  "أول اشتراك أو غير متكرر",
                                  "Single or first subscription",
                                )}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="font-semibold dark:text-slate-100 text-emerald-500">
                            {t("الجاهز", "Ready")}:{" "}
                            {formatCurrency(user.balance)}
                          </div>
                          <div className="mt-1 dark:text-slate-100 text-amber-500">
                            {t("المعلّق", "Pending")}:{" "}
                            {formatCurrency(user.pendingReferralEarnings)}
                          </div>
                          <div className="mt-1 text-xs dark:text-slate-100 text-sky-600">
                            {t("الإجمالي", "Total")}:{" "}
                            {formatCurrency(user.totalPotentialBalance)}
                          </div>
                        </td>
                        <td className="px-3 py-4 dark:text-slate-100 text-slate-500">
                          <div>
                            {t("المدعوون", "Invited")}: {user.invitedCount}
                          </div>
                          <div className="mt-1 text-xs dark:text-slate-100 text-emerald-500">
                            {t("المفعلون", "Active")}: {user.activeInvitedCount}
                          </div>
                        </td>
                        <td className="px-3 py-4 dark:text-slate-100 text-sky-400">
                          <div>
                            {t("إجمالي المدفوع", "Total charged")}:{" "}
                            {formatCurrency(user.totalCharged)}
                          </div>
                          <div className="mt-1 break-all text-xs dark:text-slate-100 text-zinc-500">
                            {user.id}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex min-w-40 flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => handleNotifyUser(user)}
                              disabled={actionLoadingId === user.id}
                              className="admin-btn-secondary rounded-xl px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t("إشعار", "Notify")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRewardUser(user)}
                              disabled={actionLoadingId === user.id}
                              className="admin-btn-success rounded-xl px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {t("مكافأة", "Reward")}
                            </button>
                            {isOwnerViewer && !user.isOwner ? (
                              <button
                                type="button"
                                onClick={() => handleAdminRoleToggle(user)}
                                disabled={actionLoadingId === user.id}
                                className="rounded-xl border border-sky-500/25 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-300 transition disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {user.isAdmin
                                  ? t("سحب الإشراف", "Revoke admin")
                                  : t("تعيين مشرف", "Make admin")}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleUserAction(user)}
                              disabled={
                                actionLoadingId === user.id || user.isOwner
                              }
                              className={`rounded-xl px-3 py-2 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                user.isDeleted
                                  ? "admin-btn-success"
                                  : "admin-btn-danger"
                              }`}
                            >
                              {actionLoadingId === user.id
                                ? t("جارٍ التنفيذ...", "Processing...")
                                : user.isDeleted
                                  ? t("رفع الحظر", "Unblock")
                                  : t("حظر", "Block")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              {t("عدد النتائج", "Results")}: {data.pagination.totalItems}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => loadDashboard(page - 1)}
                className="admin-btn-secondary rounded-lg px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("السابق", "Previous")}
              </button>
              <span className="text-sm text-zinc-400">
                {page} / {data.pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.pagination.totalPages || loading}
                onClick={() => loadDashboard(page + 1)}
                className="admin-btn-secondary rounded-lg px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("التالي", "Next")}
              </button>
            </div>
          </div>
        </div>

        <div className="admin-card rounded-[28px] p-5 sm:p-6">
          <h3 className="text-lg font-bold text-white">
            {t("توزيع حالة المستخدمين", "User status distribution")}
          </h3>

          <div className="mt-5 h-72 min-w-0">
            <ResponsiveContainer width="100%" height={288} minWidth={0}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={4}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index] || COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2">
            {chartData.map((entry, index) => (
              <div
                key={entry.name}
                className="admin-card-soft flex items-center justify-between rounded-xl px-3 py-2"
              >
                <div className="flex items-center gap-2 text-sm dark:text-slate-100 text-slate-500">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index] || COLORS[0] }}
                  />
                  {entry.name}
                </div>
                <div className="text-sm font-semibold dark:text-slate-100 text-slate-500">
                  {entry.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({
  title,
  value,
  hint,
  accent,
}: {
  title: string;
  value: string;
  hint: string;
  accent: "sky" | "orange" | "zinc";
}) => (
  <div
    className={`rounded-[26px] p-4 sm:p-5 ${
      accent === "orange"
        ? "bg-linear-to-br from-orange-600 to-orange-800 text-white shadow-[0_18px_36px_rgba(249,115,22,0.25)]"
        : accent === "sky"
          ? "admin-stat-card"
          : "admin-card-soft"
    }`}
  >
    <p
      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
        accent === "orange" ? "text-orange-100/70" : "text-zinc-500"
      }`}
    >
      {title}
    </p>
    <p
      className={`mt-3 text-3xl font-black tracking-tight ${
        accent === "zinc" ? "text-zinc-100" : "text-white"
      }`}
    >
      {value}
    </p>
    <p
      className={`mt-3 text-xs leading-5 ${
        accent === "orange" ? "text-orange-100/80" : "text-zinc-400"
      }`}
    >
      {hint}
    </p>
  </div>
);

export default AdminAnalyticsDashboard;
