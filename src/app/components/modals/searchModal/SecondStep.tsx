"use client";

import dynamic from "next/dynamic";
import { Filters } from "@/app/hooks/useSearchFilters";
import QuestionContainer from "./Question";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import { SEARCH_MODAL_TEXT } from "@/app/i18n/searchModal";

const DistanceFilter = dynamic(
  () => import("../../filters/DistanceFilter.tsx").then((mod) => mod.default),
  { ssr: false },
);

interface StepTwoProps {
  filters: Filters;
  update: (field: keyof Filters, value: Filters[keyof Filters]) => void;
  updateFilters: (nextFilters: Partial<Filters>) => void;
}

const StepTwo = ({ filters, update, updateFilters }: StepTwoProps) => {
  const { isArabic } = useAppPreferences();
  const locale = isArabic ? "ar" : "en";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <QuestionContainer title={SEARCH_MODAL_TEXT.minPrice[locale]}>
          <input
            type="number"
            name="searchModalMinPrice"
            className="w-full p-1"
            value={filters.minPrice}
            onChange={(e) => update("minPrice", e.target.value)}
          />
        </QuestionContainer>
        <QuestionContainer title={SEARCH_MODAL_TEXT.maxPrice[locale]}>
          <input
            type="number"
            name="searchModalMaxPrice"
            className="w-full p-1"
            value={filters.maxPrice}
            onChange={(e) => update("maxPrice", e.target.value)}
          />
        </QuestionContainer>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
        <DistanceFilter
          value={filters.distance}
          userLat={filters.userLat}
          userLng={filters.userLng}
          onChange={updateFilters}
        />
      </div>
    </div>
  );
};

export default StepTwo;
