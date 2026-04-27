import React from "react";
import { DynamicIcon } from "../addCategory/IconSetter";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface Props {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  unreadCount: number;
}

const BellBtn = ({ setOpen, unreadCount }: Props) => {
  const { isArabic } = useAppPreferences();

  return (
    <button
      type="button"
      onClick={() => setOpen((v) => !v)}
      className="relative mx-2.5 flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-800 transition hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
      aria-label={isArabic ? "الإشعارات" : "Notifications"}
    >
      <DynamicIcon iconName="FaRegBell" size={18} />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-4.5 h-4.5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default React.memo(BellBtn);
