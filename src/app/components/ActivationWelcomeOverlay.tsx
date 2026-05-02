"use client";

import confetti from "canvas-confetti";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppPreferences } from "./providers/AppPreferencesProvider";
import useActivationModal from "@/app/hooks/useActivationModal";
import useInviteModal from "@/app/hooks/useInviteHook";

type OverlayMode = "success" | "inactive" | null;

const ACTIVATION_PENDING_KEY = "mashhoor:activation-celebration-pending";
const ACTIVATION_SEEN_PREFIX = "mashhoor:activation-seen:";
const INACTIVE_PROMPT_DISMISSED_PREFIX = "mashhoor:inactive-prompt-dismissed:";
export const OPEN_SMART_CHAT_ON_HOME_KEY = "mashhoor:open-smart-chat-on-home";

const EXCLUDED_PATH_PREFIXES = ["/admin", "/payment"];

const safeGet = (key: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {}
};

const safeRemove = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch {}
};

const safeSessionGet = (key: string) => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeSessionSet = (key: string, value: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(key, value);
  } catch {}
};

const safeSessionRemove = (key: string) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(key);
  } catch {}
};

const fireCelebration = () => {
  const defaults = {
    spread: 80,
    ticks: 220,
    gravity: 0.9,
    decay: 0.93,
    startVelocity: 28,
    colors: ["#22c55e", "#38bdf8", "#f59e0b", "#f43f5e", "#a855f7"],
  };

  void confetti({
    ...defaults,
    particleCount: 90,
    origin: { x: 0.2, y: 0.35 },
  });
  void confetti({
    ...defaults,
    particleCount: 110,
    origin: { x: 0.8, y: 0.35 },
  });
  void confetti({
    ...defaults,
    particleCount: 140,
    spread: 110,
    origin: { x: 0.5, y: 0.45 },
  });
};

