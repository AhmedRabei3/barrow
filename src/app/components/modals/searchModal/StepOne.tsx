"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { Filters } from "@/app/hooks/useSearchFilters";
import QuestionContainer from "./Question";
import Choice from "./Choice";
import categoryFetcher from "../../category/CategoryFetcher";
import { ItemType } from "@prisma/client";
import CityCountrySelect from "./CityCountrySelect";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import {
  SEARCH_ACTION_OPTIONS,
  SEARCH_MODAL_TEXT,
  SEARCH_TYPE_OPTIONS,
} from "@/app/i18n/searchModal";

interface StepOneProps {
  filters: Filters;
  onChange: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
}

interface SimpleCategory {
  type: ItemType;
  name: string;
  id: string;
  icon: string | null;
  isDeleted: boolean;
}

const StepOne = ({ filters, onChange }: StepOneProps) => {
  const { isArabic } = useAppPreferences();
  const locale = isArabic ? "ar" : "en";
  const [categories, setCategories] = useState<SimpleCategory[]>([]);

  useEffect(() => {
    categoryFetcher({ setList: setCategories, type: filters.type });
  }, [filters.type]);

  const subCategoryOptions = useMemo(
    () =>
      categories.map((cat) => ({
        label: cat.name,
        value: cat.name,
      })),
    [categories],
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <CityCountrySelect />

      <Choice
        question={SEARCH_MODAL_TEXT.stepOneTitle[locale]}
        options={SEARCH_ACTION_OPTIONS[locale].map((label, index) => ({
          label,
          value: index === 0 ? "RENT" : "SELL",
        }))}
        selected={filters.action ?? "SELL"}
        onSelect={(v) => onChange("action", v as Filters["action"])}
      />

      <Choice
        question={SEARCH_MODAL_TEXT.stepTwoTitle[locale]}
        options={SEARCH_TYPE_OPTIONS[locale].map((label, index) => ({
          label,
          value:
            index === 0
              ? "CAR"
              : index === 1
                ? "NEW_CAR"
                : index === 2
                  ? "USED_CAR"
                  : index === 3
                    ? "OTHER"
                    : "PROPERTY",
        }))}
        selected={filters.type ?? "CAR"}
        onSelect={(v) =>
          onChange("type", v === "CAR" ? undefined : (v as ItemType))
        }
      />

      <Choice
        question={SEARCH_MODAL_TEXT.exactCategory[locale]}
        options={subCategoryOptions}
        selected={filters.catName ?? ""}
        onSelect={(v) => onChange("catName", v)}
      />

      <QuestionContainer title={SEARCH_MODAL_TEXT.minPrice[locale]}>
        <input
          type="number"
          name="stepOneMinPrice"
          className="w-full p-2 border rounded"
          value={filters.minPrice || ""}
          onChange={(e) => onChange("minPrice", e.target.value)}
        />
      </QuestionContainer>
      <QuestionContainer title={SEARCH_MODAL_TEXT.maxPrice[locale]}>
        <input
          type="number"
          name="stepOneMaxPrice"
          className="w-full p-2 border rounded"
          value={filters.maxPrice || ""}
          onChange={(e) => onChange("maxPrice", e.target.value)}
        />
      </QuestionContainer>
    </div>
  );
};

export default memo(StepOne);
