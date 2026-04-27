"use client";
import { DynamicIcon } from "../addCategory/IconSetter";

interface UserMenueItemProps {
  label: string;
  onClick: () => void;
  iconName?: string;
  badge?: string;
  isArabic?: boolean;
}

const UserMenueItem = ({
  label,
  onClick,
  iconName,
  badge,
  isArabic,
}: UserMenueItemProps) => {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        dir={isArabic ? "rtl" : "ltr"}
        className={`min-h-11 
          w-full flex items-center 
          justify-between
          gap-2 rounded px-3 py-2 
          text-sm text-slate-800 
          transition hover:cursor-pointer
          hover:bg-sky-50 focus:outline-none 
          focus-visible:ring-2 
          focus-visible:ring-sky-500/60 
          dark:text-slate-100 
          dark:hover:bg-slate-700 
          ${isArabic ? "text-right" : "text-left"}`}
      >
        <div className="flex items-center gap-2">
          <span>{label}</span>
          {badge && (
            <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">
              {badge}
            </span>
          )}
        </div>
        <DynamicIcon
          size={16}
          iconName={iconName}
          className="text-sky-500 dark:text-sky-400"
        />
      </button>
    </div>
  );
};

export default UserMenueItem;
