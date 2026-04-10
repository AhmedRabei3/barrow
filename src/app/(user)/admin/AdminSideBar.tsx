"use client";

import { Dispatch, SetStateAction } from "react";
import SideBarBtn from "./SideBarBtn";
import {
  MdClose,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

export type AdminPageKey =
  | "analytics"
  | "image-moderation"
  | "financial-report"
  | "shamcash"
  | "add-category"
  | "activation-codes"
  | "payment-settings"
  | "purchase-requests"
  | "support-messages";

interface AdminSideBarProps {
  setPage: Dispatch<SetStateAction<AdminPageKey>>;
  page: AdminPageKey;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  isCollapsed: boolean;
  setIsCollapsed: Dispatch<SetStateAction<boolean>>;
  onPaymentSettingsClick?: () => void;
  canAccessPaymentSettings?: boolean;
}

const AdminSideBar = ({
  setPage,
  page,
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
  onPaymentSettingsClick,
  canAccessPaymentSettings = false,
}: AdminSideBarProps) => {
  const { isArabic, theme } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const toggleSidebar = () => setIsOpen((prev) => !prev);
  const toggleDesktopCollapse = () => setIsCollapsed((prev) => !prev);
  const isLight = theme === "light";

  return (
    <>
      {/* زر إغلاق الشريط الجانبي على الجوال */}
      <button
        onClick={toggleSidebar}
        className={`fixed top-4 left-4 z-50 rounded-2xl border p-2.5 shadow-2xl backdrop-blur md:hidden ${
          isOpen ? "block" : "hidden"
        } ${
          isLight
            ? "border-slate-200 bg-white/90 text-slate-900"
            : "border-zinc-700 bg-zinc-950/90 text-zinc-100"
        }`}
      >
        <MdClose size={22} />
      </button>

      {/* الشريط الجانبي */}
      <aside
        className={`fixed right-0 top-0 z-40 flex h-screen w-72 flex-col overflow-y-auto border-l backdrop-blur-xl transition-all duration-300 ${
          isLight
            ? "border-slate-200/90 bg-white/96 text-slate-900 shadow-[0_20px_60px_rgba(148,163,184,0.24)]"
            : "border-zinc-800/90 bg-zinc-950/96 text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        } ${isCollapsed ? "md:w-24" : "md:w-72"}
        ${isOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}
      `}
      >
        <button
          type="button"
          onClick={toggleDesktopCollapse}
          className={`mx-auto mt-3 hidden h-9 w-9 items-center justify-center rounded-xl border transition-colors md:inline-flex ${
            isLight
              ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          }`}
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
          {isCollapsed ? (
            <MdKeyboardDoubleArrowLeft size={18} />
          ) : (
            <MdKeyboardDoubleArrowRight size={18} />
          )}
        </button>

        {/* الروابط */}
        <div className={`w-full px-4 pt-6 ${isCollapsed ? "md:px-3" : ""}`}>
          <p
            className={`${isCollapsed ? "hidden" : "block"} px-3 text-[11px] font-bold uppercase tracking-[0.22em] ${
              isLight ? "text-slate-500" : "text-zinc-500"
            }`}
          >
            {t("أقسام التشغيل", "Operations")}
          </p>
        </div>

        <nav
          className={`mt-3 flex w-full flex-col gap-2 overflow-hidden px-3 transition-all duration-300 ${
            isCollapsed ? "md:items-center" : ""
          }`}
        >
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="analytics"
            label={t("إدارة المستخدمين", "User Management")}
            iconName="MdManageAccounts"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="image-moderation"
            label={t("مراجعة الصور", "Image Moderation")}
            iconName="MdOutlinePhotoLibrary"
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
            pageKey="shamcash"
            label={t("شام كاش", "ShamCash")}
            iconName="MdQrCodeScanner"
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
          {canAccessPaymentSettings ? (
            <SideBarBtn
              setPage={setPage}
              page={page}
              pageKey="payment-settings"
              label={t("إعدادات الدفع", "Payment Settings")}
              iconName="MdOutlinePayments"
              setIsOpen={setIsOpen}
              collapsed={isCollapsed}
              onClick={onPaymentSettingsClick}
            />
          ) : null}
          <SideBarBtn
            setPage={setPage}
            page={page}
            pageKey="purchase-requests"
            label={t("طلبات الشراء", "Purchase Requests")}
            iconName="BiPurchaseTagAlt"
            setIsOpen={setIsOpen}
            collapsed={isCollapsed}
          />
        </nav>
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
