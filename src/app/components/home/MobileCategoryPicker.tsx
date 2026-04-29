"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  MdOutlineRealEstateAgent,
  MdCarCrash,
  MdOutlineChair,
  MdDevicesOther,
} from "react-icons/md";
import { FaCarSide, FaStethoscope } from "react-icons/fa";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import useLoginModal from "@/app/hooks/useLoginModal";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import type { PrimaryCategoryKey } from "@/lib/primaryCategories";
import type { ComponentType } from "react";
import logoImage from "../../../../public/images/logo.png";

/* ─── Category definitions ──────────────────────────────────────────────── */

interface CategoryCardConfig {
  key: PrimaryCategoryKey;
  nameAr: string;
  nameEn: string;
  Icon: ComponentType<{ className?: string; style?: React.CSSProperties }>;
  gradFrom: string;
  gradTo: string;
  shadow: string;
}

const CATEGORIES: CategoryCardConfig[] = [
  {
    key: "PROPERTY",
    nameAr: "عقارات",
    nameEn: "Real Estate",
    Icon: MdOutlineRealEstateAgent,
    gradFrom: "#0ea5e9",
    gradTo: "#1d4ed8",
    shadow: "rgba(14,165,233,0.45)",
  },
  {
    key: "NEW_CAR",
    nameAr: "سيارة جديدة",
    nameEn: "New Car",
    Icon: FaCarSide,
    gradFrom: "#10b981",
    gradTo: "#0d9488",
    shadow: "rgba(16,185,129,0.45)",
  },
  {
    key: "USED_CAR",
    nameAr: "سيارة مستعملة",
    nameEn: "Used Car",
    Icon: MdCarCrash,
    gradFrom: "#f59e0b",
    gradTo: "#ea580c",
    shadow: "rgba(245,158,11,0.45)",
  },
  {
    key: "HOME_FURNITURE",
    nameAr: "الأثاث المنزلي",
    nameEn: "Home Furniture",
    Icon: MdOutlineChair,
    gradFrom: "#8b5cf6",
    gradTo: "#6d28d9",
    shadow: "rgba(139,92,246,0.45)",
  },
  {
    key: "MEDICAL_DEVICES",
    nameAr: "الأجهزة الطبية",
    nameEn: "Medical Devices",
    Icon: FaStethoscope,
    gradFrom: "#f43f5e",
    gradTo: "#be185d",
    shadow: "rgba(244,63,94,0.45)",
  },
  {
    key: "OTHER",
    nameAr: "أخرى",
    nameEn: "Other",
    Icon: MdDevicesOther,
    gradFrom: "#64748b",
    gradTo: "#334155",
    shadow: "rgba(100,116,139,0.35)",
  },
];

/* ─── Animation variants ────────────────────────────────────────────────── */

const pageVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

const headerVariants = {
  hidden: { opacity: 0, y: -24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

const gridVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.2 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 36, scale: 0.88 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, damping: 17, stiffness: 200 },
  },
};

/* ─── Sub-components ────────────────────────────────────────────────────── */

