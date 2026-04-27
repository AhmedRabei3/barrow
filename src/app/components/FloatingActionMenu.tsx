"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MdClose, MdApps, MdCategory } from "react-icons/md";
import { BsRobot } from "react-icons/bs";
import { FaMapMarkedAlt } from "react-icons/fa";
import { useAppPreferences } from "./providers/AppPreferencesProvider";
import { useSession } from "next-auth/react";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import useActivationModal from "@/app/hooks/useActivationModal";

/* ─── Props ──────────────────────────────────────────────────────────────── */

interface FloatingActionMenuProps {
  onCategories: () => void;
  /** Whether the back-to-categories action is relevant (mobile picker has been used) */
  categoriesEnabled?: boolean;
}

/* ─── Sub-button config ─────────────────────────────────────────────────── */

interface ActionConfig {
  id: string;
  labelAr: string;
  labelEn: string;
  gradFrom: string;
  gradTo: string;
  shadow: string;
}

const ACTIONS: ActionConfig[] = [
  {
    id: "categories",
    labelAr: "الفئات",
    labelEn: "Categories",
    gradFrom: "#7c3aed",
    gradTo: "#5b21b6",
    shadow: "rgba(124,58,237,0.45)",
  },
  {
    id: "map",
    labelAr: "الخريطة",
    labelEn: "Map",
    gradFrom: "#0d9488",
    gradTo: "#0f766e",
    shadow: "rgba(13,148,136,0.4)",
  },
  {
    id: "assistant",
    labelAr: "المساعد",
    labelEn: "Assistant",
    gradFrom: "#2563eb",
    gradTo: "#1e40af",
    shadow: "rgba(37,99,235,0.45)",
  },
];

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function FloatingActionMenu({
  onCategories,
  categoriesEnabled = true,
}: FloatingActionMenuProps) {
  const [expanded, setExpanded] = useState(false);
  const [waveKey, setWaveKey] = useState(0);

  const { isArabic } = useAppPreferences();
  const { data: session, status } = useSession();
  const registerModal = useRegisterModal();
  const activationModal = useActivationModal();
  const menuRef = useRef<HTMLDivElement>(null);

  const user = session?.user;
  const isLoggedIn = Boolean(user?.id);
  const isUserActive = Boolean(user?.isActive);

  /* Close on outside click */
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      setExpanded(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [expanded]);

  /* Action handlers */
  const handleAction = (id: string) => {
    setExpanded(false);
    if (id === "categories") {
      onCategories();
    } else if (id === "map") {
      /* Dispatch event – HomeBody listens and toggles its showMap state */
      window.dispatchEvent(new CustomEvent("toggle-map-view"));
    } else if (id === "assistant") {
      if (!isLoggedIn) {
        registerModal.onOpen();
        return;
      }
      if (!isUserActive) {
        activationModal.onOpen();
        return;
      }
      /* Dispatch event – FloatingChatButton (always mounted) will handle it */
      window.dispatchEvent(new CustomEvent("open-smart-chat"));
      setWaveKey((k) => k + 1);
    }
  };

  /* Icon components per action */
  const ActionIcon = ({ id, size = 22 }: { id: string; size?: number }) => {
    if (id === "categories") return <MdCategory size={size} />;
    if (id === "map") return <FaMapMarkedAlt size={size} />;
    return (
      <motion.span
        key={waveKey}
        animate={{ rotate: [0, 18, -12, 18, 0], y: [0, -2, 0] }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        style={{ transformOrigin: "65% 20%" }}
      >
        <BsRobot size={size} />
      </motion.span>
    );
  };

  return (
    <>
      {/* ── FAB group ─────────────────────────────────────────────────── */}
      <div
        ref={menuRef}
        className="fixed bottom-7 right-5 z-50 flex flex-col items-end gap-3.5 md:hidden"
      >
        {/* Sub-buttons – rendered above the main FAB */}
        <AnimatePresence>
          {expanded &&
            ACTIONS.map((action, i) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20, scale: 0.78 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: {
                    delay: (ACTIONS.length - 1 - i) * 0.07,
                    type: "spring",
                    damping: 18,
                    stiffness: 320,
                  },
                }}
                exit={{
                  opacity: 0,
                  y: 16,
                  scale: 0.8,
                  transition: {
                    delay: i * 0.04,
                    duration: 0.16,
                    ease: "easeIn",
                  },
                }}
                className="flex items-center gap-2.5"
              >
                {/* Pill label */}
                <motion.span
                  initial={{ opacity: 0, x: 12 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    transition: {
                      delay: (ACTIONS.length - 1 - i) * 0.07 + 0.08,
                    },
                  }}
                  className="select-none rounded-full py-1.5 px-3.5 text-[12px] font-semibold text-white"
                  style={{
                    background: "rgba(15,23,42,0.78)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    boxShadow:
                      "0 2px 10px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  {isArabic ? action.labelAr : action.labelEn}
                </motion.span>

                {/* Icon button */}
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleAction(action.id)}
                  disabled={action.id === "categories" && !categoriesEnabled}
                  aria-label={isArabic ? action.labelAr : action.labelEn}
                  className="h-12 w-12 flex items-center justify-center rounded-full text-white focus:outline-none disabled:opacity-40"
                  style={{
                    background: `linear-gradient(145deg, ${action.gradFrom}, ${action.gradTo})`,
                    boxShadow: `0 8px 22px ${action.shadow}, 0 2px 6px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)`,
                  }}
                >
                  <ActionIcon id={action.id} />
                </motion.button>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Main trigger */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setExpanded((e) => !e)}
          aria-label={isArabic ? "وظائف إضافية" : "More actions"}
          aria-expanded={expanded}
          className="h-14 w-14 flex items-center justify-center rounded-full text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 select-none"
          style={{
            background: "linear-gradient(145deg, #1e293b, #0f172a)",
            boxShadow:
              "0 10px 32px rgba(0,0,0,0.38), 0 2px 8px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <motion.span
            animate={{ rotate: expanded ? 45 : 0 }}
            transition={{ type: "spring", damping: 15, stiffness: 280 }}
            className="flex items-center justify-center"
          >
            {expanded ? <MdClose size={26} /> : <MdApps size={26} />}
          </motion.span>
        </motion.button>
      </div>
    </>
  );
}
