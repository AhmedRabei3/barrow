"use client";
import { useEffect, useState } from "react";
import {
  FieldValues,
  Path,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { IconType } from "react-icons";
import * as FaIcons from "react-icons/fa";
import * as AiIcons from "react-icons/ai";
import * as MdIcons from "react-icons/md";
import * as BiIcons from "react-icons/bi";
import * as IoIcons from "react-icons/io";
import * as CiIcons from "react-icons/ci";
import * as GiIcons from "react-icons/gi";
import * as BsIcons from "react-icons/bs";
import * as TbIcons from "react-icons/tb";
import * as RiIcons from "react-icons/ri";
import * as HiIcons from "react-icons/hi";
import * as SiIcons from "react-icons/si";
import * as CgIcons from "react-icons/cg";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const icons: Record<string, Record<string, IconType>> = {
  Fa: FaIcons,
  Ai: AiIcons,
  Md: MdIcons,
  Bi: BiIcons,
  Io: IoIcons,
  Ci: CiIcons,
  Gi: GiIcons,
  Bs: BsIcons,
  Tb: TbIcons,
  Ri: RiIcons,
  Hi: HiIcons,
  Si: SiIcons,
  Cg: CgIcons,
};

interface IconPickerInterface<TFormValues extends FieldValues> {
  register: UseFormRegister<TFormValues>;
  setValue: UseFormSetValue<TFormValues>;
}

export default function IconPicker<TFormValues extends FieldValues>({
  register,
  setValue,
}: IconPickerInterface<TFormValues>) {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const [query, setQuery] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");

  // جميع الأيقونات كـ array
  const allIcons = Object.entries(icons).flatMap(([prefix, icons]) =>
    Object.keys(icons).map((iconName) => `${prefix}.${iconName}`),
  );

  // فلترة الأيقونات حسب البحث
  const filteredIcons = allIcons.filter((iconName) =>
    iconName.toLowerCase().includes(query.toLowerCase()),
  );

  // تحديث قيمة الحقل في الفورم عند اختيار أيقونة
  useEffect(() => {
    setValue("icon" as never, selectedIcon as never);
  }, [selectedIcon, setValue]);

  return (
    <div className="flex flex-col gap-3 ">
      <input
        type="text"
        placeholder={t("ابحث عن أيقونة...", "Search for icons...")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 p-2 rounded"
      />

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-64 overflow-y-auto border border-slate-300 dark:border-slate-700 p-2 rounded bg-white dark:bg-slate-950">
        {filteredIcons.slice(0, 70).map((fullName) => {
          const [prefix, iconName] = fullName.split(".");
          const IconSet = icons[prefix as keyof typeof icons];
          const Icon = IconSet?.[iconName as keyof typeof IconSet] as
            | IconType
            | undefined;

          return (
            <div
              key={fullName}
              onClick={() => setSelectedIcon(iconName)}
              className={`flex flex-col items-center text-xs cursor-pointer p-2 rounded transition ${
                selectedIcon === iconName
                  ? "bg-blue-200 dark:bg-blue-900/40"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {Icon ? <Icon size={24} /> : null}
            </div>
          );
        })}
      </div>

      <p className="text-slate-700 dark:text-slate-300">
        {t("الأيقونة المختارة", "Selected Icon")}:{" "}
        <b className="text-blue-600 dark:text-blue-400">
          {selectedIcon || t("لا يوجد", "None")}
        </b>
      </p>
      <input {...register("icon" as Path<TFormValues>)} type="hidden" />
    </div>
  );
}
