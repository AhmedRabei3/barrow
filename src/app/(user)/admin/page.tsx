"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import GoBackBtn from "@/app/components/GoBackBtn";
import AdminSideBar, { AdminPageKey } from "./AdminSideBar";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import PaymentPassword from "./PaymentPassword";
import usePaymentPasswordModal from "@/app/hooks/usePasswordPaymentModal";
import MobileNavbar from "./MobileNavbar";

const AdminPanelSkeleton = () => (
  <div className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
    Loading...
  </div>
);

function renderAdminPanelSkeleton() {
  return <AdminPanelSkeleton />;
}

type AdminShamCashPanelProps = {
  focusManualRequestId?: string;
  focusActivationRequestId?: string;
};

const AddCategoryForm = dynamic(
  () => import("./AddCategoryPanel.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);
const AddCode = dynamic(
  () => import("./AddCodePanel.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);
const AdminAnalyticsDashboard = dynamic(
  () =>
    import("./AdminAnalyticsDashboard.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);
const ImageModerationPanel = dynamic(
  () => import("./ImageModerationPanel.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);
const FinancialReportPanel = dynamic(
  () => import("./FinancialReportPanel.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);
const SupportMessagesPanel = dynamic(
  () => import("./SupportMessagesPanel.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);
const PaymentSettingsPanel = dynamic(
  () => import("./PaymentSettingsPanel.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);
const AdminShamCashPanel = dynamic<AdminShamCashPanelProps>(
  () => import("./AdminShamCashPanel.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);
const PurchaseRequestsPage = dynamic(
  () => import("./purchase-request/page.tsx").then((module) => module.default),
  {
    loading: renderAdminPanelSkeleton,
  },
);

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

  const grantPaymentSettingsAccess = useCallback(() => {
    setIsPaymentSettingsAuthorized(true);
    try {
      window.sessionStorage.setItem(PAYMENT_SETTINGS_ACCESS_KEY, "1");
    } catch {
      // ignore storage failures
    }
    setPage("payment-settings");
    setIsSidebarOpen(false);
  }, []);

  const handlePaymentSettingsClick = useCallback(() => {
    if (!isOwner) {
      return;
    }

    if (isPaymentSettingsAuthorized) {
      setPage("payment-settings");
      setIsSidebarOpen(false);
      return;
    }

    paymentPasswordModal.onOpen();
  }, [isOwner, isPaymentSettingsAuthorized, paymentPasswordModal]);

  const focusedManualRequestId = String(
    searchParams.get("manualRequestId") || "",
  ).trim();
  const focusedActivationRequestId = String(
    searchParams.get("activationRequestId") || "",
  ).trim();

  const isLight = theme === "light";

  return (
    <section className="admin-shell flex min-h-screen flex-col overflow-x-clip transition-colors md:flex-row">
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
        className={`relative z-10 w-full min-w-0 flex-1 px-3 pb-24 pt-22 transition-all duration-300 sm:px-4 md:pb-8 md:px-6 lg:px-8 ${
          isSidebarCollapsed ? "md:mr-24" : "md:mr-72"
        }`}
      >
        <GoBackBtn />
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
      <MobileNavbar
        page={page}
        setPage={setPage}
        setIsSidebarOpen={setIsSidebarOpen}
        isLight={isLight}
        isArabic={isArabic}
      />
    </section>
  );
};

export default AdminDashBoard;
