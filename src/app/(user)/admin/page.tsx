"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminSideBar, { AdminPageKey } from "./AdminSideBar";
import AddCategoryForm from "@/app/components/addCategory/AddCategory";
import AddCode from "@/app/components/activeCode/AddCode";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard";
import FinancialReportPanel from "./FinancialReportPanel";
import ShamCashPayoutJobsPanel from "./ShamCashPayoutJobsPanel";
import SupportMessagesPanel from "./SupportMessagesPanel";
import PaymentSettingsPanel from "./PaymentSettingsPanel";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

const ADMIN_SIDEBAR_COLLAPSED_KEY = "admin-sidebar-collapsed";

const isAdminPageKey = (value: string): value is AdminPageKey => {
  return [
    "analytics",
    "financial-report",
    "shamcash-payout-jobs",
    "add-category",
    "activation-codes",
    "payment-settings",
    "support-messages",
    "block-user",
  ].includes(value);
};

const AdminDashBoard = () => {
  const { isArabic } = useAppPreferences();
  const searchParams = useSearchParams();
  const [page, setPage] = useState<AdminPageKey>("analytics");
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

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
      window.localStorage.setItem(
        ADMIN_SIDEBAR_COLLAPSED_KEY,
        isSidebarCollapsed ? "1" : "0",
      );
    } catch {
      // ignore persistence failures
    }
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const queryPage = String(searchParams.get("page") || "").trim();
    if (queryPage && isAdminPageKey(queryPage)) {
      setPage(queryPage);
      setIsSidebarOpen(false);
      return;
    }

    const manualRequestId = String(
      searchParams.get("manualRequestId") || "",
    ).trim();
    if (manualRequestId) {
      setPage("shamcash-payout-jobs");
      setIsSidebarOpen(false);
    }
  }, [searchParams]);

  const focusedManualRequestId = String(
    searchParams.get("manualRequestId") || "",
  ).trim();

  return (
    <section className="flex min-h-screen bg-linear-to-br from-slate-50 via-cyan-50/40 to-indigo-50/40 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 transition-colors">
      {/* الشريط الجانبي */}
      <AdminSideBar
        setPage={setPage}
        page={page}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* المحتوى الرئيسي */}

      <main
        className={`flex-1 transition-all duration-300 p-4 sm:p-6 md:p-10 ${
          isSidebarCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
      >
        <div className="mb-5 rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/70">
          <h1 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-100">
            {isArabic ? "لوحة التحكم" : "Admin Dashboard"}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isArabic
              ? "نظرة شاملة على الأداء وإدارة المستخدمين والدعم"
              : "A unified view for analytics, users, activation, and support"}
          </p>
        </div>

        {page === "analytics" && <AdminAnalyticsDashboard />}
        {page === "financial-report" && <FinancialReportPanel />}
        {page === "shamcash-payout-jobs" && (
          <ShamCashPayoutJobsPanel
            focusManualRequestId={focusedManualRequestId || undefined}
          />
        )}
        {page === "add-category" && <AddCategoryForm />}
        {page === "activation-codes" && <AddCode />}
        {page === "payment-settings" && <PaymentSettingsPanel />}
        {page === "support-messages" && <SupportMessagesPanel />}
        {/* {page === "طلبات الشراء" && <PurchaseRequestsPage />} */}
        {!page && (
          <div className="flex justify-center items-center h-full text-slate-400 dark:text-slate-500 text-xl">
            {isArabic
              ? "اختر خيارًا من الشريط الجانبي"
              : "Select an option from the sidebar"}
          </div>
        )}
      </main>
    </section>
  );
};

export default AdminDashBoard;
