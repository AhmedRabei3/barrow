"use client";

import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import React, { Dispatch, SetStateAction } from "react";
import { AdminPageKey } from "./AdminSideBar";

interface SideBarBtnInterface {
  setPage: Dispatch<SetStateAction<AdminPageKey>>;
  page: AdminPageKey;
  pageKey: AdminPageKey;
  label: string;
  iconClassName?: string;
  size?: number;
  iconName?: string;
  setIsOpen: Dispatch<React.SetStateAction<boolean>>;
  collapsed?: boolean;
  onClick?: () => void;
}

const SideBarBtn = ({
  setPage,
  page,
  pageKey,
  label,
  iconClassName,
  size,
  iconName,
  setIsOpen,
  collapsed = false,
  onClick,
}: SideBarBtnInterface) => {
  const { theme } = useAppPreferences();
  const isActive = page === pageKey;
  const isLight = theme === "light";

  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      className={`group mt-1 flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm transition-all ${
        collapsed
          ? "w-12 justify-center px-0 md:min-h-12"
          : "w-full justify-start"
      } ${
        isActive
          ? isLight
            ? "border-orange-300 bg-linear-to-r from-orange-100 to-white text-slate-900 shadow-[0_14px_28px_rgba(249,115,22,0.12)]"
            : "border-orange-500/25 bg-linear-to-r from-orange-500/15 to-zinc-950 text-white shadow-[0_14px_28px_rgba(249,115,22,0.18)]"
          : isLight
            ? "border-transparent bg-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            : "border-transparent bg-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
      }`}
      onClick={() => {
        if (onClick) {
          onClick();
          setIsOpen(false);
          return;
        }

        setPage(pageKey);
        setIsOpen(false);
      }}
    >
      <DynamicIcon
        className={`${iconClassName || ""} ${
          isActive
            ? isLight
              ? "text-orange-600"
              : "text-orange-300"
            : isLight
              ? "text-slate-400 group-hover:text-slate-700"
              : "text-zinc-500 group-hover:text-zinc-200"
        }`}
        size={size || 18}
        iconName={iconName}
      />
      <span
        className={`truncate text-start font-medium ${collapsed ? "md:hidden" : ""}`}
      >
        {label}
      </span>
    </button>
  );
};

export default SideBarBtn;
