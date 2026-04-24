"use client";

import confetti from "canvas-confetti";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppPreferences } from "./providers/AppPreferencesProvider";
import useActivationModal from "@/app/hooks/useActivationModal";
import useInviteModal from "@/app/hooks/useInviteHook";

type OverlayMode = "success" | "inactive" | null;

const ACTIVATION_PENDING_KEY = "barrow:activation-celebration-pending";
const ACTIVATION_SEEN_PREFIX = "barrow:activation-seen:";
const INACTIVE_PROMPT_DISMISSED_PREFIX = "barrow:inactive-prompt-dismissed:";
export const OPEN_SMART_CHAT_ON_HOME_KEY = "barrow:open-smart-chat-on-home";

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

      if (isCurrentlyActive && activeUntilIso) {
        safeSet(seenKey, activeUntilIso);
      }

      return;
    }

    if (isCurrentlyActive && activeUntilIso) {
      if (pendingCelebration && lastSeenActivation !== activeUntilIso) {
        safeSet(seenKey, activeUntilIso);
        safeRemove(dismissedKey);
        safeSessionRemove(ACTIVATION_PENDING_KEY);
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

  return (
    <div
      className="activation-spotlight-overlay"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="activation-spotlight-shell">
        <div className="activation-spotlight-glow" />
        <div className="activation-spotlight-frame">
          <div className="activation-spotlight-headline">
            {mode === "success" ? successTitle : inactiveTitle}
          </div>

          {mode === "success" ? (
            <>
              <p className="activation-spotlight-copy">
                {t(
                  "أصبحت الآن قادراً على النشر، بناء الثقة مع المشترين، واستثمار فترة التفعيل في تنمية دخلك عبر نظام الدعوات الذكي.",
                  "You can now publish listings, build buyer trust, and use this activation window to grow your income through the referral system.",
                )}
              </p>

              <div className="activation-spotlight-tier-card">
                <div className="activation-spotlight-tier-title">
                  {t(
                    "كيف تربح من نظام الشرائح؟",
                    "How the referral tiers reward you",
                  )}
                </div>
                <div className="activation-spotlight-tier-grid">
                  <div>
                    <strong>60%</strong>
                    <span>
                      {t(
                        "لأول 10 دعوات مفعّلة",
                        "for the first 10 activated invites",
                      )}
                    </span>
                  </div>
                  <div>
                    <strong>40%</strong>
                    <span>{t("للدعوات 11-20", "for invites 11-20")}</span>
                  </div>
                  <div>
                    <strong>30%</strong>
                    <span>{t("للدعوات 21-30", "for invites 21-30")}</span>
                  </div>
                  <div>
                    <strong>20%</strong>
                    <span>
                      {t("لما بعد 30 دعوة", "for every invite after 30")}
                    </span>
                  </div>
                </div>
                <p className="activation-spotlight-tier-note">
                  {t(
                    "كلما فعّل المدعوون حساباتهم وبدأ لديهم نشاط حقيقي في المنصة، تتحول الدعوات إلى أرباح معلّقة ثم إلى رصيد جاهز عند الاستحقاق.",
                    "When invited users activate and show real listing activity, your referrals turn into pending earnings and then into ready balance.",
                  )}
                </p>
              </div>

              <div className="activation-spotlight-actions">
                <button
                  type="button"
                  className="activation-spotlight-btn activation-spotlight-btn-muted"
                  onClick={closeOverlay}
                >
                  {t("موافق", "OK")}
                </button>
                <button
                  type="button"
                  className="activation-spotlight-btn activation-spotlight-btn-emerald"
                  onClick={openInvite}
                >
                  {t("دعوة الآخرين", "Invite others")}
                </button>
                <button
                  type="button"
                  className="activation-spotlight-btn activation-spotlight-btn-rgb"
                  onClick={openPublishAssistant}
                >
                  {t("نشر إعلان جديد", "Publish a new listing")}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="activation-spotlight-copy">
                {t(
                  "التفعيل يمنحك 30 يوماً من النشر الكامل، ظهور أقوى لإعلاناتك، وصولاً أفضل للمشترين، وإمكانية دعوة الآخرين وتحويل نشاطك إلى أرباح متصاعدة.",
                  "Activation gives you 30 days of full publishing access, stronger visibility, better buyer reach, and the ability to invite others and turn activity into growing earnings.",
                )}
              </p>
              <div className="activation-spotlight-tier-card activation-spotlight-tier-card-warm">
                <div className="activation-spotlight-tier-title">
                  {t("لماذا يستحق التفعيل؟", "Why activation is worth it")}
                </div>
                <p className="activation-spotlight-tier-note">
                  {t(
                    "ابدأ بالنشر عبر المساعد الذكي، شارك رابط دعوتك لتحصل على أرباح حسب نظام الشرائح، واستفد من وسائل التفعيل المحلية إذا كانت بوابات الدفع غير مدعومة في بلدك.",
                    "Start publishing with the smart assistant, share your invite link to earn through referral tiers, and use local activation methods if gateways are not available in your country.",
                  )}
                </p>
              </div>
              <div className="activation-spotlight-actions activation-spotlight-actions-compact">
                <button
                  type="button"
                  className="activation-spotlight-btn activation-spotlight-btn-muted"
                  onClick={closeOverlay}
                >
                  {t("موافق", "OK")}
                </button>
                <button
                  type="button"
                  className="activation-spotlight-btn activation-spotlight-btn-primary"
                  onClick={openActivation}
                >
                  {t("تفعيل الحساب", "Activate account")}
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
