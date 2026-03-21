"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BiSearch } from "react-icons/bi";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

type TransactionType = "SELL" | "RENT";

interface Props {
  setQ: (q: string) => void;
  category: string;
  q: string;
  sellOrRent?: TransactionType;
  handelSellOrRent?: (t: TransactionType) => void;
  handleSetMinPrice?: (min: number | null) => void;
  handleSetMaxPrice?: (max: number | null) => void;
  minPrice?: number;
  maxPrice?: number;
}

export default function SearchBar({
  setQ,
  q,
  sellOrRent,
  handelSellOrRent,
  handleSetMinPrice,
  handleSetMaxPrice,
  minPrice,
  maxPrice,
}: Props) {
  const { isArabic } = useAppPreferences();

  return (
    <div className="hidden md:flex w-full justify-center items-center">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -15 }}
          transition={{ duration: 0.28 }}
          dir={isArabic ? "rtl" : "ltr"}
          className="
            hidden md:flex w-full max-w-195 mx-auto overflow-hidden
            rounded-full border border-slate-200 bg-white
            shadow-[0_2px_12px_rgba(0,0,0,0.09)]
            transition-shadow duration-200 hover:shadow-[0_4px_18px_rgba(0,0,0,0.14)]
            dark:bg-slate-900 dark:border-slate-700
          "
        >
          <div className="min-w-0 flex-1 px-4 py-2">
            <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">
              {isArabic ? "عن ماذا تبحث؟" : "What are you looking for?"}
            </p>
            <input
              type="text"
              placeholder={isArabic ? "ابحث... " : "Search ..."}
              className="mt-0.5 w-full bg-transparent text-sm text-slate-700 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {handelSellOrRent && (
            <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 px-2.5 py-1.5">
              <button
                type="button"
                onClick={() => handelSellOrRent("SELL")}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  sellOrRent === "SELL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {isArabic ? "شراء" : "Buy"}
              </button>
              <button
                type="button"
                onClick={() => handelSellOrRent("RENT")}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                  sellOrRent === "RENT"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {isArabic ? "إيجار" : "Rent"}
              </button>
            </div>
          )}

          <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 dark:border-slate-700 px-3 py-1.5">
            <input
              type="number"
              value={minPrice ?? ""}
              placeholder={isArabic ? "الحد الأدنى" : "Min"}
              title={isArabic ? "الحد الأدنى للسعر" : "Minimum price"}
              aria-label={isArabic ? "الحد الأدنى للسعر" : "Minimum price"}
              className="w-20 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              onChange={(event) =>
                handleSetMinPrice?.(
                  Number.isNaN(event.target.valueAsNumber)
                    ? null
                    : event.target.valueAsNumber,
                )
              }
            />
            <input
              type="number"
              value={maxPrice ?? ""}
              placeholder={isArabic ? "الحد الأعلى" : "Max"}
              title={isArabic ? "الحد الأعلى للسعر" : "Maximum price"}
              aria-label={isArabic ? "الحد الأعلى للسعر" : "Maximum price"}
              className="w-20 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-center focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              onChange={(event) =>
                handleSetMaxPrice?.(
                  Number.isNaN(event.target.valueAsNumber)
                    ? null
                    : event.target.valueAsNumber,
                )
              }
            />
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.95 }}
            className="m-1 h-10 w-10 shrink-0 rounded-full bg-linear-to-r from-sky-500 to-indigo-500 text-white shadow-[0_6px_12px_rgba(59,130,246,0.35)] flex items-center justify-center"
          >
            <BiSearch size={18} />
          </motion.button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
