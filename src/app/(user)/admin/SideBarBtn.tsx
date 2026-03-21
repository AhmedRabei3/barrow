"use client";

import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
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
}: SideBarBtnInterface) => {
  return (
    <button
      type="button"
      title={collapsed ? label : undefined}
      className={`
         flex 
         items-center 
         ${collapsed ? "justify-center md:justify-center" : "justify-between"}
         gap-3 
         text-sm md:text-[15px]
         mt-2
         hover:cursor-pointer
         hover:shadow-md
         shadow-sm
         p-2.5
         rounded-xl
         w-full
         transition-all
         ${collapsed ? "md:px-2" : "md:px-3"}
         ${
           page === pageKey
             ? "text-indigo-900 shadow-indigo-200 bg-white dark:bg-slate-800 dark:text-indigo-100"
             : "text-indigo-100/90 hover:bg-white/15 dark:text-slate-200 dark:hover:bg-slate-800"
         }
        `}
      onClick={() => {
        setPage(pageKey);
        setIsOpen(false);
      }}
    >
      <span className={`w-full ${collapsed ? "md:hidden" : ""}`}>{label}</span>
      <DynamicIcon
        className={iconClassName}
        size={size || 18}
        iconName={iconName}
      />
    </button>
  );
};

export default SideBarBtn;
