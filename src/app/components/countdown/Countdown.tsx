"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useActivationModal from "@/app/hooks/useActivationModal";
import useInviteModal from "@/app/hooks/useInviteHook";
import { DynamicIcon } from "../addCategory/IconSetter";
import { usePathname } from "next/navigation";
import { useActivationCountdown } from "./useActivationCountdown";

const ActivationCountdown = () => {
  const activationModal = useActivationModal();
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [shake, setShake] = useState(false);
  const pathname = usePathname();
  const { onOpen } = useInviteModal();
  const { user, daysLeft, progress, color, state } = useActivationCountdown();

  const inGrace = state === "IN_GRACE";
  const graceEnded = state === "EXPIRED";

  const pendingEarnings = Number(user?.pendingReferralEarnings) || 0;
  const activeUntil = user?.activeUntil;

  const handleClick = () => {
    if (inGrace || graceEnded || !activeUntil) {
      activationModal.onOpen();
    } else {
      onOpen(); // Invite Modal
    }
  };

  const handleToggleFromHandle = () => {
    if (!isMobile) {
      return;
    }

    setIsMobileExpanded((prev) => !prev);
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const applyViewportState = (matches: boolean) => {
      setIsMobile(matches);
      if (!matches) {
        setIsMobileExpanded(false);
      }
    };

    applyViewportState(mediaQuery.matches);

    const handleViewportChange = (event: MediaQueryListEvent) => {
      applyViewportState(event.matches);
    };

    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setShake(true);

      setTimeout(() => setShake(false), 800);
    };

    addEventListener("activation-updated", handleUpdate);
    return () => removeEventListener("activation-updated", handleUpdate);
  }, []);

  if (pathname !== "/") return null;

  const isOpen = isMobile ? isMobileExpanded : isHovered;

  return (
    <>
      {user && (
        <motion.aside
          initial={{ opacity: 0, x: -120 }}
          animate={{
            opacity: 1,
            x: isOpen ? 0 : -150,
            ...(shake ? { x: isOpen ? [0, -4, 4, -4, 4, 0] : -150 } : {}),
          }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          onMouseEnter={() => {
            if (!isMobile) {
              setIsHovered(true);
            }
          }}
          onMouseLeave={() => {
            if (!isMobile) {
              setIsHovered(false);
            }
          }}
          className="fixed left-0 bottom-6 z-50"
        >
          <div
            onClick={handleClick}
            className="
              bg-slate-900/90 backdrop-blur-xl
              shadow-2xl rounded-r-2xl p-3 w-40
              border border-white/20 cursor-pointer
            "
          >
            <div className="relative flex justify-center items-center w-24 h-24 mx-auto">
              {/* الدائرة */}
              <svg className="w-24 h-24 -rotate-90 absolute">
                <circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke="#ffffff20"
                  strokeWidth="7"
                  fill="none"
                />
                <motion.circle
                  cx="48"
                  cy="48"
                  r="42"
                  stroke={color}
                  strokeWidth="7"
                  fill="none"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (progress / 100) * 264}
                  strokeLinecap="round"
                  animate={inGrace ? { scale: [1, 1.05, 1] } : {}}
                  transition={
                    inGrace ? { repeat: Infinity, duration: 1.2 } : {}
                  }
                />
              </svg>

              {/* رقم الأيام ✅ */}
              <span
                className={`font-bold text-center ${
                  inGrace && !graceEnded
                    ? "text-yellow-400 text-3xl"
                    : "text-white text-3xl"
                }`}
              >
                {daysLeft}
              </span>
            </div>

            {/* النص السفلي */}
            <div className="text-center mt-2">
              {graceEnded ? (
                <p className="text-[11px] text-slate-300 mb-1">
                  {activeUntil ? "فعّل حسابك" : "ابدأ التفعيل"}
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-100">
                    {inGrace ? "فترة سماح للتجديد" : "أيام متبقية للتفعيل"}
                  </p>

                  <motion.p
                    className={`
                text-[11px] mt-1 ${
                  Number(pendingEarnings) > 0
                    ? "bg-emerald-600"
                    : "bg-indigo-600"
                } 
                p-1 flex items-center 
                justify-center 
                rounded-md text-white
              `}
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <span className="font-bold text-sm">
                      {Number(pendingEarnings) > 0
                        ? `معلّق: $${Number(pendingEarnings).toFixed(2)}`
                        : activeUntil
                          ? "دعوة صديق"
                          : "تفعيل الحساب"}
                    </span>
                  </motion.p>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleToggleFromHandle();
            }}
            aria-label="Toggle activation countdown"
            aria-expanded={isOpen}
            className="
              absolute top-1/2 -translate-y-1/2 -right-4
              w-8 h-16 rounded-r-full
              bg-linear-to-b from-cyan-400 via-indigo-500 to-violet-600
              shadow-xl border border-cyan-200/40
              flex items-center justify-center
            "
          >
            <div className="w-4 h-10 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center">
              <DynamicIcon
                iconName={isOpen ? "MdChevronLeft" : "MdChevronRight"}
                size={12}
                className="text-white"
              />
            </div>
          </button>
        </motion.aside>
      )}
    </>
  );
};

export default ActivationCountdown;
