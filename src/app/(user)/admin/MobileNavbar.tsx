"use client";

import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { Dispatch, SetStateAction } from "react";
import { AdminPageKey } from "./AdminSideBar";

interface MobileNavbarProps {
    isArabic: boolean;
    isLight: boolean;
    page: AdminPageKey;
    setPage: Dispatch<SetStateAction<AdminPageKey>>;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

const MobileNavbar: React.FC<MobileNavbarProps> = ({
  page,
  setPage,
  setIsSidebarOpen,
  isLight,
  isArabic,
}) => {
  return (
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
            <DynamicIcon iconName="MdOutlineMenu" size={24} />
            <span className="text-[10px] font-semibold">
              {isArabic ? "المزيد" : "More"}
            </span>
          </button>
        </div>
      </nav>
  )
}

export default MobileNavbar