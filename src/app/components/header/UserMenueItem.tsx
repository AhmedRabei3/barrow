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
      <div
        onClick={onClick}
        dir={isArabic ? "rtl" : "ltr"}
        className={`p-1 text-sm text-slate-700 dark:text-slate-100 hover:bg-sky-50 dark:hover:bg-slate-700 
        rounded hover:cursor-pointer w-full
        flex items-center justify-between ${isArabic ? "text-right" : "text-left"}`}
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
      </div>
    </div>
  );
};

export default UserMenueItem;
