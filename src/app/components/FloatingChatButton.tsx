"use client";
import { useEffect, useRef, useState } from "react";
import SmartChatBot from "./SmartChatBot";
import { DynamicIcon } from "./addCategory/IconSetter";
import { useSession } from "next-auth/react";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useActivationModal from "@/app/hooks/useActivationModal";
import { useAppPreferences } from "./providers/AppPreferencesProvider";
import { ASSISTANT_NAME_AR, ASSISTANT_NAME_EN } from "@/app/i18n/brand";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const FloatingChatButton = () => {
  const [open, setOpen] = useState(false);
  const [waveKey, setWaveKey] = useState(0);
  const { data: session, status } = useSession();
  const registerModal = useRegisterModal();
  const activationModal = useActivationModal();
  const { isArabic } = useAppPreferences();
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const user = session?.user;
  const isSessionLoading = status === "loading";
  const isLoggedIn = Boolean(user?.id);
  const isUserActive = Boolean(user?.isActive);
  const shouldRender = pathname === "/" || pathname === "/profile";

  useEffect(() => {
    const handleOpenSmartChat = () => {
      setOpen(true);
      setWaveKey((prev) => prev + 1);
    };
    window.addEventListener("open-smart-chat", handleOpenSmartChat);

    return () => {
      window.removeEventListener("open-smart-chat", handleOpenSmartChat);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;

      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;

      setOpen(false);
    };

    document.addEventListener("mousedown", handleOutsidePress);
    document.addEventListener("touchstart", handleOutsidePress);

    return () => {
      document.removeEventListener("mousedown", handleOutsidePress);
      document.removeEventListener("touchstart", handleOutsidePress);
    };
  }, [open]);

  const toggleAssistant = () => {
    setOpen((prev) => !prev);
    setWaveKey((prev) => prev + 1);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={toggleAssistant}
        className="fixed bottom-24 right-6 z-50 h-14 w-14 rounded-full p-0.5 animated-indigo-border shadow-[0_10px_25px_rgba(37,99,235,0.35)]"
        title={isArabic ? ASSISTANT_NAME_AR : ASSISTANT_NAME_EN}
        aria-label={isArabic ? "فتح المساعد" : "Open assistant"}
        aria-expanded={open}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full border border-white/25 bg-slate-900/60 text-white backdrop-blur-md">
          <motion.span
            key={waveKey}
            animate={{ rotate: [0, 18, -12, 18, 0], y: [0, -2, 0] }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            style={{ transformOrigin: "65% 20%" }}
          >
            <DynamicIcon
              iconName="BsRobot"
              size={24}
              className="text-blue-100"
            />
          </motion.span>
        </span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className="fixed bottom-40 right-4 left-4 sm:left-auto sm:right-6 z-60"
        >
          {isSessionLoading ? (
            <div
              className="w-full sm:w-97.5 max-w-104 bg-white/92 dark:bg-slate-900/92 border border-neutral-200/80 dark:border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden"
              dir={isArabic ? "rtl" : "ltr"}
            >
              <div className="px-4 py-4 text-sm text-slate-600 dark:text-slate-300">
                {isArabic
                  ? "جارٍ التحقق من حالة الحساب..."
                  : "Checking account status..."}
              </div>
            </div>
          ) : isLoggedIn && isUserActive ? (
            <SmartChatBot onClose={() => setOpen(false)} />
          ) : (
            <div
              className="w-full sm:w-97.5 max-w-104 bg-white/92 dark:bg-slate-900/92 border border-neutral-200/80 dark:border-slate-700/80 rounded-2xl shadow-xl backdrop-blur-xl overflow-hidden"
              dir={isArabic ? "rtl" : "ltr"}
            >
              <div className="px-4 py-3 border-b border-neutral-100 dark:border-slate-700 bg-neutral-50 dark:bg-slate-800">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {isArabic ? ASSISTANT_NAME_AR : ASSISTANT_NAME_EN}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {isArabic
                    ? "مساعد احترافي لإدارة النشر، التفعيل، وتنمية العائد"
                    : "A professional assistant for publishing, activation, and growth"}
                </p>
              </div>

              <div className="p-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  {isArabic
                    ? `أنا ${ASSISTANT_NAME_AR}، أساعدك على نشر إعلاناتك بطريقة منظمة، تحسين ظهورها أمام العملاء المناسبين، والاستفادة من نظام الدعوات لزيادة العائد.`
                    : `I'm ${ASSISTANT_NAME_EN}. I help you publish listings in a structured way, improve visibility to the right audience, and benefit from referrals to grow earnings.`}
                </p>
                <ul className="list-disc pr-5 pl-5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  <li>
                    {isArabic
                      ? "إنشاء ونشر أنواع متعددة من الإعلانات: سيارات، عقارات، وعناصر أخرى"
                      : "Create and publish multiple listing types: cars, properties, and more"}
                  </li>
                  <li>
                    {isArabic
                      ? "الوصول إلى مزايا النشر المتقدمة بعد تفعيل الاشتراك"
                      : "Access advanced publishing capabilities after activation"}
                  </li>
                  <li>
                    {isArabic
                      ? "تنمية الدخل عبر مشاركة رابط الدعوة وتتبع أرباح الإحالات"
                      : "Grow income with referral sharing and earnings tracking"}
                  </li>
                </ul>

                {!isLoggedIn ? (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      registerModal.onOpen();
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm"
                  >
                    {isArabic ? "أنشئ حسابك الآن" : "Sign up now"}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {isArabic
                        ? "حسابك مسجّل، بقي خطوة التفعيل للبدء في النشر الكامل."
                        : "Your account is registered; activation is required for full publishing access."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        activationModal.onOpen();
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-sky-600 text-white text-sm"
                    >
                      {isArabic ? "فعّل حسابك الآن" : "Activate account"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingChatButton;
