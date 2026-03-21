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
      onClick={() => setOpen((v) => !v)}
      className="relative p-2 rounded-full mx-2.5 transition text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
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
