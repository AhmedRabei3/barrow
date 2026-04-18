"use client";

import { memo } from "react";
import Avatar from "./Avatar";
import { Stat } from "./Stat";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

const formatEnglishMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  }).format(value);

interface Props {
  user: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    profileImage?: string | null;
    createdAt?: Date | string | null;
    balance?: number | string | { toString(): string } | null;
    isActive?: boolean | null;
    activeUntil?: Date | string | null;
    pendingReferralEarnings?: number | string | { toString(): string } | null;
    isIdentityVerified?: boolean | null;
    referralStats?: {
      invitedCount: number;
      activeInvitedCount: number;
      inactiveInvitedCount: number;
    };
  } | null;
  totalItems: number;
  formatDate: (date?: string) => string;
  walletBalanceLabel: string;
  onPaypalWithdraw?: () => void;
  isWithdrawingPaypal?: boolean;
  onShamCashWithdraw?: () => void;
  isWithdrawingShamCash?: boolean;
  onEditProfile?: () => void;
  onCreateListing?: () => void;
  totalFavorites?: number;
}

const ProfileHeader = ({
  user,
  totalItems,
  formatDate,
  walletBalanceLabel,
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
  const totalInvitesLabel = new Intl.NumberFormat("en-US", {
    numberingSystem: "latn",
  }).format(user?.referralStats?.invitedCount ?? 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-5 rounded-none border-y border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:border sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col items-center gap-4 text-center md:flex-row md:items-center md:gap-5 md:text-start">
          <div className="relative shrink-0">
            <div>
              <Avatar user={user ?? undefined} size={92} />
            </div>
            <span className="absolute bottom-0 right-0 h-6 w-6 rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900" />
          </div>

          <div className="min-w-0">
            <div className="flex min-w-0 flex-col items-center gap-2 md:flex-row">
              <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {user?.name || "-"}
              </h1>
              {user?.isIdentityVerified ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300">
                  <DynamicIcon iconName="MdVerified" size={14} />
                  {isArabic ? "موثق" : "Verified"}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {memberSinceLabel}
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 md:justify-start">
              {user?.email ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800">
                  {user.email}
                </span>
              ) : null}
              {user?.phone ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {isArabic
                    ? `تحقق إضافي: ${user.phone}`
                    : `Additional verification: ${user.phone}`}
                </span>
              ) : null}
            </div>
            {/* تم حذف الجملة التوضيحية أسفل شارة التوثيق بناءً على طلب المستخدم */}
            {user?.isIdentityVerified || user?.isActive || user ? null : null}
          </div>
        </div>

        <div className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:flex-wrap md:gap-3 md:justify-end">
          <button
            type="button"
            onClick={onEditProfile}
            aria-label={isArabic ? "تعديل الملف الشخصي" : "Edit profile"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-100 px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 md:rounded-lg md:px-4"
          >
            <DynamicIcon iconName="FaUserEdit" size={16} />
            <span className="hidden md:inline">
              {isArabic ? "تعديل الملف الشخصي" : "Edit profile"}
            </span>
          </button>
          <button
            type="button"
            onClick={onCreateListing}
            className="inline-flex items-center 
            justify-center gap-2 rounded-lg 
            bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-blue-600"
          >
            <DynamicIcon iconName="MdAdd" size={18} />
            {isArabic ? "عنصر جديد" : "New item"}
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
              ? `${totalInvitesLabel} دعوات كلية`
              : `${totalInvitesLabel} total invites`
          }
        />
        <Stat
          iconName="FaMoneyBillWave"
          label={isArabic ? "رصيد المحفظة" : "Wallet balance"}
          value={
            walletBalanceLabel ||
            `${formatEnglishMoney(Number(user?.balance ?? 0))} $`
          }
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
