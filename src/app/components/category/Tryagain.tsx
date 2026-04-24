"use client";

import { memo } from "react";
import { MdOutlineRefresh } from "react-icons/md";

const Tryagain = ({
  isArabic,
  refetch,
}: {
  isArabic: boolean;
  refetch: (() => Promise<void>) | (() => void);
}) => {
  return (
    <div className="mt-15 flex w-full flex-col items-center justify-center gap-4 py-6 text-sm text-neutral-500">
      <p className="dark:text-slate-400">
        {isArabic ? "لايوجد شيء لعرضه" : "Nothing to display"}
      </p>
      <button
        type="button"
        onClick={refetch}
        className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
      >
        <MdOutlineRefresh className="text-lg" />
        {isArabic ? "إعادة المحاولة" : "Retry"}
      </button>
    </div>
  );
};

export default memo(Tryagain);
