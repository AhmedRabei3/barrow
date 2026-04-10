"use client";

import { memo } from "react";
import Avatar from "./Avatar";
import { Stat } from "./Stat";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface Props {
  user: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    profileImage?: string | null;
    createdAt?: Date | string | null;
    balance?: number | string | { toString(): string } | null;
    isActive?: boolean | null;
    activeUntil?: Date | string | null;
    pendingReferralEarnings?: number | string | { toString(): string } | null;
    referralStats?: {
      invitedCount: number;
      activeInvitedCount: number;
      inactiveInvitedCount: number;
    };
  } | null;
  totalItems: number;
  formatDate: (date?: string) => string;
  formatCurrency: (val?: string) => string;
  onPaypalWithdraw?: () => void;
  isWithdrawingPaypal?: boolean;
  onShamCashWithdraw?: () => void;
  isWithdrawingShamCash?: boolean;
  onEditProfile?: () => void;
  onCreateListing?: () => void;
  totalFavorites?: number;
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
  onCreateListing,
  totalFavorites = 0,
}: Props) => {
  const { isArabic } = useAppPreferences();
  const joinLabel = formatDate(user?.createdAt?.toString());
  const memberSinceLabel = user?.isActive
    ? isArabic
      ? `عضوية مميزة منذ ${joinLabel}`
      : `Premium Member since ${joinLabel}`
    : isArabic
      ? `عضو منذ ${joinLabel}`
      : `Member since ${joinLabel}`;

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-5">
          <div className="relative shrink-0">
            <div>
              <Avatar user={user ?? undefined} size={80} />
            </div>
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {user?.name || "-"}
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {memberSinceLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <DynamicIcon
                iconName="MdVerified"
                size={16}
                className="text-amber-500"
              />
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {user?.isActive
                  ? isArabic
                    ? "بائع موثّق ومفعّل"
                    : "Verified and activated seller"
                  : isArabic
                    ? "الحساب مسجّل ويحتاج تفعيل"
                    : "Account registered and awaiting activation"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 md:justify-end">
          <button
            type="button"
            onClick={onEditProfile}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <DynamicIcon iconName="FaEdit" size={16} />
            {isArabic ? "تعديل الملف الشخصي" : "Edit profile"}
          </button>
          <button
            type="button"
            onClick={onCreateListing}
            className="inline-flex items-center 
            justify-center gap-2 rounded-lg 
            bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-600"
          >
            <DynamicIcon iconName="MdAdd" size={18} />
            {isArabic ? "إنشاء إعلان" : "Create Ad"}
          </button>
          <button
            type="button"
            onClick={onPaypalWithdraw}
            disabled={isWithdrawingPaypal || !onPaypalWithdraw}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
          >
            <DynamicIcon iconName="FaMoneyBillWave" size={15} />
            {isWithdrawingPaypal
              ? isArabic
                ? "جارٍ السحب..."
                : "Withdrawing..."
              : isArabic
                ? "سحب PayPal"
                : "PayPal"}
          </button>
          <button
            type="button"
            onClick={onShamCashWithdraw}
            disabled={isWithdrawingShamCash || !onShamCashWithdraw}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
          >
            <ShamCashMark />
            {isWithdrawingShamCash
              ? isArabic
                ? "جارٍ الطلب..."
                : "Submitting..."
              : isArabic
                ? "شام كاش"
                : "ShamCash"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat
          iconName="MdOutlineDevicesOther"
          label={isArabic ? "الإعلانات النشطة" : "Active listings"}
          value={totalItems}
          hint={
            isArabic
              ? "محدث من عناصر حسابك الحالية"
              : "Updated from your current account items"
          }
          tone="primary"
        />
        <Stat
          iconName="AiFillHeart"
          label={isArabic ? "العناصر المفضلة" : "Favorites"}
          value={totalFavorites}
          hint={
            isArabic
              ? `${user?.referralStats?.invitedCount ?? 0} دعوات كلية`
              : `${user?.referralStats?.invitedCount ?? 0} total invites`
          }
        />
        <Stat
          iconName="FaMoneyBillWave"
          label={isArabic ? "رصيد المحفظة" : "Wallet balance"}
          value={`${formatCurrency(user?.balance?.toString())} $`}
          hint={
            user?.isActive
              ? isArabic
                ? "السحب القادم متاح من قسم السحوبات"
                : "Next payout is available from the withdrawals tab"
              : isArabic
                ? "فعّل الحساب لفتح النشر والسحب"
                : "Activate your account to unlock publishing and withdrawals"
          }
          tone="primary"
        />
      </div>
    </section>
  );
};

export default memo(ProfileHeader);
