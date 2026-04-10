"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { MdArrowBack, MdOutlineMenu } from "react-icons/md";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import AdminSideBar, { AdminPageKey } from "./AdminSideBar";
import AddCategoryForm from "@/app/components/addCategory/AddCategory";
import AddCode from "@/app/components/activeCode/AddCode";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard";
import ImageModerationPanel from "./ImageModerationPanel";
import FinancialReportPanel from "./FinancialReportPanel";

import SupportMessagesPanel from "./SupportMessagesPanel";

import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import PaymentSettingsPanel from "./PaymentSettingsPanel";
import PaymentPassword from "./PaymentPassword";
import usePaymentPasswordModal from "@/app/hooks/usePasswordPaymentModal";
import AdminShamCashPanel from "./AdminShamCashPanel";
import PurchaseRequestsPage from "./purchase-request/page";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";
const PAYMENT_SETTINGS_ACCESS_KEY = "admin-payment-settings-authorized";

const isAdminPageKey = (value: string): value is AdminPageKey => {
  return [
    "analytics",
    "image-moderation",
    "financial-report",
    "shamcash",
    "add-category",
    "activation-codes",
    "payment-settings",
    "support-messages",
  ].includes(value);
};

const AdminDashBoard = () => {
  const { isArabic, theme } = useAppPreferences();
  const { data: session, status } = useSession();
  const isOwner = Boolean(session?.user?.isOwner);

  const searchParams = useSearchParams();
  const paymentPasswordModal = usePaymentPasswordModal();
  const [page, setPage] = useState<AdminPageKey>("analytics");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isPaymentSettingsAuthorized, setIsPaymentSettingsAuthorized] =
    useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY);
      setIsSidebarCollapsed(stored === "1");
    } catch {
      setIsSidebarCollapsed(false);
    }
  }, []);

  useEffect(() => {
    try {
      setIsPaymentSettingsAuthorized(
        window.sessionStorage.getItem(PAYMENT_SETTINGS_ACCESS_KEY) === "1",
      );
    } catch {
      setIsPaymentSettingsAuthorized(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        ADMIN_SIDEBAR_COLLAPSED_KEY,
        isSidebarCollapsed ? "1" : "0",
      );
    } catch {
      // ignore persistence failures
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const queryPage = String(searchParams.get("page") || "").trim();
    const normalizedQueryPage =
      queryPage === "shamcash-payout-jobs" ||
      queryPage === "shamcash-activation-requests"
        ? "shamcash"
        : queryPage;

    if (normalizedQueryPage && isAdminPageKey(normalizedQueryPage)) {
      if (normalizedQueryPage === "payment-settings" && !isOwner) {
        setPage("analytics");
        setIsSidebarOpen(false);
        return;
      }

      if (
        normalizedQueryPage === "payment-settings" &&
        isOwner &&
        !isPaymentSettingsAuthorized
      ) {
        paymentPasswordModal.onOpen();
        setIsSidebarOpen(false);
        return;
      }

      setPage(normalizedQueryPage);
      setIsSidebarOpen(false);
      return;
    }

    const manualRequestId = String(
      searchParams.get("manualRequestId") || "",
    ).trim();
    const activationRequestId = String(
      searchParams.get("activationRequestId") || "",
    ).trim();
    if (manualRequestId || activationRequestId) {
      setPage("shamcash");
      setIsSidebarOpen(false);
    }
  }, [
    isOwner,
    isPaymentSettingsAuthorized,
    paymentPasswordModal,
    searchParams,
    status,
  ]);

  useEffect(() => {
    if (!isOwner && page === "payment-settings") {
      setPage("analytics");
    }
  }, [isOwner, page]);

  const grantPaymentSettingsAccess = () => {
    setIsPaymentSettingsAuthorized(true);
    try {
      window.sessionStorage.setItem(PAYMENT_SETTINGS_ACCESS_KEY, "1");
    } catch {
      // ignore storage failures
    }
    setPage("payment-settings");
    setIsSidebarOpen(false);
  };

  const handlePaymentSettingsClick = () => {
    if (!isOwner) {
      return;
    }

    if (isPaymentSettingsAuthorized) {
      setPage("payment-settings");
      setIsSidebarOpen(false);
      return;
    }

    paymentPasswordModal.onOpen();
  };

  const focusedManualRequestId = String(
    searchParams.get("manualRequestId") || "",
  ).trim();
  const focusedActivationRequestId = String(
    searchParams.get("activationRequestId") || "",
  ).trim();

  const pageTitle =
    {
      analytics: isArabic ? "إدارة المستخدمين" : "User Management",
      "image-moderation": isArabic ? "مراجعة الصور" : "Image Moderation",
      "financial-report": isArabic ? "التقرير المالي" : "Financial Report",
      shamcash: isArabic ? "شام كاش" : "ShamCash",
      "add-category": isArabic ? "إضافة الفئات" : "Add Categories",
      "activation-codes": isArabic ? "أكواد التفعيل" : "Activation Codes",
      "payment-settings": isArabic ? "إعدادات الدفع" : "Payment Settings",
      "support-messages": isArabic ? "رسائل الدعم" : "Support Messages",
      "purchase-requests": isArabic ? "طلبات الشراء" : "Purchase Requests",
    }[page] || (isArabic ? "لوحة التحكم" : "Admin Dashboard");
  const pageDescription =
    {
      analytics: isArabic
        ? "إدارة المستخدمين، الحسابات، والأرصدة من واجهة واحدة."
        : "Manage users, account states, and balances from one surface.",
      "image-moderation": isArabic
        ? "مراجعة الصور المعلقة واتخاذ قرار النشر أو الرفض."
        : "Review queued images and decide whether to publish or reject them.",
      "financial-report": isArabic
        ? "متابعة الوارد والصادر والالتزامات حسب الفترة والقناة."
        : "Track inflow, outflow, and liabilities by range and channel.",
      shamcash: isArabic
        ? "إدارة طلبات التفعيل وسحوبات شام كاش من مكان واحد."
        : "Handle activation requests and ShamCash withdrawals in one place.",
      "add-category": isArabic
        ? "إضافة فئات جديدة وربطها بتجربة النشر الحالية."
        : "Create new categories and connect them to the existing publishing flow.",
      "activation-codes": isArabic
        ? "إدارة أكواد التفعيل ومراقبة استخدامها."
        : "Manage activation codes and monitor their usage.",
      "payment-settings": isArabic
        ? "ضبط إعدادات الدفع وسحب أرباح المالك بأمان."
        : "Configure payment settings and withdraw owner profit safely.",
      "support-messages": isArabic
        ? "متابعة رسائل الدعم والرد على الحالات المفتوحة."
        : "Review support messages and respond to open cases.",
      "purchase-requests": isArabic ? "طلبات الشراء" : "Purchase Requests",
    }[page] ||
    (isArabic
      ? "واجهة إدارة التطبيق والعمليات اليومية."
      : "Application administration and daily operations.");

  const isLight = theme === "light";

  return (
    <section className="admin-shell flex min-h-screen overflow-hidden transition-colors">
      {/* الشريط الجانبي */}
      <AdminSideBar
        setPage={setPage}
        page={page}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        onPaymentSettingsClick={handlePaymentSettingsClick}
        canAccessPaymentSettings={isOwner}
      />

      {/* المحتوى الرئيسي */}

      <main
        className={`relative z-10 flex-1 px-4 pb-24 pt-22 transition-all duration-300 sm:px-6 md:pb-8 md:px-8 ${
          isSidebarCollapsed ? "md:mr-24" : "md:mr-72"
        }`}
      >
        <div className="admin-card sticky top-4 z-20 mb-6 overflow-hidden rounded-[28px] border border-zinc-800/80">
          <div
            className={`flex h-16 items-center justify-between border-b px-5 backdrop-blur-xl sm:px-6 ${
              isLight
                ? "border-slate-200 bg-white/80"
                : "border-zinc-800/80 bg-zinc-950/75"
            }`}
          >
            <div className="flex items-center gap-4">
              {/* زر القائمة الجانبية للجوال - داخل الهيدر */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border transition md:hidden ${
                  isLight
                    ? "border-slate-200 bg-white/90 text-slate-700 hover:bg-slate-100"
                    : "border-zinc-700 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800"
                }`}
                aria-label={isArabic ? "فتح القائمة" : "Open menu"}
              >
                <MdOutlineMenu size={20} />
              </button>
              <h1
                className={`text-lg font-black tracking-tight sm:text-xl ${
                  isLight ? "text-slate-900" : "text-zinc-100"
                }`}
              >
                {isArabic ? "مشهور" : "Mashhoor"}
              </h1>
              <div
                className={`hidden h-6 w-px sm:block ${
                  isLight ? "bg-slate-200" : "bg-zinc-800"
                }`}
              />
              <span
                className={`hidden text-sm sm:inline ${
                  isLight ? "text-slate-500" : "text-zinc-400"
                }`}
              >
                {pageTitle || (isArabic ? "لوحة التحكم" : "Admin Dashboard")}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative hidden md:block">
                <DynamicIcon
                  iconName="FiSearch"
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  readOnly
                  placeholder={
                    isArabic ? "البحث في النظام..." : "Search admin..."
                  }
                  className="admin-input h-10 w-52 rounded-full pr-10 pl-4 text-sm"
                />
              </div>
              <button
                type="button"
                className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                  isLight
                    ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                }`}
              >
                <DynamicIcon iconName="IoMdNotificationsOutline" size={18} />
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-300">
                <DynamicIcon iconName="FiUser" size={18} />
              </div>
            </div>
          </div>

          <div className="hidden md:grid gap-4 px-5 py-5 sm:px-6 xl:grid-cols-[1.25fr_0.95fr]">
            <div className="space-y-2">
              <div className="admin-kicker">
                {isArabic ? "إدارة التطبيق" : "Application admin"}
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">
                  {pageTitle || (isArabic ? "لوحة التحكم" : "Admin Dashboard")}
                </h2>
                <p className="mt-1 max-w-3xl text-sm text-zinc-400">
                  {pageDescription ||
                    (isArabic
                      ? "إدارة المستخدمين، الحسابات، والأرصدة من واجهة واحدة."
                      : "Manage users, account states, and balances from one surface.")}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <button
                type="button"
                onClick={() => setPage("analytics")}
                className="admin-btn-secondary flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition sm:col-span-2 xl:col-span-1"
              >
                <MdArrowBack size={18} />
                {isArabic ? "العودة للوحة التحكم" : "Back to dashboard"}
              </button>

              <div className="admin-card-soft rounded-2xl px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {isArabic ? "الحالة" : "Status"}
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-emerald-300">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.7)]" />
                  {isArabic ? "تشغيل مستقر" : "Stable operation"}
                </div>
              </div>

              <div className="admin-card-soft rounded-2xl px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {isArabic ? "الوحدة النشطة" : "Active module"}
                </div>
                <div className="mt-2 text-sm font-semibold text-zinc-100">
                  {pageTitle || (isArabic ? "لوحة التحكم" : "Admin Dashboard")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {page === "analytics" && <AdminAnalyticsDashboard />}
        {page === "image-moderation" && <ImageModerationPanel />}
        {page === "financial-report" && <FinancialReportPanel />}
        {page === "shamcash" && (
          <AdminShamCashPanel
            focusManualRequestId={focusedManualRequestId || undefined}
            focusActivationRequestId={focusedActivationRequestId || undefined}
          />
        )}
        {page === "add-category" && <AddCategoryForm />}
        {page === "activation-codes" && <AddCode />}
        {page === "payment-settings" && isOwner && <PaymentSettingsPanel />}
        {page === "support-messages" && <SupportMessagesPanel />}
        {page === "purchase-requests" && <PurchaseRequestsPage />}
        {!page && (
          <div className="flex justify-center items-center h-full text-slate-400 dark:text-slate-500 text-xl">
            {isArabic
              ? "اختر خيارًا من الشريط الجانبي"
              : "Select an option from the sidebar"}
          </div>
        )}
      </main>

      {isOwner ? (
        <PaymentPassword onAuthorized={grantPaymentSettingsAccess} />
      ) : null}

      {/* شريط التنقل السفلي للجوال */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 border-t md:hidden ${
          isLight
            ? "border-slate-200 bg-white/95 backdrop-blur-md"
            : "border-zinc-800 bg-zinc-950/95 backdrop-blur-md"
        }`}
      >
        <div className="flex items-center justify-around px-1 pb-5 pt-2">
          {/* المستخدمون */}
          <button
            type="button"
            onClick={() => {
              setPage("analytics");
              setIsSidebarOpen(false);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              page === "analytics"
                ? "text-orange-500"
                : isLight
                  ? "text-slate-400 hover:text-slate-700"
                  : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <DynamicIcon iconName="MdManageAccounts" size={24} />
            <span className="text-[10px] font-semibold">
              {isArabic ? "المستخدمون" : "Users"}
            </span>
          </button>

          {/* التقرير المالي */}
          <button
            type="button"
            onClick={() => {
              setPage("financial-report");
              setIsSidebarOpen(false);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              page === "financial-report"
                ? "text-orange-500"
                : isLight
                  ? "text-slate-400 hover:text-slate-700"
                  : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <DynamicIcon iconName="MdOutlineAccountBalanceWallet" size={24} />
            <span className="text-[10px] font-semibold">
              {isArabic ? "المالية" : "Finance"}
            </span>
          </button>

          {/* شام كاش */}
          <button
            type="button"
            onClick={() => {
              setPage("shamcash");
              setIsSidebarOpen(false);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              page === "shamcash"
                ? "text-orange-500"
                : isLight
                  ? "text-slate-400 hover:text-slate-700"
                  : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <DynamicIcon iconName="MdQrCodeScanner" size={24} />
            <span className="text-[10px] font-semibold">
              {isArabic ? "شام كاش" : "ShamCash"}
            </span>
          </button>

          {/* الدعم */}
          <button
            type="button"
            onClick={() => {
              setPage("support-messages");
              setIsSidebarOpen(false);
            }}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              page === "support-messages"
                ? "text-orange-500"
                : isLight
                  ? "text-slate-400 hover:text-slate-700"
                  : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <DynamicIcon iconName="RiCustomerService2Fill" size={24} />
            <span className="text-[10px] font-semibold">
              {isArabic ? "الدعم" : "Support"}
            </span>
          </button>

          {/* المزيد - يفتح الشريط الجانبي */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
              [
                "image-moderation",
                "add-category",
                "activation-codes",
                "payment-settings",
                "purchase-requests",
              ].includes(page)
                ? "text-orange-500"
                : isLight
                  ? "text-slate-400 hover:text-slate-700"
                  : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <MdOutlineMenu size={24} />
            <span className="text-[10px] font-semibold">
              {isArabic ? "المزيد" : "More"}
            </span>
          </button>
        </div>
      </nav>
    </section>
  );
};

export default AdminDashBoard;
