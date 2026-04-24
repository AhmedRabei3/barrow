"use client";

import { useProfile } from "@/app/hooks/useProfile";
import { useSearchParams } from "next/navigation";
import ProfileHeader from "./ProfileHeader";
import TabbedView, { type ProfileTabKey } from "./TabsProfilePage";

import { formatDate, formatCurrency } from "@/app/api/utils/generalHelper";
import ProfileSkeleton from "@/app/components/ProfileSkeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import toast from "react-hot-toast";
import { handleConfirmDelete } from "./profileHelper";
import { buildEditDataByType } from "./setItemToEdit";
import GoBackBtn from "@/app/components/GoBackBtn";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import ProfileAccountEditor from "./ProfileAccountEditor";
import IdentityVerificationEditor from "./IdentityVerificationEditor";
import ProfileInterestOrderEditor from "./ProfileInterestOrderEditor";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import Link from "next/link";
import { signOut } from "next-auth/react";
import useActivationModal from "@/app/hooks/useActivationModal";

const SMART_CHAT_EDIT_PAYLOAD_KEY = "smart-chat-edit-payload";
const SMART_CHAT_ACTION_ADD_ITEM = "ACTION_ADD_ITEM";

const formatEnglishNumber = (value: number, fractionDigits = 0) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    numberingSystem: "latn",
  }).format(value);

