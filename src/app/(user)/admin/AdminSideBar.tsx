"use client";

import { Dispatch, SetStateAction } from "react";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import SideBarBtn from "./SideBarBtn";
import { MdOutlineMenu, MdClose } from "react-icons/md";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

export type AdminPageKey =
  | "analytics"
  | "financial-report"
  | "shamcash-payout-jobs"
  | "add-category"
  | "activation-codes"
  | "payment-settings"
  | "support-messages"
  | "block-user";

interface AdminSideBarProps {
  setPage: Dispatch<SetStateAction<AdminPageKey>>;
  page: AdminPageKey;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
}

const AdminSideBar = ({
  setPage,
  page,
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
}: AdminSideBarProps) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const toggleDesktopCollapse = () => setIsCollapsed((prev) => !prev);

  return (
    <>
      {/* زر القائمة للجوال */}
      <button
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-50 bg-linear-to-r from-indigo-600 to-cyan-600 text-white p-2.5 rounded-xl shadow-lg"
      >
        {isOpen ? <MdClose size={22} /> : <MdOutlineMenu size={22} />}
      </button>

      {/* الشريط الجانبي */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-linear-to-b from-indigo-700 via-indigo-800 to-cyan-800 text-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 dark:border-r dark:border-slate-800 flex flex-col items-center overflow-y-auto transition-all duration-300 shadow-xl z-40 w-64 ${
          isCollapsed ? "md:w-20" : "md:w-64"
        }
        ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}
      >
        {/* شعار اللوحة */}
        <div className="w-full bg-white text-indigo-700 dark:bg-slate-800 dark:text-cyan-300 font-bold flex items-center justify-center gap-3 py-4 text-lg shadow-sm px-3">
          <DynamicIcon iconName="MdOutlineDashboard" size={20} />
          <span className={`${isCollapsed ? "md:hidden" : "hidden md:inline"}`}>
            {t("لوحة التحكم", "Admin Dashboard")}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleDesktopCollapse}
          className="hidden md:inline-flex mt-3 h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors"
          title={
            isCollapsed
              ? t("توسيع القائمة", "Expand sidebar")
              : t("طي القائمة", "Collapse sidebar")
          }
          aria-label={
            isCollapsed
              ? t("توسيع القائمة", "Expand sidebar")
              : t("طي القائمة", "Collapse sidebar")
          }
        >
          <span className="text-base leading-none">
            {isCollapsed ? ">>" : "<<"}
          </span>
        </button>

        {/* الروابط */}
        <nav className="flex flex-col mt-6 gap-2 px-3 overflow-hidden transition-all duration-300 w-full">
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="analytics"
            label={t("لوحة الإحصاءات", "Analytics")}
            iconName="MdOutlineInsights"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="financial-report"
            label={t("التقرير المالي", "Financial Report")}
            iconName="MdOutlineAccountBalanceWallet"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="shamcash-payout-jobs"
            label={t("متابعة سحوبات شام كاش", "ShamCash Payout Queue")}
            iconName="MdOutlinePendingActions"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="add-category"
            label={t("إضافة فئات جديدة", "Add Categories")}
            iconName="MdOutlineCategory"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="activation-codes"
            label={t("أكواد التفعيل", "Activation Codes")}
            iconName="BiBarcodeReader"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="support-messages"
            label={t("رسائل الدعم", "Support Messages")}
            iconName="RiCustomerService2Fill"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="payment-settings"
            label={t("إعدادات الدفع", "Payment Settings")}
            iconName="MdOutlinePayments"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
          {/* <SideBarBtn
            setPage={setPage}
            page={page}
            title="طلبات الشراء"
            iconName="BiPurchaseTagAlt"
            setIsOpen={setIsOpen}
          /> */}
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="block-user"
            label={t("حظر مستخدم", "Block User")}
            iconName="FaUserAltSlash"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
        </nav>

        {/* تذييل الشريط */}
        <div className="mt-auto mb-4 text-xs text-center text-gray-200 dark:text-slate-400 transition-opacity duration-300 px-2">
          <p>
            {isCollapsed
              ? `© ${new Date().getFullYear()}`
              : `© ${new Date().getFullYear()} ${t("لوحة التحكم", "Admin Panel")}`}
          </p>
        </div>
      </aside>

      {/* التراك الخلفي للجوال فقط */}
      {isOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-30 md:hidden"
        ></div>
      )}
    </>
  );
};

export default AdminSideBar;
