"use client";

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
}: {
  cat: CategoryCardConfig;
  onPick: (key: PrimaryCategoryKey) => void;
}) {
  return (
    <motion.button
      variants={cardVariants}
      whileTap={{ scale: 0.93 }}
      whileHover={{ y: -5, transition: { type: "spring", stiffness: 300 } }}
      onClick={() => onPick(cat.key)}
      aria-label={cat.nameAr}
      className="relative flex flex-col items-center justify-center gap-3 rounded-3xl overflow-hidden text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 select-none"
      style={{
        background: `linear-gradient(145deg, ${cat.gradFrom}, ${cat.gradTo})`,
        boxShadow: `0 10px 30px ${cat.shadow}, 0 2px 8px rgba(0,0,0,0.1)`,
        minHeight: "156px",
        padding: "24px 16px 20px",
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
          width: 60,
          height: 60,
          background: "rgba(255,255,255,0.22)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      >
        <cat.Icon style={{ fontSize: "1.85rem", color: "#fff" }} />
      </div>

      {/* Text */}
      <div className="relative text-center">
        <p className="text-[15px] font-bold leading-snug tracking-wide">
          {cat.nameAr}
        </p>
        <p className="mt-0.5 text-[11px] text-white/95 font-semibold tracking-wider uppercase">
          {cat.nameEn}
        </p>
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

  return (
    <motion.div
      key="mobile-picker"
      variants={pageVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto"
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
      <motion.header
        variants={headerVariants}
        initial="hidden"
        animate="show"
        className="relative flex flex-col items-center pt-14 pb-7 px-6 text-center"
      >
        <div
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}
        >
          <Image
            src={logoImage}
            alt="مشهور"
            width={logoImage.width}
            height={logoImage.height}
            priority
            className="block"
            style={{ width: 76, height: "auto" }}
          />
        </div>

        <h1 className="mt-4 text-[26px] font-extrabold tracking-wide text-slate-800 dark:text-slate-100">
          {isArabic ? "مـشـهـور" : "Mashhoor"}
        </h1>

        <p className="mt-1.5 text-[13.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
          {isArabic
            ? "اختر الفئة التي تريدها"
            : "Choose what you're looking for"}
        </p>

        {/* Subtle divider */}
        <div className="mt-5 w-10 h-0.5 rounded-full bg-slate-200 dark:bg-slate-700" />
      </motion.header>

      {/* Category grid */}
      <motion.div
        variants={gridVariants}
        initial="hidden"
        animate="show"
        className="relative grid grid-cols-2 gap-4 px-5 pb-12"
      >
        {CATEGORIES.map((cat) => (
          <CategoryCard key={cat.key} cat={cat} onPick={onPick} />
        ))}
      </motion.div>

      {/* Auth buttons – shown only for guests */}
      {isGuest && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: { delay: 0.55, duration: 0.35, ease: "easeOut" },
          }}
          className="px-5 pb-10 flex flex-col gap-3"
        >
          <div className="relative flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            <span className="text-[12px] text-slate-600 dark:text-slate-300 font-semibold">
              {isArabic ? "أو انضم إلينا" : "or join us"}
            </span>
            <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
          </div>

          <button
            onClick={() => registerModal.onOpen()}
            className="w-full h-12 rounded-2xl font-bold text-[15px] text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500"
            style={{
              background: "linear-gradient(135deg, #0ea5e9, #1d4ed8)",
              boxShadow: "0 6px 20px rgba(14,165,233,0.35)",
            }}
          >
            {isArabic ? "إنشاء حساب" : "Create account"}
          </button>

          <button
            onClick={() => loginModal.onOpen()}
            className="w-full h-12 rounded-2xl font-bold text-[15px] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
          >
            {isArabic ? "تسجيل الدخول" : "Sign in"}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
