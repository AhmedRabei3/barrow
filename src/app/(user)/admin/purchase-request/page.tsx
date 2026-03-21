"use client";

import { useState } from "react";
import Unassigned from "./tabs/Unassigned";
import MyPurchaseRequests from "./tabs/MyRequests";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type Tab = "new" | "mine";

export default function PurchaseRequestsPage() {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [activeTab, setActiveTab] = useState<Tab>("new");

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl font-bold text-cyan-900 dark:text-cyan-300">
        {t("طلبات الشراء", "Purchase requests")}
      </h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <TabButton
          active={activeTab === "new"}
          onClick={() => setActiveTab("new")}
        >
          {t("الطلبات الجديدة", "New requests")}
        </TabButton>

        <TabButton
          active={activeTab === "mine"}
          onClick={() => setActiveTab("mine")}
        >
          {t("طلباتي", "My requests")}
        </TabButton>
      </div>

      {/* Content */}
      <div>
        {activeTab === "new" && <Unassigned />}
        {activeTab === "mine" && <MyPurchaseRequests />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium
        border-b-2 transition
        ${
          active
            ? "border-cyan-700 text-cyan-700 dark:text-cyan-300"
            : "border-transparent text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-300"
        }
      `}
    >
      {children}
    </button>
  );
}
