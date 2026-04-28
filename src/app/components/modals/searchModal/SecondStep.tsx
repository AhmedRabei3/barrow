"use client";

import { Filters } from "@/app/hooks/useSearchFilters";
import QuestionContainer from "./Question";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import { SEARCH_MODAL_TEXT } from "@/app/i18n/searchModal";

interface StepTwoProps {
  filters: Filters;
  update: (field: string, value: string | number) => void;
}

const StepTwo = ({ filters, update }: StepTwoProps) => {
  const { isArabic } = useAppPreferences();
  const locale = isArabic ? "ar" : "en";

  return (
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
  );
};

export default StepTwo;
