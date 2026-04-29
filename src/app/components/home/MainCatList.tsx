"use client";

interface MainCatListProps {
  compact?: boolean;
  isArabic?: boolean;
  mainCategoryId: string;
  selectedType: string;
  tabsList: { key: string; nameEn: string; nameAr: string }[];
  handleSelectType: (value: string) => void;
  isFiltering?: boolean;
}

const MainCatList = ({
  compact,
  isArabic,
  mainCategoryId,
  selectedType,
  tabsList,
  handleSelectType,
  isFiltering = false,
}: MainCatListProps) => {
  return (
    <div className={compact ? "w-full" : "w-full md:hidden"}>
      <label htmlFor={mainCategoryId} className="sr-only">
        {isArabic ? "النوع الرئيسي" : "Main category"}
      </label>
      <div className="relative w-full">
        <select
          id={mainCategoryId}
          name="mainCategory"
          value={selectedType}
          onChange={(event) => handleSelectType(event.target.value)}
          className="
              w-full rounded-xl border border-indigo-200 bg-white
              px-2.5 py-2 text-xs font-medium text-slate-800 shadow-sm
              focus:outline-none focus:ring-2 focus:ring-indigo-500
              dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100
            "
          data-loading={isFiltering ? "true" : "false"}
        >
          {tabsList.map((item) => (
            <option key={item.key} value={item.key}>
              {isArabic ? item.nameAr : item.nameEn}
            </option>
          ))}
        </select>

        {isFiltering ? (
          <>
            <span className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-indigo-300/65 dark:ring-indigo-400/50 animate-pulse" />
            <span className="pointer-events-none absolute top-1.5 inset-e-1.5 h-2 w-2 rounded-full bg-indigo-500/90 dark:bg-indigo-300 animate-pulse" />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default MainCatList;
