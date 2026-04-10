"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { IoMdMenu } from "react-icons/io";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import h from "@/app/hooks";
import { AnimatePresence, motion } from "framer-motion";
import useActivationModal from "@/app/hooks/useActivationModal";
import UserMenueItem from "./UserMenueItem";
import { DynamicIcon } from "../addCategory/IconSetter";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useSearchHelper } from "@/app/hooks/useSearchHelper";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import SupportContactModal from "./SupportContactModal";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";

const MOBILE_DRAWER_CLASS =
  "fixed top-0 right-0 h-dvh w-[84vw] max-w-xs bg-white dark:bg-slate-900 shadow-2xl z-60 md:hidden p-4 overflow-y-auto border-l border-slate-200 dark:border-slate-700 flex flex-col gap-3";

const QUICK_FILTER_INPUT_BASE_CLASS =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300";

const QUICK_FILTER_ACTION_CLASS =
  "flex-1 rounded-lg bg-linear-to-r from-blue-500 to-indigo-500 px-3 py-2 text-xs font-medium text-white shadow-sm";

const QUICK_FILTER_RESET_CLASS =
  "flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700";

const PREFERENCES_WRAP_CLASS =
  "rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-2";

const UserMenu = () => {
  const [isOpen, setOpen] = useState(false);
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [showQuickFilters, setShowQuickFilters] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [drawerCity, setDrawerCity] = useState("");
  const [drawerMinPrice, setDrawerMinPrice] = useState("");
  const [drawerMaxPrice, setDrawerMaxPrice] = useState("");
  const loginModal = h.useLoginModal();
  const registerModal = h.useRegisterModal();
  const inviteModal = h.useInviteModal();
  const activationModal = useActivationModal();
  const { filters } = useSearchFilters();
  const searchHelper = useSearchHelper();
  const { isArabic } = useAppPreferences();
  const router = useRouter();
  const menuRef = useRef(null!);

  const { data: session, update, status } = useSession();
  const user = session?.user;
  const isSessionLoading = status === "loading";
  // ✅ إغلاق القوائم عند النقر خارجها
  h.useClickOutside(menuRef, () => setOpen(false));

  const toggleHandler = useCallback(() => setOpen((prev) => !prev), []);

  const textAlignClass = isArabic ? "text-right" : "text-left";
  const quickFilterInputClass = `${QUICK_FILTER_INPUT_BASE_CLASS} ${textAlignClass}`;

  const closeMenu = useCallback(() => setOpen(false), []);

  const openLogin = useCallback(() => {
    closeMenu();
    loginModal.onOpen();
  }, [closeMenu, loginModal]);

  const openRegister = useCallback(() => {
    closeMenu();
    registerModal.onOpen();
  }, [closeMenu, registerModal]);

  const goToProfile = useCallback(() => {
    closeMenu();
    router.push("/profile");
  }, [closeMenu, router]);

  const goToAdmin = useCallback(() => {
    closeMenu();
    router.push("/admin");
  }, [closeMenu, router]);

  const openSupportContact = useCallback(() => {
    closeMenu();
    setSupportModalOpen(true);
  }, [closeMenu]);

  useEffect(() => {
    if (!isOpen) return;

    setDrawerQuery(filters.q || "");
    setDrawerCity(filters.city || "");
    setDrawerMinPrice(
      typeof filters.minPrice === "number"
        ? String(filters.minPrice)
        : filters.minPrice || "",
    );
    setDrawerMaxPrice(
      typeof filters.maxPrice === "number"
        ? String(filters.maxPrice)
        : filters.maxPrice || "",
    );
  }, [isOpen, filters]);

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadOpenTicketsCount = async () => {
      try {
        const response = await fetch("/api/support/tickets", {
          headers: {
            "x-lang": isArabic ? "ar" : "en",
          },
        });

        if (!response.ok) return;

        const data = (await response.json()) as {
          openCount?: number;
        };

        setOpenTicketsCount(Number(data.openCount ?? 0));
      } catch {
        setOpenTicketsCount(0);
      }
    };

    loadOpenTicketsCount();
  }, [isOpen, user, isArabic]);

  const handleLogout = async () => {
    closeMenu();
    await signOut({ redirect: false });
    router.push("/");
    update();
    router.refresh();
  };

  const applyQuickFilters = () => {
    searchHelper.handleSearch(drawerQuery.trim());
    searchHelper.handleSetCity(drawerCity.trim());
    searchHelper.handleSetMinPrice(
      drawerMinPrice.trim() === "" ? null : Number(drawerMinPrice),
    );
    searchHelper.handleSetMaxPrice(
      drawerMaxPrice.trim() === "" ? null : Number(drawerMaxPrice),
    );
    setShowQuickFilters(false);
    closeMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetQuickFilters = () => {
    setDrawerQuery("");
    setDrawerCity("");
    setDrawerMinPrice("");
    setDrawerMaxPrice("");
    searchHelper.handleSearch("");
    searchHelper.handleSetCity("");
    searchHelper.handleSetMinPrice(null);
    searchHelper.handleSetMaxPrice(null);
    setShowQuickFilters(false);
    closeMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const now = new Date();
  const activeUntilDate = user?.activeUntil ? new Date(user.activeUntil) : null;
  const graceEndDate = activeUntilDate
    ? new Date(activeUntilDate.getTime() + 15 * 24 * 60 * 60 * 1000)
    : null;
  const isSubscriptionActive =
    Boolean(activeUntilDate) && activeUntilDate!.getTime() > now.getTime();
  const isInGracePeriod =
    Boolean(activeUntilDate) &&
    Boolean(graceEndDate) &&
    now.getTime() >= activeUntilDate!.getTime() &&
    now.getTime() <= graceEndDate!.getTime();

  const handleSubscriptionAction = () => {
    closeMenu();

    if (isSubscriptionActive) {
      inviteModal.onOpen();
      return;
    }

    if (isInGracePeriod) {
      activationModal.onOpen();
      return;
    }

    activationModal.onOpen();
  };

  const subscriptionLabel = isSubscriptionActive
    ? isArabic
      ? "دعوة الأصدقاء"
      : "Invite friends"
    : isInGracePeriod
      ? isArabic
        ? "جدّد التفعيل"
        : "Renew activation"
      : isArabic
        ? "تفعيل الحساب"
        : "Activate account";

  const subscriptionIcon = isSubscriptionActive ? "MdGroupAdd" : "FaCheck";

  const renderGuestMenuItems = () => (
    <>
      <UserMenueItem
        label={isArabic ? "تسجيل الدخول" : "Login"}
        onClick={openLogin}
      />
      <UserMenueItem
        label={isArabic ? "إنشاء حساب" : "Register"}
        onClick={openRegister}
      />
    </>
  );

  const renderLoadingMenuItems = () => (
    <div className="p-2 text-xs text-slate-500 dark:text-slate-300">
      {isArabic ? "جارٍ تحميل الحساب..." : "Loading account..."}
    </div>
  );

  const renderUserMenuItems = () => (
    <>
      <UserMenueItem
        label={subscriptionLabel}
        onClick={handleSubscriptionAction}
        iconName={subscriptionIcon}
        isArabic={isArabic}
      />
      <UserMenueItem
        label={isArabic ? "الصفحة الشخصية" : "Profile"}
        onClick={goToProfile}
        iconName="MdPerson"
        isArabic={isArabic}
      />
      {user?.isAdmin && (
        <UserMenueItem
          label={isArabic ? "لوحة الإدارة" : "Admin dashboard"}
          onClick={goToAdmin}
          iconName="MdOutlineDashboard"
          isArabic={isArabic}
        />
      )}
      <UserMenueItem
        label={isArabic ? "تواصل معنا" : "Contact Us"}
        onClick={openSupportContact}
        iconName="RiCustomerService2Fill"
        badge={openTicketsCount > 0 ? String(openTicketsCount) : undefined}
      />

      <UserMenueItem
        label={isArabic ? "تسجيل الخروج" : "Logout"}
        onClick={handleLogout}
        iconName="MdLogout"
        isArabic={isArabic}
      />
    </>
  );

  const renderPreferenceControls = () => (
    <div className={PREFERENCES_WRAP_CLASS}>
      <p
        className={`text-xs font-medium text-slate-500 dark:text-slate-300 mb-2 ${textAlignClass}`}
      >
        {isArabic ? "اللغة والمظهر" : "Language and Theme"}
      </p>
      <div className="flex items-center justify-start gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-end relative">
        {/* ✅ User menu + dropdown */}
        <div className="relative" ref={menuRef}>
          {/* زر الأيقونة */}
          <button
            onClick={toggleHandler}
            className="
            rounded-full border border-slate-200 px-2.5 py-1.5
            shadow-sm hover:shadow-md transition-all duration-200
            flex items-center gap-2
            bg-white text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100
          "
          >
            <IoMdMenu size={20} />
            <Image
              className="rounded-full"
              alt="avatar"
              src="/images/avatar.svg"
              width={24}
              height={24}
            />
          </button>

          {/* Desktop dropdown */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15 }}
                dir={isArabic ? "rtl" : "ltr"}
                className="
                hidden md:flex absolute right-0 top-12 bg-white dark:bg-slate-900
                rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-3
                min-w-56 text-sm z-50 origin-top-right
                flex-col gap-2 sm:w-fit
              "
              >
                {isSessionLoading
                  ? renderLoadingMenuItems()
                  : !user
                    ? renderGuestMenuItems()
                    : renderUserMenuItems()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile side drawer */}
          <AnimatePresence>
            {isOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label={
                    isArabic ? "إغلاق خلفية القائمة" : "Close menu overlay"
                  }
                  onClick={closeMenu}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/35 z-50 md:hidden"
                />

                <motion.aside
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ duration: 0.24, ease: "easeOut" }}
                  dir={isArabic ? "rtl" : "ltr"}
                  className={MOBILE_DRAWER_CLASS}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <Image
                        className="rounded-full"
                        alt="avatar"
                        src="/images/avatar.svg"
                        width={28}
                        height={28}
                      />
                      <span
                        className={`text-sm font-semibold text-slate-700 dark:text-slate-100 ${textAlignClass}`}
                      >
                        {isArabic ? "القائمة" : "Menu"}
                      </span>
                    </div>
                    <button
                      onClick={closeMenu}
                      className="text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
                      aria-label={
                        isArabic ? "إغلاق القائمة الجانبية" : "Close side menu"
                      }
                    >
                      <DynamicIcon iconName="MdClose" size={20} />
                    </button>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <button
                      onClick={() => setShowQuickFilters((prev) => !prev)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-100 ${textAlignClass}`}
                    >
                      <span>{isArabic ? "بحث متقدم" : "Advanced Search"}</span>
                      <DynamicIcon
                        iconName={
                          showQuickFilters ? "FaChevronUp" : "FaChevronDown"
                        }
                        size={14}
                        className="text-slate-500 dark:text-slate-300"
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {showQuickFilters && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <div
                            className="px-3 pb-3 pt-1 flex 
                          flex-col gap-2.5 border-t
                           border-slate-100
                            dark:border-slate-700"
                          >
                            <input
                              type="text"
                              value={drawerQuery}
                              onChange={(event) =>
                                setDrawerQuery(event.target.value)
                              }
                              placeholder={
                                isArabic
                                  ? "ابحث بكلمات مفتاحية"
                                  : "Search keywords"
                              }
                              className={quickFilterInputClass}
                            />
                            <input
                              type="text"
                              value={drawerCity}
                              onChange={(event) =>
                                setDrawerCity(event.target.value)
                              }
                              placeholder={isArabic ? "المدينة" : "City"}
                              className={quickFilterInputClass}
                            />

                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                value={drawerMinPrice}
                                onChange={(event) =>
                                  setDrawerMinPrice(event.target.value)
                                }
                                placeholder={isArabic ? "الحد الأدنى" : "Min"}
                                className={quickFilterInputClass}
                              />
                              <input
                                type="number"
                                value={drawerMaxPrice}
                                onChange={(event) =>
                                  setDrawerMaxPrice(event.target.value)
                                }
                                placeholder={isArabic ? "الحد الأعلى" : "Max"}
                                className={quickFilterInputClass}
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                onClick={resetQuickFilters}
                                className={QUICK_FILTER_RESET_CLASS}
                              >
                                {isArabic ? "إعادة ضبط" : "Reset"}
                              </button>
                              <button
                                onClick={applyQuickFilters}
                                className={QUICK_FILTER_ACTION_CLASS}
                              >
                                {isArabic ? "تطبيق" : "Apply"}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col gap-1">
                    {isSessionLoading
                      ? renderLoadingMenuItems()
                      : !user
                        ? renderGuestMenuItems()
                        : renderUserMenuItems()}
                  </div>

                  {renderPreferenceControls()}
                </motion.aside>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SupportContactModal
        isOpen={isSupportModalOpen}
        onClose={() => setSupportModalOpen(false)}
        onOpenCountChange={setOpenTicketsCount}
      />
    </div>
  );
};

export default UserMenu;