const Profile = () => {
  const searchParams = useSearchParams();
  const activationModal = useActivationModal();
  const [itemIdToEdit, setItemIdToEdit] = useState<string | null>(null);
  const [itemIdToDelete, setItemIdToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [withdrawingPaypal, setWithdrawingPaypal] = useState(false);
  const [withdrawingShamCash, setWithdrawingShamCash] = useState(false);
  const [paypalWithdrawModalOpen, setPaypalWithdrawModalOpen] = useState(false);
  const [shamCashWithdrawModalOpen, setShamCashWithdrawModalOpen] =
    useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [identityVerificationModalOpen, setIdentityVerificationModalOpen] =
    useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTabKey>("ALL");
  const [activeSidebarSection, setActiveSidebarSection] = useState<
    "OVERVIEW" | "LISTINGS" | "FAV" | "REQUESTS" | "WITHDRAWALS"
  >("OVERVIEW");
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalWithdrawAmount, setPaypalWithdrawAmount] = useState("");
  const [shamCashWithdrawAmount, setShamCashWithdrawAmount] = useState("");
  const overviewSectionRef = useRef<HTMLDivElement | null>(null);
  const listingsSectionRef = useRef<HTMLDivElement | null>(null);
  const {
    user,
    items,
    purchaseRequests,
    favorites,
    totalItems,
    loading,
    error,
    isUnauthorized,
    refetch,
  } = useProfile();
  const { isArabic } = useAppPreferences();
  const availableToWithdraw = Number(user?.balance ?? 0);
  const recentItems = useMemo(() => items.slice(0, 2), [items]);
  const walletBalanceLabel = useMemo(
    () => `${formatEnglishNumber(Number(user?.balance ?? 0), 2)} $`,
    [user?.balance],
  );
  const referralLink = useMemo(() => {
    if (!user?.id) return "";
    if (typeof window === "undefined") {
      return `?ref=${user.id}`;
    }
    return `${window.location.origin}/?ref=${user.id}`;
  }, [user?.id]);

  const handleCreateListing = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        SMART_CHAT_EDIT_PAYLOAD_KEY,
        JSON.stringify({
          mode: "create",
          action: SMART_CHAT_ACTION_ADD_ITEM,
        }),
      );
      window.dispatchEvent(new Event("open-smart-chat"));
    }
  };

  const handleCopyReferralLink = async () => {
    if (!referralLink) {
      toast.error(
        isArabic ? "رابط الدعوة غير متاح" : "Referral link unavailable",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      toast.success(isArabic ? "تم نسخ رابط الدعوة" : "Referral link copied");
    } catch {
      toast.error(isArabic ? "تعذر نسخ الرابط" : "Failed to copy link");
    }
  };

  const handleSidebarSelect = (tab: ProfileTabKey) => {
    setActiveTab(tab);
  };

  useEffect(() => {
    const tab = (searchParams.get("tab") || "").toLowerCase();

    if (tab === "requests" || tab === "purchases") {
      setActiveTab("REQUESTS");
      setActiveSidebarSection("REQUESTS");
      return;
    }

    if (tab === "withdrawals") {
      setActiveTab("WITHDRAWALS");
      setActiveSidebarSection("WITHDRAWALS");
      return;
    }
  }, [searchParams]);

  const scrollToSection = (section: "OVERVIEW" | "LISTINGS") => {
    const targetRef =
      section === "OVERVIEW" ? overviewSectionRef : listingsSectionRef;

    targetRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const handleSidebarAction = (
    section: "OVERVIEW" | "LISTINGS" | "FAV" | "REQUESTS" | "WITHDRAWALS",
  ) => {
    setActiveSidebarSection(section);

    if (section === "OVERVIEW") {
      scrollToSection("OVERVIEW");
      return;
    }

    if (section === "LISTINGS") {
      setActiveTab("ALL");
      scrollToSection("LISTINGS");
      return;
    }

    if (section === "FAV") {
      setActiveTab("FAV");
      scrollToSection("LISTINGS");
      return;
    }

    if (section === "REQUESTS") {
      setActiveTab("REQUESTS");
      scrollToSection("LISTINGS");
      return;
    }

    setActiveTab("WITHDRAWALS");
    scrollToSection("LISTINGS");
  };

  const planStatusLabel = user?.isActive
    ? isArabic
      ? "مفعّل"
      : "PRO"
    : isArabic
      ? "بانتظار التفعيل"
      : "Pending";

  const planTitle = user?.isActive
    ? isArabic
      ? "عضوية مفعّلة"
      : "Premium Member"
    : isArabic
      ? "أكمل التفعيل"
      : "Activate your plan";

  const planSubtitle = user?.activeUntil
    ? isArabic
      ? `صالح حتى ${formatDate(String(user.activeUntil))}`
      : `Active until ${formatDate(String(user.activeUntil))}`
    : isArabic
      ? "افتح خصائص النشر والسحب والإحالات"
      : "Unlock publishing, withdrawals, and referrals";

  const deleteItem = async () => {
    await handleConfirmDelete(
      itemIdToDelete!,
      setDeleting,
      refetch,
      setItemIdToDelete,
    );
  };

  const handleOpenPaypalWithdrawModal = () => {
    if (!user) return;
    setPaypalEmail(String(user.email || ""));
    setPaypalWithdrawAmount("");
    setPaypalWithdrawModalOpen(true);
  };

  const handleOpenShamCashWithdrawModal = () => {
    if (!user) return;
    setShamCashWithdrawAmount("");
    setShamCashWithdrawModalOpen(true);
  };

  const handlePaypalWithdraw = async () => {
    if (!user) return;

    const trimmedEmail = paypalEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error(
        isArabic ? "يرجى إدخال بريد PayPal صالح" : "Enter a valid PayPal email",
      );
      return;
    }

    const amount = Number(paypalWithdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(isArabic ? "قيمة السحب غير صحيحة" : "Invalid amount");
      return;
    }

    if (amount > availableToWithdraw) {
      toast.error(
        isArabic
          ? "المبلغ أكبر من الرصيد المتاح للسحب"
          : "Amount exceeds available withdrawable balance",
      );
      return;
    }

    try {
      setWithdrawingPaypal(true);
      const response = await fetch("/api/pay/paypal/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          paypalEmail: trimmedEmail,
          amount,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        payoutBatchId?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Withdrawal failed");
      }

      toast.success(
        isArabic
          ? `تم إرسال طلب السحب عبر PayPal بنجاح${data.payoutBatchId ? ` (${data.payoutBatchId})` : ""}`
          : `PayPal withdrawal request submitted successfully${data.payoutBatchId ? ` (${data.payoutBatchId})` : ""}`,
      );

      await refetch();
      setPaypalWithdrawModalOpen(false);
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Withdrawal failed";
      toast.error(
        isArabic
          ? localizeErrorMessage(rawMessage, true)
          : rawMessage || "Failed to withdraw",
      );
    } finally {
      setWithdrawingPaypal(false);
    }
  };

  const handleShamCashWithdraw = async () => {
    if (!user) return;

    const amount = Number(shamCashWithdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(isArabic ? "قيمة السحب غير صحيحة" : "Invalid amount");
      return;
    }

    if (amount > availableToWithdraw) {
      toast.error(
        isArabic
          ? "المبلغ أكبر من الرصيد المتاح للسحب"
          : "Amount exceeds available withdrawable balance",
      );
      return;
    }

    try {
      setWithdrawingShamCash(true);

      const response = await fetch("/api/pay/shamcash/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          amount,
          note: isArabic
            ? "طلب سحب من واجهة البروفايل"
            : "Withdrawal request from profile",
        }),
      });

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Withdrawal request failed");
      }

      toast.success(
        data.message ||
          (isArabic
            ? "تم إرسال السحب عبر ShamCash بنجاح"
            : "ShamCash withdrawal submitted successfully"),
      );

      await refetch();
      setShamCashWithdrawModalOpen(false);
      setShamCashWithdrawAmount("");
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Withdrawal request failed";
      toast.error(
        isArabic
          ? localizeErrorMessage(rawMessage, true)
          : rawMessage || "Failed to request withdrawal",
      );
    } finally {
      setWithdrawingShamCash(false);
    }
  };

  // عند اختيار عنصر للتعديل عبر المساعد الذكي
  useEffect(() => {
    if (!itemIdToEdit) return;

    // البحث عن العنصر المراد تعديله
    const itemToEdit = items.find((it) => it.item?.id === itemIdToEdit);
    if (!itemToEdit) {
      toast.error(isArabic ? "لم يتم العثور على العنصر" : "Item not found");
      setItemIdToEdit(null);
      return;
    }

    try {
      const { data, itemType } = buildEditDataByType(
        itemToEdit as Parameters<typeof buildEditDataByType>[0],
      );

      if (typeof window !== "undefined") {
        const payload = {
          mode: "edit",
          itemType,
          itemId: data.id,
          data,
        };

        window.localStorage.setItem(
          SMART_CHAT_EDIT_PAYLOAD_KEY,
          JSON.stringify(payload),
        );
        window.dispatchEvent(new Event("open-smart-chat"));
      }
    } catch {
      toast.error(
        isArabic
          ? "هذا النوع غير مدعوم للتعديل عبر المساعد حالياً"
          : "This item type is not supported for assistant edit yet",
      );
    }

    setItemIdToEdit(null);
  }, [itemIdToEdit, items, isArabic]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshFavorites = () => {
      refetch();
    };

    window.addEventListener("favorites-updated", refreshFavorites);
    return () => {
      window.removeEventListener("favorites-updated", refreshFavorites);
    };
  }, [refetch]);

  // Move loading and error checks AFTER all hooks
  if (loading && !user) {
    return <ProfileSkeleton />;
  }
  if (!user) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-xl flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <div className="rounded-2xl border border-rose-100 bg-white p-8 shadow-sm dark:border-rose-900/40 dark:bg-slate-900">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-300">
            <DynamicIcon iconName="MdOutlineErrorOutline" size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isUnauthorized
              ? isArabic
                ? "انتهت الجلسة الحالية"
                : "Your session is no longer valid"
              : isArabic
                ? "فشل تحميل الصفحة الشخصية"
                : "Failed to load profile page"}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isUnauthorized
              ? isArabic
                ? "تمت إعادة تهيئة قاعدة البيانات أو لم يعد هذا المستخدم موجودًا. سجّل الدخول من جديد للمتابعة."
                : "The database was reset or this user no longer exists. Sign in again to continue."
              : error ||
                (isArabic
                  ? "تعذر تحميل بيانات الملف الشخصي حاليًا."
                  : "We could not load your profile data right now.")}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {isArabic ? "إعادة المحاولة" : "Try Again"}
            </button>
            {isUnauthorized ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {isArabic ? "تسجيل الدخول من جديد" : "Sign In Again"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="mx-auto w-full max-w-7xl px-0 py-4 pb-24 sm:px-4 sm:py-8 lg:px-8"
    >
      {error && (
        <div className="mx-4 mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:mx-0">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded-lg border border-current px-3 py-1 font-semibold transition-opacity hover:opacity-80"
          >
            {isArabic ? "إعادة المحاولة" : "Retry"}
          </button>
        </div>
      )}

      <div className="flex w-full flex-col gap-8 lg:flex-row">
        <aside className="order-2 flex w-full flex-col gap-5 lg:order-1 lg:w-64 lg:shrink-0 lg:gap-6">
          <div className="hidden rounded-xl border border-slate-300 bg-linear-to-br from-blue-700 via-blue-600 to-blue-500 p-4 shadow-md dark:border-slate-700 dark:from-slate-900 dark:via-blue-900 dark:to-slate-800 lg:block">
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSidebarAction("OVERVIEW")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-300 ${
                  activeSidebarSection === "OVERVIEW"
                    ? "bg-white/90 text-blue-800 shadow-sm dark:bg-blue-900/80 dark:text-white"
                    : "text-white hover:bg-blue-100/80 hover:text-blue-900 dark:text-blue-100 dark:hover:bg-blue-800/70 dark:hover:text-white"
                }`}
              >
                <DynamicIcon iconName="MdDashboard" size={18} />
                <span className="font-semibold">
                  {isArabic ? "نظرة عامة" : "Overview"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSidebarAction("LISTINGS")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-300 ${
                  activeSidebarSection === "LISTINGS"
                    ? "bg-white/90 text-blue-800 shadow-sm dark:bg-blue-900/80 dark:text-white"
                    : "text-white hover:bg-blue-100/80 hover:text-blue-900 dark:text-blue-100 dark:hover:bg-blue-800/70 dark:hover:text-white"
                }`}
              >
                <DynamicIcon iconName="MdInventory2" size={18} />
                <span className="font-medium text-white">
                  {isArabic ? "إعلاناتي" : "My Listings"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSidebarAction("FAV")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-300 ${
                  activeSidebarSection === "FAV"
                    ? "bg-white/90 text-blue-800 shadow-sm dark:bg-blue-900/80 dark:text-white"
                    : "text-white hover:bg-blue-100/80 hover:text-blue-900 dark:text-blue-100 dark:hover:bg-blue-800/70 dark:hover:text-white"
                }`}
              >
                <DynamicIcon iconName="AiFillHeart" size={18} />
                <span className="font-medium">
                  {isArabic ? "المفضلة" : "Favorites"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSidebarAction("WITHDRAWALS")}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-300 ${
                  activeSidebarSection === "WITHDRAWALS"
                    ? "bg-white/90 text-blue-800 shadow-sm dark:bg-blue-900/80 dark:text-white"
                    : "text-white hover:bg-blue-100/80 hover:text-blue-900 dark:text-blue-100 dark:hover:bg-blue-800/70 dark:hover:text-white"
                }`}
              >
                <DynamicIcon
                  iconName="MdOutlineAccountBalanceWallet"
                  size={18}
                />
                <span className="font-medium text-white">
                  {isArabic ? "الأرباح والسحوبات" : "Earnings"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSidebarAction("REQUESTS")}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-300 ${
                  activeSidebarSection === "REQUESTS"
                    ? "bg-white/90 text-blue-800 shadow-sm dark:bg-blue-900/80 dark:text-white"
                    : "text-white hover:bg-blue-100/80 hover:text-blue-900 dark:text-blue-100 dark:hover:bg-blue-800/70 dark:hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <DynamicIcon iconName="MdOutlineShoppingCart" size={18} />
                  <span className="font-medium text-white">
                    {isArabic ? "طلبات الشراء والإيجار" : "Purchase requests"}
                  </span>
                </span>
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-xs font-bold text-white">
                  {purchaseRequests.length}
                </span>
              </button>
            </div>

            <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

            <div className="space-y-1">
              <button
                type="button"
                onClick={() => setEditProfileModalOpen(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <DynamicIcon
                  iconName="MdSettings"
                  size={18}
                  className="text-slate-100"
                />
                <span className="font-medium text-white">
                  {isArabic ? "إعدادات الحساب" : "Account Settings"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIdentityVerificationModalOpen(true)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <DynamicIcon
                  iconName="MdVerifiedUser"
                  size={18}
                  className="text-slate-100"
                />
                <span className="font-medium text-white">
                  {isArabic ? "توثيق الحساب" : "Verify account"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/10"
              >
                <DynamicIcon iconName="MdLogout" size={18} />
                <span className="font-medium">
                  {isArabic ? "تسجيل الخروج" : "Sign Out"}
                </span>
              </button>
            </div>
          </div>

          <div className="relative mx-0 overflow-hidden rounded-none bg-primary px-4 py-5 text-slate-700 shadow-lg dark:text-white sm:rounded-xl sm:px-6 lg:mx-0 lg:p-6">
            <div className="relative z-10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.22em] dark:text-white/70 text-slate-700">
                  {isArabic ? "حالة الخطة" : "Plan status"}
                </span>
                <span className="rounded-full bg-emerald-500/20 border-emerald-700 px-2 py-1 text-[10px] font-bold uppercase">
                  {planStatusLabel}
                </span>
              </div>
              <div>
                <p className="text-lg font-bold">{planTitle}</p>
                <p className="text-xs dark:text-white/80 text-slate-500">
                  {planSubtitle}
                </p>
              </div>
              {!user?.isActive && (
                <button
                  type="button"
                  onClick={() => activationModal.onOpen()}
                  className="w-full rounded-lg bg-blue-600 
                py-2 text-sm font-bold text-primary 
                shadow-sm transition-colors hover:bg-blue-700 text-white"
                >
                  {isArabic ? "ابدأ التفعيل" : "Activate Now"}
                </button>
              )}
            </div>
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          </div>
        </aside>

        <div
          ref={overviewSectionRef}
          className="order-1 flex min-w-0 flex-1 flex-col gap-5 lg:order-2 lg:gap-6"
        >
          <ProfileHeader
            user={user}
            totalItems={totalItems}
            formatDate={formatDate}
            walletBalanceLabel={walletBalanceLabel}
            totalFavorites={favorites.length}
            onPaypalWithdraw={handleOpenPaypalWithdrawModal}
            isWithdrawingPaypal={withdrawingPaypal}
            onShamCashWithdraw={handleOpenShamCashWithdrawModal}
            isWithdrawingShamCash={withdrawingShamCash}
            onEditProfile={() => setEditProfileModalOpen(true)}
            onCreateListing={handleCreateListing}
          />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6">
            <section className="rounded-none border-y border-slate-200 bg-white px-4 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl sm:border sm:p-6">
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {isArabic ? "أحدث الإعلانات" : "Recent Listings"}
                </h3>
                <button
                  type="button"
                  onClick={() => handleSidebarSelect("ALL")}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  {isArabic ? "عرض الكل" : "View All"}
                </button>
              </div>

              <div className="space-y-4">
                {recentItems.length ? (
                  recentItems.map((entry) => {
                    const item = entry.item;
                    const title =
                      [item.brand, item.model].filter(Boolean).join(" ") ||
                      (isArabic ? "إعلان بدون عنوان" : "Untitled listing");
                    const imageUrl = entry.itemImages?.[0]?.url || null;
                    const statusLabel =
                      item.status === "PENDING_REVIEW"
                        ? isArabic
                          ? "قيد المراجعة"
                          : "Pending"
                        : item.moderationAction === "REJECT"
                          ? isArabic
                            ? "مرفوض"
                            : "Rejected"
                          : isArabic
                            ? "نشط"
                            : "Active";
                    const statusClasses =
                      item.status === "PENDING_REVIEW"
                        ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"
                        : item.moderationAction === "REJECT"
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
                          : "bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400";

                    return (
                      <Link
                        key={item.id}
                        href={item.id ? `/items/details/${item.id}` : "#"}
                        className="flex items-center gap-4 rounded-lg border border-slate-100 p-3 transition-colors hover:border-primary/30 dark:border-slate-800"
                      >
                        <div className="h-14 w-14 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imageUrl}
                              alt={title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-400">
                              <DynamicIcon iconName="MdImage" size={22} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatEnglishNumber(Number(item.price ?? 0), 0)} $
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClasses}`}
                        >
                          {statusLabel}
                        </span>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    {isArabic ? "لا توجد إعلانات بعد." : "No listings yet."}
                  </div>
                )}
              </div>
            </section>
            <section className="relative overflow-hidden rounded-none border-y border-primary/20 bg-linear-to-br from-primary/5 to-primary/20 px-4 py-5 shadow-sm dark:from-primary/10 dark:to-primary/5 sm:rounded-xl sm:border sm:p-8">
              <div className="relative z-10">
                <div className="flex justify-between items-center">
                  <DynamicIcon
                    iconName="MdGroups2"
                    size={40}
                    className="mb-4 text-primary"
                  />
                  <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                    {isArabic ? "أدعُ الآخرين" : "Invite new people"}
                  </h3>
                </div>
                <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {isArabic
                    ? "إحصل على مكافآت تصل حتى 60% من اشتراك بعض المستخدمين الذين قمت بدعوتهم حسب نظام الشرائح المعتمد"
                    : "Earn rewards up to 60% of certain invited users' subscriptions based on our tiered system."}
                </p>
                <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-inner dark:border-slate-700 dark:bg-slate-900">
                  <div className="sm:hidden flex items-center justify-end p-2">
                    <button
                      type="button"
                      onClick={handleCopyReferralLink}
                      className="rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                    >
                      {isArabic ? "نسخ الرابط" : "Copy Link"}
                    </button>
                  </div>
                  <div className="relative hidden overflow-hidden sm:block">
                    <input
                      className={`w-full overflow-hidden truncate border-none bg-transparent py-3 text-sm font-mono font-medium text-slate-700 focus:ring-0 dark:text-slate-200 ${
                        isArabic
                          ? "pr-4 pl-36 text-right"
                          : "pl-4 pr-36 text-left"
                      }`}
                      readOnly
                      type="text"
                      value={
                        referralLink ||
                        (isArabic
                          ? "رابطك سيظهر هنا"
                          : "Your link will appear here")
                      }
                    />
                    <button
                      type="button"
                      onClick={handleCopyReferralLink}
                      className={`absolute top-1/2 -translate-y-1/2 rounded-md bg-blue-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-blue-700 ${
                        isArabic ? "left-2" : "right-2"
                      }`}
                    >
                      {isArabic ? "نسخ الرابط" : "Copy Link"}
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>
                    {isArabic ? "الدعوات الكلية:" : "Total invites:"}{" "}
                    {user?.referralStats?.invitedCount ?? 0}
                  </span>
                  <span>
                    {isArabic ? "النشطة:" : "Active:"}{" "}
                    {user?.referralStats?.activeInvitedCount ?? 0}
                  </span>
                  <span>
                    {isArabic ? "الأرباح المعلقة:" : "Pending earnings:"}{" "}
                    {formatCurrency(String(user?.pendingReferralEarnings ?? 0))}{" "}
                    س.
                  </span>
                </div>
              </div>
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            </section>
          </div>

          <ProfileInterestOrderEditor />

          <div ref={listingsSectionRef}>
            <TabbedView
              items={items}
              favorites={favorites}
              purchaseRequests={purchaseRequests}
              activeTab={activeTab}
              onTabChange={(tab) => {
                setActiveTab(tab);
                if (tab === "FAV") {
                  setActiveSidebarSection("FAV");
                  return;
                }
                if (tab === "REQUESTS") {
                  setActiveSidebarSection("REQUESTS");
                  return;
                }
                if (tab === "WITHDRAWALS") {
                  setActiveSidebarSection("WITHDRAWALS");
                  return;
                }
                setActiveSidebarSection("LISTINGS");
              }}
              setItemIdToEdit={setItemIdToEdit}
              setItemIdToDelete={setItemIdToDelete}
              onStatusChanged={refetch}
              availableToWithdraw={availableToWithdraw}
              onOpenShamCashWithdraw={handleOpenShamCashWithdrawModal}
              isWithdrawingShamCash={withdrawingShamCash}
            />
          </div>
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:hidden">
          <div className="grid grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => handleSidebarAction("OVERVIEW")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${
                activeSidebarSection === "OVERVIEW"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <DynamicIcon iconName="MdDashboard" size={18} />
              <span>{isArabic ? "نظرة عامة" : "Overview"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSidebarAction("LISTINGS")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${
                activeSidebarSection === "LISTINGS"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <DynamicIcon iconName="MdInventory2" size={18} />
              <span>{isArabic ? "إعلاناتي" : "Listings"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSidebarAction("REQUESTS")}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold ${
                activeSidebarSection === "REQUESTS"
                  ? "bg-primary text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              <DynamicIcon iconName="MdOutlineShoppingCart" size={18} />
              <span>{isArabic ? "الطلبات" : "Requests"}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditProfileModalOpen(true)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            >
              <DynamicIcon iconName="FaUserEdit" size={18} />
              <span>{isArabic ? "الحساب" : "Account"}</span>
            </button>
            <button
              type="button"
              onClick={() => setIdentityVerificationModalOpen(true)}
              className="flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
            >
              <DynamicIcon iconName="MdVerifiedUser" size={18} />
              <span>{isArabic ? "توثيق" : "Verify"}</span>
            </button>
          </div>
        </nav>
        <GoBackBtn />

        {editProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="profile-modal-backdrop absolute inset-0"
              onClick={() => setEditProfileModalOpen(false)}
            />
            <div className="relative z-10 w-11/12 max-w-2xl max-h-[85vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setEditProfileModalOpen(false)}
                className="profile-modal-close absolute top-3 left-3 z-20 rounded-full px-3 py-1.5 text-xs"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
              <ProfileAccountEditor
                user={user}
                onSaved={async () => {
                  await refetch();
                  setEditProfileModalOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {identityVerificationModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="profile-modal-backdrop absolute inset-0"
              onClick={() => setIdentityVerificationModalOpen(false)}
            />
            <div className="relative z-10 w-11/12 max-w-3xl max-h-[88vh] overflow-y-auto">
              <button
                type="button"
                onClick={() => setIdentityVerificationModalOpen(false)}
                className="profile-modal-close absolute top-3 left-3 z-20 rounded-full px-3 py-1.5 text-xs"
              >
                {isArabic ? "إغلاق" : "Close"}
              </button>
              <IdentityVerificationEditor
                user={user}
                onSaved={async () => {
                  await refetch();
                  setIdentityVerificationModalOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {paypalWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="profile-modal-backdrop absolute inset-0"
              onClick={() => {
                if (!withdrawingPaypal) setPaypalWithdrawModalOpen(false);
              }}
            />
            <div className="market-panel z-10 w-11/12 max-w-md rounded-[26px] p-5 space-y-3 shadow-xl">
              <h3 className="font-semibold text-white">
                {isArabic ? "سحب الأرباح عبر PayPal" : "PayPal withdrawal"}
              </h3>
              <p className="text-xs leading-relaxed text-slate-400">
                {isArabic
                  ? "أدخل بريد PayPal والمبلغ بالدولار الأمريكي."
                  : "Enter your PayPal email and USD amount."}
              </p>
              <p className="text-xs font-semibold text-emerald-300">
                {isArabic
                  ? `الرصيد المتاح للسحب: ${availableToWithdraw.toFixed(2)}$`
                  : `Available to withdraw: $${availableToWithdraw.toFixed(2)}`}
              </p>

              <input
                type="email"
                value={paypalEmail}
                onChange={(event) => setPaypalEmail(event.target.value)}
                placeholder={isArabic ? "بريد PayPal" : "PayPal email"}
                className="profile-modal-input rounded-2xl px-4 py-3 text-sm focus:border-sky-400 focus:outline-none"
                disabled={withdrawingPaypal}
              />

              <input
                type="number"
                min={0.01}
                max={Math.max(0, availableToWithdraw)}
                step="0.01"
                value={paypalWithdrawAmount}
                onChange={(event) =>
                  setPaypalWithdrawAmount(event.target.value)
                }
                placeholder={isArabic ? "المبلغ بالدولار" : "Amount in USD"}
                className="profile-modal-input rounded-2xl px-4 py-3 text-sm focus:border-sky-400 focus:outline-none"
                disabled={withdrawingPaypal}
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setPaypalWithdrawModalOpen(false)}
                  disabled={withdrawingPaypal}
                  className="market-secondary-btn rounded-2xl px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handlePaypalWithdraw}
                  disabled={withdrawingPaypal}
                  className="market-primary-btn rounded-2xl px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {withdrawingPaypal
                    ? isArabic
                      ? "جارٍ الإرسال..."
                      : "Submitting..."
                    : isArabic
                      ? "تأكيد سحب PayPal"
                      : "Confirm PayPal withdrawal"}
                </button>
              </div>
            </div>
          </div>
        )}

        {shamCashWithdrawModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="profile-modal-backdrop absolute inset-0"
              onClick={() => {
                if (!withdrawingShamCash) {
                  setShamCashWithdrawModalOpen(false);
                }
              }}
            />
            <div className="market-panel z-10 w-11/12 max-w-md rounded-[26px] p-5 space-y-3 shadow-xl">
              <h3 className="font-semibold text-white">
                {isArabic ? "سحب شام كاش" : "ShamCash withdrawal"}
              </h3>
              <p className="text-xs leading-relaxed text-slate-400">
                {isArabic
                  ? "أدخل المبلغ فقط وسيصل الطلب إلى الإدارة لإتمامه يدوياً."
                  : "Enter the amount only and the request will be sent to admin for manual completion."}
              </p>
              <p className="text-xs font-semibold text-cyan-300">
                {isArabic
                  ? `الرصيد المتاح للسحب: ${availableToWithdraw.toFixed(2)} USD`
                  : `Available to withdraw: ${availableToWithdraw.toFixed(2)} USD`}
              </p>

              <input
                type="number"
                min={0.01}
                max={Math.max(0, availableToWithdraw)}
                step="0.01"
                value={shamCashWithdrawAmount}
                onChange={(event) =>
                  setShamCashWithdrawAmount(event.target.value)
                }
                placeholder={
                  isArabic ? "المبلغ بالدولار الأمريكي (USD)" : "Amount in USD"
                }
                className="profile-modal-input rounded-2xl px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none"
                disabled={withdrawingShamCash}
              />

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => {
                    setShamCashWithdrawModalOpen(false);
                  }}
                  disabled={withdrawingShamCash}
                  className="market-secondary-btn rounded-2xl px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {isArabic ? "إلغاء" : "Cancel"}
                </button>
                <button
                  onClick={handleShamCashWithdraw}
                  disabled={withdrawingShamCash}
                  className="market-primary-btn rounded-2xl px-4 py-2.5 text-sm disabled:opacity-50"
                >
                  {withdrawingShamCash
                    ? isArabic
                      ? "جارٍ الإرسال..."
                      : "Submitting..."
                    : isArabic
                      ? "تأكيد سحب شام كاش"
                      : "Confirm ShamCash withdrawal"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm delete modal */}
        {itemIdToDelete && (
          <ConfirmModal
            title={isArabic ? "حذف العنصر" : "Delete item"}
            description={
              isArabic
                ? "هل تريد حذف هذا العنصر نهائياً؟"
                : "Do you want to permanently delete this item?"
            }
            onCancel={() => setItemIdToDelete(null)}
            onConfirm={deleteItem}
            loading={deleting}
          />
        )}
      </div>
    </div>
  );
};

export default Profile;
