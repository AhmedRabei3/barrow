"use client";

import StepOne from "./StepOne";
import StepTwo from "./SecondStep";
import { useState, useCallback } from "react";
import { Filters, useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import { SEARCH_MODAL_TEXT } from "@/app/i18n/searchModal";

interface SearchWizardProps {
  onFinish: () => void;
}

const SearchWizard = ({ onFinish }: SearchWizardProps) => {
  const { isArabic } = useAppPreferences();
  const locale = isArabic ? "ar" : "en";
  const { filters: storeFilters, setFilters } = useSearchFilters();

  const [step, setStep] = useState(0);

  /** ✅ state محلي */
  const [localFilters, setLocalFilters] = useState<Filters>(storeFilters);

  /** ✅ دالة تحديث مستقرة */
  const update = useCallback(
    <K extends keyof Filters>(key: K, value: Filters[K]) => {
      setLocalFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  /** ✅ عند الانتهاء فقط نكتب في Zustand */
  const finish = () => {
    setFilters(localFilters);
    onFinish();
  };

  return (
    <div className="space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      {step === 0 && <StepOne filters={localFilters} onChange={update} />}

      {step === 1 && <StepTwo filters={localFilters} update={() => {}} />}

      <div className="flex justify-between">
        {step > 0 ? (
          <button className="btn" onClick={() => setStep((s) => s - 1)}>
            {SEARCH_MODAL_TEXT.back[locale]}
          </button>
        ) : (
          <div />
        )}

        {step === 1 ? (
          <button className="btn-primary" onClick={finish}>
            {SEARCH_MODAL_TEXT.search[locale]}
          </button>
        ) : (
          <button className="btn-primary" onClick={() => setStep((s) => s + 1)}>
            {SEARCH_MODAL_TEXT.next[locale]}
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchWizard;
