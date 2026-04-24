"use client";

interface MainCatListProps {
  compact?: boolean;
  isArabic?: boolean;
  mainCategoryId: string;
  selectedType: string;
  tabsList: { key: string; nameEn: string; nameAr: string }[];
  handleSelectType: (value: string) => void;
}

const MainCatList = ({
  compact,
  isArabic,
  mainCategoryId,
  selectedType,
  tabsList,
  handleSelectType,
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
      </div>
    </div>
  );
};

export default MainCatList;