function CategoryCard({
  cat,
  onPick,
  isArabic,
}: {
  cat: CategoryCardConfig;
  onPick: (key: PrimaryCategoryKey) => void;
  isArabic: boolean;
}) {
  return (
    <motion.button
      variants={cardVariants}
      whileTap={{ scale: 0.93 }}
      whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}
      onClick={() => onPick(cat.key)}
      aria-label={cat.nameAr}
      className="relative flex min-h-32 flex-col items-center justify-center gap-2.5 overflow-hidden rounded-[26px] px-3 py-4 text-white select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:min-h-35 sm:gap-3 sm:px-4 sm:py-5"
      style={{
        background: `linear-gradient(145deg, ${cat.gradFrom}, ${cat.gradTo})`,
        boxShadow: `0 10px 30px ${cat.shadow}, 0 2px 8px rgba(0,0,0,0.1)`,
      }}
    >
      {/* Shine overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, transparent 55%)",
        }}
      />

      {/* Icon bubble */}
      <div
        className="relative flex items-center justify-center rounded-2xl"
        style={{
          width: 52,
          height: 52,
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      >
        <cat.Icon style={{ fontSize: "1.65rem", color: "#fff" }} />
      </div>

      {/* Text */}
      <div className="relative text-center">
        <p
          className={
            isArabic
              ? "text-[14px] font-extrabold leading-[1.55] tracking-[0.02em] sm:text-[15px]"
              : "text-[14px] font-extrabold leading-snug tracking-[0.01em] sm:text-[15px]"
          }
        >
          {isArabic ? cat.nameAr : cat.nameEn}
        </p>
        {isArabic ? (
          <p className="mt-0.5 text-[10px] font-medium tracking-[0.08em] text-white/80 sm:text-[11px]">
            {cat.nameEn}
          </p>
        ) : (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 sm:text-[11px]">
            {cat.nameAr}
          </p>
        )}
      </div>
    </motion.button>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */

interface MobileCategoryPickerProps {
  onPick: (key: PrimaryCategoryKey) => void;
}

export default function MobileCategoryPicker({
  onPick,
}: MobileCategoryPickerProps) {
  const { isArabic } = useAppPreferences();
  const { data: session, status } = useSession();
  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();
  const isGuest = status !== "loading" && !session?.user;

  /* ── fetch per-type counts and hide empty categories ──────────── */
  const [typeCounts, setTypeCounts] = useState<Record<string, number> | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/items/type-counts", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          setTypeCounts(data as Record<string, number>);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  /* While counts are still loading show all; once loaded filter empties. */
  const visibleCategories =
    typeCounts === null
      ? CATEGORIES
      : CATEGORIES.filter((cat) => (typeCounts[cat.key] ?? 0) > 0);

  return (
    <motion.div
      key="mobile-picker"
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="flex min-h-screen flex-col overflow-y-auto bg-slate-50 dark:bg-slate-950"
    >
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-20 -right-20 rounded-full blur-3xl"
          style={{
            width: 280,
            height: 280,
            background: "rgba(14,165,233,0.1)",
          }}
        />
        <div
          className="absolute top-56 -left-16 rounded-full blur-3xl"
          style={{
            width: 240,
            height: 240,
            background: "rgba(139,92,246,0.1)",
          }}
        />
        <div
          className="absolute bottom-20 right-8 rounded-full blur-3xl"
          style={{
            width: 200,
            height: 200,
            background: "rgba(16,185,129,0.08)",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-6 pt-6 sm:px-5">
        <motion.header
          variants={headerVariants}
          initial="hidden"
          animate="show"
          className="relative flex flex-col items-center px-3 pb-5 text-center"
        >
          <Image
            src={logoImage}
            alt="مشهور"
            width={logoImage.width}
            height={logoImage.height}
            priority
            className="block"
            style={{ width: 64, height: "auto" }}
          />

          <h1
            className={
              isArabic
                ? "mt-3 text-[25px] font-black tracking-[0.14em] text-slate-800 dark:text-slate-100"
                : "mt-3 text-[24px] font-extrabold tracking-[0.08em] text-slate-800 dark:text-slate-100"
            }
          >
            {isArabic ? "مـشـهـور" : "Mashhoor"}
          </h1>

          <p
            className={
              isArabic
                ? "mt-1.5 max-w-[18rem] text-[13.5px] leading-7 text-slate-500 dark:text-slate-400"
                : "mt-1.5 max-w-[18rem] text-[13px] leading-relaxed text-slate-500 dark:text-slate-400"
            }
          >
            {isArabic
              ? "اختر الفئة التي تريدها وابدأ التصفح بسرعة"
              : "Choose your category and start browsing quickly"}
          </p>

          <div className="mt-4 h-0.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
        </motion.header>

        <motion.div
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="relative grid grid-cols-2 gap-3"
        >
          {visibleCategories.map((cat) => (
            <CategoryCard
              key={cat.key}
              cat={cat}
              onPick={onPick}
              isArabic={isArabic}
            />
          ))}
        </motion.div>

        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{
              opacity: 1,
              y: 0,
              transition: { delay: 0.55, duration: 0.35, ease: "easeOut" },
            }}
            className={
              isArabic
                ? "mt-5 rounded-[28px] border border-amber-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,251,235,0.92))] p-3 shadow-[0_18px_42px_rgba(120,53,15,0.12)] backdrop-blur dark:border-amber-900/50 dark:bg-[linear-gradient(180deg,rgba(30,27,22,0.92),rgba(23,23,23,0.9))]"
                : "mt-5 rounded-[28px] border border-white/65 bg-white/80 p-3 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/75"
            }
          >
            <div className="relative mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span
                className={
                  isArabic
                    ? "text-[11px] font-bold tracking-[0.08em] text-amber-700 dark:text-amber-200"
                    : "text-[11px] font-semibold tracking-[0.12em] text-slate-500 dark:text-slate-300"
                }
              >
                {isArabic ? "انضم الآن" : "JOIN NOW"}
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => registerModal.onOpen()}
                className="h-11 rounded-2xl px-3 text-[14px] font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
                style={{
                  background: isArabic
                    ? "linear-gradient(135deg, #d97706, #b45309)"
                    : "linear-gradient(135deg, #0ea5e9, #1d4ed8)",
                  boxShadow: isArabic
                    ? "0 8px 22px rgba(180,83,9,0.24)"
                    : "0 6px 20px rgba(14,165,233,0.28)",
                }}
              >
                {isArabic ? "إنشاء حساب" : "Create account"}
              </button>

              <button
                onClick={() => loginModal.onOpen()}
                className={
                  isArabic
                    ? "h-11 rounded-2xl border border-amber-200 bg-white/90 px-3 text-[14px] font-bold text-amber-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-amber-900/60 dark:bg-slate-800 dark:text-amber-100"
                    : "h-11 rounded-2xl border border-slate-200 bg-white px-3 text-[14px] font-bold text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }
              >
                {isArabic ? "تسجيل الدخول" : "Sign in"}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
