"use client";

import { useId } from "react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface PriceBoxProps {
  handleSetMinPrice: (min: number | null) => void;
  handleSetMaxPrice: (max: number | null) => void;
  minPrice?: number;
  maxPrice?: number;
}

const PriceBox = ({
  handleSetMinPrice,
  handleSetMaxPrice,
  minPrice,
  maxPrice,
}: PriceBoxProps) => {
  const { isArabic } = useAppPreferences();
  const minPriceId = useId();
  const maxPriceId = useId();

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="md:flex items-center gap-2 px-2 hidden shadow-sm p-1.5 rounded-md"
    >
      <span className="text-sm">{isArabic ? "السعر" : "Price"}</span>
      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="
         flex flex-col items-center justify-between min-w-fit 
         border border-slate-400 rounded-md
         "
      >
        <label
          htmlFor={minPriceId}
          className="border-b border-slate-400 text-[14px] text-slate-500"
        >
          {isArabic ? "الأدنى" : "Min"}
        </label>
        <input
          id={minPriceId}
          name="minPrice"
          type="number"
          className="
             w-16 focus:outline-none 
                 text-center text-xs"
          placeholder="0"
          defaultValue={minPrice || ""}
          onChange={(e) => handleSetMinPrice(e.target.valueAsNumber || null)}
        />
      </div>

      <div
        dir={isArabic ? "rtl" : "ltr"}
        className="
         flex flex-col items-center justify-between min-w-fit px-1
         border border-slate-400 rounded-md
         "
      >
        <label
          htmlFor={maxPriceId}
          className="border-b border-slate-400 text-[14px] text-slate-500"
        >
          {isArabic ? "الأقصى" : "Max"}
        </label>
        <input
          id={maxPriceId}
          name="maxPrice"
          type="number"
          className="
             w-16 focus:outline-none 
                 text-center text-xs"
          placeholder="0"
          defaultValue={maxPrice || ""}
          onChange={(e) => handleSetMaxPrice(e.target.valueAsNumber || null)}
        />
      </div>
    </div>
  );
};

export default PriceBox;