const ActivationWelcomeOverlay = () => {
  const { data: session, status } = useSession();
  const { isArabic } = useAppPreferences();
  const activationModal = useActivationModal();
  const inviteModal = useInviteModal();
  const pathname = usePathname();
  const router = useRouter();
  const initializedRef = useRef(false);
  const [mode, setMode] = useState<OverlayMode>(null);
  const [isTiersExpanded, setIsTiersExpanded] = useState(false);

  const user = session?.user;
  const userId = user?.id ?? null;
  const activeUntilIso = useMemo(() => {
    if (!user?.activeUntil) {
      return null;
    }

    const parsed = new Date(user.activeUntil);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }, [user?.activeUntil]);

  const isCurrentlyActive = useMemo(() => {
    if (!user?.isActive || !activeUntilIso) {
      return false;
    }

    return new Date(activeUntilIso).getTime() > Date.now();
  }, [activeUntilIso, user?.isActive]);

  const isExcludedPath = EXCLUDED_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  useEffect(() => {
    if (mode !== "success") {
      return;
    }

    fireCelebration();
  }, [mode]);

  useEffect(() => {
    if (status === "loading" || isExcludedPath || !userId) {
      return;
    }

    const seenKey = `${ACTIVATION_SEEN_PREFIX}${userId}`;
    const dismissedKey = `${INACTIVE_PROMPT_DISMISSED_PREFIX}${userId}`;
    const lastSeenActivation = safeGet(seenKey);
    const pendingCelebration = safeSessionGet(ACTIVATION_PENDING_KEY) === "1";

    if (!initializedRef.current) {
      initializedRef.current = true;

      if (isCurrentlyActive && activeUntilIso && pendingCelebration) {
        if (lastSeenActivation !== activeUntilIso) {
          safeSet(seenKey, activeUntilIso);
          safeRemove(dismissedKey);
          safeSessionRemove(ACTIVATION_PENDING_KEY);
          setIsTiersExpanded(false);
          setMode("success");
          return;
        }
        safeSessionRemove(ACTIVATION_PENDING_KEY);
      }

      if (isCurrentlyActive && activeUntilIso) {
        safeSet(seenKey, activeUntilIso);
      }

      if (!user?.isActive) {
        const dismissed = safeGet(dismissedKey) === "1";
        if (!dismissed) {
          setMode("inactive");
        }
      }

      return;
    }

    if (isCurrentlyActive && activeUntilIso) {
      if (pendingCelebration && lastSeenActivation !== activeUntilIso) {
        safeSet(seenKey, activeUntilIso);
        safeRemove(dismissedKey);
        safeSessionRemove(ACTIVATION_PENDING_KEY);
        setIsTiersExpanded(false);
        setMode("success");
        return;
      }

      safeSet(seenKey, activeUntilIso);
      if (mode === "inactive") {
        setMode(null);
      }
      return;
    }

    if (!user?.isActive) {
      const dismissed = safeGet(dismissedKey) === "1";
      if (!dismissed && mode === null) {
        setMode("inactive");
      }
    }
  }, [
    activeUntilIso,
    isCurrentlyActive,
    isExcludedPath,
    mode,
    status,
    user?.isActive,
    userId,
  ]);

  const closeOverlay = useCallback(() => {
    if (mode === "inactive" && userId) {
      safeSet(`${INACTIVE_PROMPT_DISMISSED_PREFIX}${userId}`, "1");
    }
    setIsTiersExpanded(false);
    setMode(null);
  }, [mode, userId]);

  const openInvite = useCallback(() => {
    setMode(null);
    inviteModal.onOpen();
  }, [inviteModal]);

  const openActivation = useCallback(() => {
    if (userId) {
      safeSet(`${INACTIVE_PROMPT_DISMISSED_PREFIX}${userId}`, "1");
    }
    setMode(null);
    activationModal.onOpen();
  }, [activationModal, userId]);

  const openPublishAssistant = useCallback(() => {
    setMode(null);
    setIsTiersExpanded(false);

    if (pathname !== "/") {
      safeSessionSet(OPEN_SMART_CHAT_ON_HOME_KEY, "1");
      router.push("/");
      return;
    }

    window.dispatchEvent(new Event("open-smart-chat"));
  }, [pathname, router]);

  if (!mode || !userId || isExcludedPath) {
    return null;
  }

  const successTitle = t(
    "تم تفعيل حسابك لمدة 30 يوماً",
    "Your account is active for 30 days",
  );

  const inactiveTitle = t(
    "فعّل حسابك وانطلق بثقة",
    "Activate your account and unlock momentum",
  );

  const toggleTiers = () => {
    setIsTiersExpanded((current) => !current);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header gradient background */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-linear-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-500/10 dark:to-purple-500/10" />

        {/* Content */}
        <div className="relative p-8 sm:p-10">
          {/* Title */}
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6 text-slate-900 dark:text-white">
            {mode === "success" ? successTitle : inactiveTitle}
          </h2>

          {mode === "success" ? (
            <>
              <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 leading-relaxed text-center">
                {t(
                  "يمكنك الآن دعوة الآخرين للانضمام والاستفادة من مكافآت تصل حتى 60% من اشتراكاتهم شهرياً، حسب ",
                  "You can now invite others to join and earn rewards of up to 60% from the monthly subscriptions of the first 10 real users you invite, based on the ",
                )}
                <button
                  type="button"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  onClick={toggleTiers}
                  aria-expanded={isTiersExpanded}
                >
                  {t("نظام الشرائح", "tier system")}
                </button>
                {t(
                  ". استثمر هذه الفترة لنشر إعلاناتك و تعزيز أرباحك عبر مشاركة رابط الدعوة الخاص بك مع أصدقائك.",
                  " Make the most of this period to publish your listings and boost your earnings by sharing your invite link with your friends.",
                )}
              </p>

              {/* Tier Card */}
              <div className="mb-8 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/50">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
                  onClick={toggleTiers}
                  aria-expanded={isTiersExpanded}
                >
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {t("ماهو نظام الشرائح", "What is the tier system?")}
                  </span>
                  <span className="text-2xl text-slate-500 dark:text-slate-400">
                    {isTiersExpanded ? "−" : "+"}
                  </span>
                </button>
                {isTiersExpanded && (
                  <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          60%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                          {t("لأول 10 مستخدمين", "First 10 users")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          40%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                          {t("للمستخدمين 11-20", "Users 11-20")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          30%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                          {t("للمستخدمين 21-30", "Users 21-30")}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          20%
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                          {t("بعد ذلك", "After that")}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {t(
                        "يُحتسب العائد عند تفعيل المدعو لاشتراكه ووجود نشاط حقيقي له داخل المنصة، ثم تُضاف الأرباح إلى رصيدك المعلق وفق آلية النظام المعتمدة.",
                        "Rewards are counted when the invited user activates a subscription and shows real activity on the platform.",
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  className="flex-1 px-6 py-3 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-semibold transition"
                  onClick={closeOverlay}
                >
                  {t("موافق", "OK")}
                </button>
                <button
                  type="button"
                  className="flex-1 px-6 py-3 text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg font-semibold transition shadow-lg"
                  onClick={openInvite}
                >
                  {t("دعوة الآخرين", "Invite others")}
                </button>
                <button
                  type="button"
                  className="flex-1 px-6 py-3 text-white bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold transition shadow-lg"
                  onClick={openPublishAssistant}
                >
                  {t("نشر إعلان", "Publish")}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Benefits Card */}
              <div
                className="mb-8 p-6 border border-sky-200
               dark:border-sky-900 bg-sky-50
                dark:bg-sky-950/30 rounded-xl"
              >
                <h3 className="font-bold text-slate-900 dark:text-white mb-4">
                  {t("لماذا يستحق الاشتراك؟", "Why subscription is worth it")}
                </h3>
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                  <li>
                    ✓{" "}
                    {t(
                      "انتشار عال لإعلاناتك مع ظهور أقوى",
                      "High visibility with stronger appearance",
                    )}
                  </li>
                  <li>
                    ✓{" "}
                    {t(
                      "دخل شهري من نظام الدعوات يصل لـ60%",
                      "Monthly income from referrals up to 60%",
                    )}
                  </li>
                  <li>
                    ✓{" "}
                    {t(
                      "تواصل مع صاحب العرض عبر دردشة مباشرة من التطبيق",
                      "Connect with listing owners through in-app direct chat",
                    )}
                  </li>
                  <li>
                    ✓{" "}
                    {t("مكافآت وفعاليات حصرية", "Exclusive rewards and events")}
                  </li>
                  <li>
                    ✓{" "}
                    {t(
                      "تنظيم عمليات البيع والتأجير بسهولة",
                      "Easy sales and rental management",
                    )}
                  </li>
                  <li>
                    ✓{" "}
                    {t(
                      "طرق دفع متعددة وآمنة",
                      "Multiple secure payment methods",
                    )}
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  className="flex-1 px-6 py-3 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-semibold transition"
                  onClick={closeOverlay}
                >
                  {t("موافق", "OK")}
                </button>
                <button
                  type="button"
                  className="flex-1 px-6 py-3 text-white bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg font-semibold transition shadow-lg"
                  onClick={openActivation}
                >
                  {t("تفعيل الاشتراك", "Activate subscription")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivationWelcomeOverlay;
