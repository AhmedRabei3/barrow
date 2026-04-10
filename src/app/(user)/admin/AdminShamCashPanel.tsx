"use client";

import { useState } from "react";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import ShamCashActivationRequestsPanel from "./ShamCashActivationRequestsPanel";
import ShamCashPayoutJobsPanel from "./ShamCashPayoutJobsPanel";

type ShamCashAdminPanelProps = {
  focusManualRequestId?: string;
  focusActivationRequestId?: string;
};

type ShamCashTab = "ACTIVATION_REQUESTS" | "WITHDRAWALS";

const AdminShamCashPanel = ({
  focusManualRequestId,
  focusActivationRequestId,
}: ShamCashAdminPanelProps) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [activeTab, setActiveTab] = useState<ShamCashTab>(
    focusManualRequestId
      ? "WITHDRAWALS"
      : focusActivationRequestId
        ? "ACTIVATION_REQUESTS"
        : "ACTIVATION_REQUESTS",
  );

  const tabs = [
    {
      key: "ACTIVATION_REQUESTS" as const,
      label: t("طلبات التفعيل", "Activation requests"),
    },
    {
      key: "WITHDRAWALS" as const,
      label: t("السحوبات", "Withdrawals"),
    },
  ];

  return (
    <section className="space-y-5">
      <div className="admin-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <span className="admin-kicker">
            {t("عمليات شام كاش", "ShamCash operations")}
          </span>
          <h2 className="text-lg font-bold text-white md:text-xl">
            {t("شام كاش", "ShamCash")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-400">
          {t(
            "إدارة طلبات التفعيل وسحوبات شام كاش من قسم موحّد.",
            "Manage ShamCash activation requests and withdrawals from one place.",
          )}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "admin-tab admin-tab-active" : "admin-tab"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "ACTIVATION_REQUESTS" ? (
        <ShamCashActivationRequestsPanel
          focusActivationRequestId={focusActivationRequestId}
        />
      ) : (
        <ShamCashPayoutJobsPanel focusManualRequestId={focusManualRequestId} />
      )}
    </section>
  );
};

export default AdminShamCashPanel;
