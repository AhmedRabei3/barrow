"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { request } from "@/app/utils/axios";
import GoBackBtn from "@/app/components/GoBackBtn";
import AdminSideBar, { AdminCapabilityMap, AdminPageKey } from "./AdminSideBar";
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
const AdminAuditLogsPanel = dynamic(
  () => import("./AdminAuditLogsPanel.tsx").then((module) => module.default),
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

const DEFAULT_ADMIN_CAPABILITIES: AdminCapabilityMap = {
  USER_MANAGEMENT: false,
  FINANCE_REPORTS: false,
  FINANCE_OPERATIONS: false,
  MODERATION: false,
  SUPPORT: false,
  KYC_REVIEW: false,
  SYSTEM_SETTINGS: false,
};

const isAdminPageKey = (value: string): value is AdminPageKey => {
  return [
    "analytics",
    "audit-logs",
    "image-moderation",
    "financial-report",
    "shamcash",
    "add-category",
    "activation-codes",
    "payment-settings",
    "support-messages",
    "purchase-requests",
  ].includes(value);
};

const canAccessAdminPage = (
  page: AdminPageKey,
  capabilities: AdminCapabilityMap,
  isOwner: boolean,
) => {
  if (page === "payment-settings") {
    return isOwner && capabilities.SYSTEM_SETTINGS;
  }

  if (
    page === "analytics" ||
    page === "audit-logs" ||
    page === "purchase-requests"
  ) {
    return capabilities.USER_MANAGEMENT;
  }

  if (page === "image-moderation") {
    return capabilities.MODERATION;
  }

  if (page === "financial-report") {
    return capabilities.FINANCE_REPORTS;
  }

  if (page === "shamcash" || page === "activation-codes") {
    return capabilities.FINANCE_OPERATIONS;
  }

  if (page === "support-messages") {
    return capabilities.SUPPORT;
  }

  if (page === "add-category") {
    return capabilities.SYSTEM_SETTINGS;
  }

  return false;
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
  const [capabilities, setCapabilities] = useState<AdminCapabilityMap>(
    DEFAULT_ADMIN_CAPABILITIES,
  );

  useEffect(() => {
    if (!session?.user?.isAdmin) {
      return;
    }

    let isCancelled = false;

    const loadCapabilities = async () => {
      try {
        const response = await request.get("/api/admin/capabilities");
        if (!isCancelled && response?.data?.capabilities) {
          setCapabilities({
            ...DEFAULT_ADMIN_CAPABILITIES,
            ...response.data.capabilities,
          });
        }
      } catch {
        if (!isCancelled) {
          setCapabilities(DEFAULT_ADMIN_CAPABILITIES);
        }
      }
    };

    void loadCapabilities();

    return () => {
      isCancelled = true;
    };
  }, [session?.user?.isAdmin]);

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
      if (!canAccessAdminPage(normalizedQueryPage, capabilities, isOwner)) {
        setPage("analytics");
        setIsSidebarOpen(false);
        return;
      }

      if (
        normalizedQueryPage === "payment-settings" &&
        canAccessAdminPage("payment-settings", capabilities, isOwner) &&
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
    capabilities,
    isOwner,
    isPaymentSettingsAuthorized,
    paymentPasswordModal,
    searchParams,
    status,
  ]);

  useEffect(() => {
    if (!canAccessAdminPage(page, capabilities, isOwner)) {
      setPage("analytics");
    }
  }, [capabilities, isOwner, page]);

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
    if (!canAccessAdminPage("payment-settings", capabilities, isOwner)) {
      return;
    }

    if (isPaymentSettingsAuthorized) {
      setPage("payment-settings");
      setIsSidebarOpen(false);
      return;
    }

    paymentPasswordModal.onOpen();
  }, [
    capabilities,
    isOwner,
    isPaymentSettingsAuthorized,
    paymentPasswordModal,
  ]);

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
        canAccessPaymentSettings={canAccessAdminPage(
          "payment-settings",
          capabilities,
          isOwner,
        )}
        capabilities={capabilities}
      />

      {/* المحتوى الرئيسي */}

      <main
        className={`relative z-10 w-full min-w-0 flex-1 px-3 pb-24 pt-22 transition-all duration-300 sm:px-4 md:pb-8 md:px-6 lg:px-8 ${
          isSidebarCollapsed ? "md:mr-24" : "md:mr-72"
        }`}
      >
        <GoBackBtn />
        {page === "analytics" && capabilities.USER_MANAGEMENT && (
          <AdminAnalyticsDashboard />
        )}
        {page === "audit-logs" && capabilities.USER_MANAGEMENT && (
          <AdminAuditLogsPanel />
        )}
        {page === "image-moderation" && capabilities.MODERATION && (
          <ImageModerationPanel />
        )}
        {page === "financial-report" && capabilities.FINANCE_REPORTS && (
          <FinancialReportPanel />
        )}
        {page === "shamcash" && capabilities.FINANCE_OPERATIONS && (
          <AdminShamCashPanel
            focusManualRequestId={focusedManualRequestId || undefined}
            focusActivationRequestId={focusedActivationRequestId || undefined}
          />
        )}
        {page === "add-category" && capabilities.SYSTEM_SETTINGS && (
          <AddCategoryForm />
        )}
        {page === "activation-codes" && capabilities.FINANCE_OPERATIONS && (
          <AddCode />
        )}
        {page === "payment-settings" &&
          canAccessAdminPage("payment-settings", capabilities, isOwner) && (
            <PaymentSettingsPanel />
          )}
        {page === "support-messages" && capabilities.SUPPORT && (
          <SupportMessagesPanel />
        )}
        {page === "purchase-requests" && capabilities.USER_MANAGEMENT && (
          <PurchaseRequestsPage />
        )}
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
        capabilities={capabilities}
      />
    </section>
  );
};

export default AdminDashBoard;
