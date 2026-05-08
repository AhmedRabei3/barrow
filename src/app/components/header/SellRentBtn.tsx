import { TransactionType } from "@prisma/client";
import React, { memo, useCallback } from "react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface Props {
  handelSellOrRent: (t: TransactionType) => void;
  sellOrRent: TransactionType | undefined;
  layout?: "desktop" | "mobile";
}

const SellRentSwitch = ({
  sellOrRent,
  handelSellOrRent,
  layout = "desktop",
}: Props) => {
  const { isArabic } = useAppPreferences();
  const isMobile = layout === "mobile";
  const handleSell = useCallback(() => {
    handelSellOrRent("SELL");
  }, [handelSellOrRent]);

  const handleRent = useCallback(() => {
    handelSellOrRent("RENT");
  }, [handelSellOrRent]);

  return (
    <div
      className={`
        shadow-sm rounded-lg border border-indigo-200/80
        overflow-hidden bg-white/90 backdrop-blur-sm
        dark:bg-slate-900/90 dark:border-slate-700
        ${isMobile ? "flex lg:hidden" : "hidden lg:flex flex-col top-2 items-center mr-1"}
       `}
    >
      <button
        onClick={handleSell}
        className={`${isMobile ? "px-2.5 py-1.5 text-[10px] md:text-xs" : "px-3 py-1 text-xs w-full"} overflow-hidden font-medium leading-tight transition-colors ${
          sellOrRent === TransactionType.SELL
            ? "bg-linear-to-r from-blue-500 to-indigo-500 text-white"
            : "bg-indigo-50/60 text-indigo-900 hover:bg-indigo-100"
        }`}
      >
        {isArabic ? "شراء" : "Buy"}
      </button>
      <button
        onClick={handleRent}
        className={`${isMobile ? "px-2.5 py-1.5 text-[10px] md:text-xs" : "px-3 py-1 text-xs rounded-b-xl"} font-medium leading-tight transition-colors ${
          sellOrRent === "RENT"
            ? "bg-linear-to-r from-blue-500 to-indigo-500 text-white"
            : "bg-indigo-50/60 text-indigo-900 hover:bg-indigo-100"
        }`}
      >
        {isArabic ? "إيجار" : "Rent"}
      </button>
    </div>
  );
};

export default memo(SellRentSwitch);
