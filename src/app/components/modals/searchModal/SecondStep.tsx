"use client";

import { Filters } from "@/app/hooks/useSearchFilters";
import QuestionContainer from "./Question";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import { SEARCH_MODAL_TEXT } from "@/app/i18n/searchModal";

interface StepTwoProps {
  filters: Filters;
  update: (field: keyof Filters, value: Filters[keyof Filters]) => void;
  updateFilters: (nextFilters: Partial<Filters>) => void;
}

const StepTwo = ({ filters, update }: StepTwoProps) => {
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
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
          {isArabic
            ? "ترتيب العناصر حسب القرب يتم من الصفحة الرئيسية بعد اختيار موقعك على الخارطة، ولم يعد هناك فلتر مسافة ضمن البحث العام."
            : "Nearby ordering now happens from the home page after choosing your location on the map, and the general search no longer uses a distance filter."}
        </div>
      </div>
    </div>
  );
};

export default StepTwo;
