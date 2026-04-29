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
        >
          {tabsList.map((item) => (
            <option key={item.key} value={item.key}>
              {isArabic ? item.nameAr : item.nameEn}
            </option>
          ))}
        </select>

        {isFiltering ? (
          <span className="pointer-events-none absolute -bottom-1 left-1/2 h-0.5 w-20 -translate-x-1/2 overflow-hidden rounded-full bg-indigo-200/80 dark:bg-indigo-900/70">
            <span className="block h-full w-1/2 bg-linear-to-r from-transparent via-indigo-500 to-transparent dark:via-indigo-300 animate-[tab-bar-sweep_1s_ease-in-out_infinite]" />
          </span>
        ) : null}
      </div>
    </div>
  );
};

export default MainCatList;
