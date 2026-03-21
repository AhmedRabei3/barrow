"use client";

import { memo } from "react";
import Avatar from "./Avatar";
import { Stat } from "./Stat";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    profileImage?: string | null;
    createdAt?: Date | string | null;
    balance?: number | string | { toString(): string } | null;
  } | null;
  totalItems: number;
  formatDate: (date?: string) => string;
  formatCurrency: (val?: string) => string;
  onPaypalWithdraw?: () => void;
  isWithdrawingPaypal?: boolean;
  onShamCashWithdraw?: () => void;
  isWithdrawingShamCash?: boolean;
  onEditProfile?: () => void;
}

const ShamCashMark = () => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className="h-4 w-4"
    focusable="false"
  >
    <defs>
      <linearGradient id="shamcash-a" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#34d399" />
        <stop offset="100%" stopColor="#22c55e" />
      </linearGradient>
      <linearGradient id="shamcash-b" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <path d="M4 3h9l-3.8 3.8H7.2v2.4h6.2l-3.8 3.8H4z" fill="url(#shamcash-a)" />
    <path
      d="M20 21h-9l3.8-3.8h2v-2.4h-6.2l3.8-3.8H20z"
      fill="url(#shamcash-b)"
    />
  </svg>
);

const ProfileHeader = ({
  user,
  totalItems,
  formatDate,
  formatCurrency,
  onPaypalWithdraw,
  isWithdrawingPaypal = false,
  onShamCashWithdraw,
  isWithdrawingShamCash = false,
  onEditProfile,
}: Props) => {
  const { isArabic } = useAppPreferences();

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
      <div className="p-4 sm:p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar user={user ?? undefined} size={46} />
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">
              {user?.name || "-"}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-300 truncate">
              {user?.email || "-"}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">
              {isArabic ? "انضممت في" : "Joined on"}{" "}
              {formatDate(user?.createdAt?.toString())}
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto flex-wrap sm:flex-nowrap items-center justify-start sm:justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onPaypalWithdraw}
            disabled={isWithdrawingPaypal || !onPaypalWithdraw}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium disabled:opacity-50 min-w-33 transition-colors"
          >
            {isWithdrawingPaypal
              ? isArabic
                ? "جارٍ السحب..."
                : "Withdrawing..."
              : isArabic
                ? "سحب PayPal"
                : "PayPal Withdraw"}
          </button>
          <button
            type="button"
            onClick={onShamCashWithdraw}
            disabled={isWithdrawingShamCash || !onShamCashWithdraw}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-medium disabled:opacity-50 min-w-36 transition-colors"
          >
            <ShamCashMark />
            {isWithdrawingShamCash
              ? isArabic
                ? "جارٍ الطلب..."
                : "Submitting..."
              : isArabic
                ? "سحب شام كاش"
                : "ShamCash Withdraw"}
          </button>
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium min-w-40 transition-colors"
          >
            <DynamicIcon iconName="FaEdit" size={14} />
            {isArabic ? "تعديل الملف الشخصي" : "Edit profile"}
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-600 p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Stat
          iconName="FaMoneyBillWave"
          label={isArabic ? "الرصيد الحالي" : "Current balance"}
          value={`${formatCurrency(user?.balance?.toString())} س.`}
        />
        <Stat
          iconName="MdOutlineDevicesOther"
          label={isArabic ? "إجمالي الإعلانات" : "Total listings"}
          value={totalItems}
        />
        <Stat
          iconName="FaRegCalendarAlt"
          label={isArabic ? "تاريخ الانضمام" : "Join date"}
          value={formatDate(user?.createdAt?.toString())}
        />
      </div>
    </section>
  );
};

export default memo(ProfileHeader);
