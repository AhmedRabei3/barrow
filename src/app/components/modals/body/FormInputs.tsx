import React from "react";
import { Path, UseFormRegister } from "react-hook-form";
import { DynamicIcon } from "../../addCategory/IconSetter";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface FormInputProps<T extends Record<string, unknown>> {
  register?: UseFormRegister<T>;
  name: Path<T>; // اسم الحقل
  type?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  iconName?: string;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function FormInput<T extends Record<string, unknown>>({
  register,
  name,
  type = "text",
  label = "label",
  iconName,
  placeholder,
  required = false,
  value,
  onChange,
}: FormInputProps<T>) {
  const { isArabic } = useAppPreferences();

  return (
    <div
      className="
        flex flex-col
        justify-center
      "
    >
      <label className="block text-sm text-slate-700 dark:text-slate-300 font-medium">
        {label}
      </label>
      <div
        className="
         flex justify-between
         w-full items-center 
         px-1 border border-slate-300 dark:border-slate-600 rounded
         bg-white dark:bg-slate-800
         shadow-sm
         hover:shadow-sm
        "
      >
        <input
          type={type}
          className="
           p-2 focus:outline-none
           w-full
           text-sm
           text-slate-900 dark:text-slate-100
           placeholder:text-slate-400 dark:placeholder:text-slate-500
           bg-transparent"
          placeholder={placeholder}
          {...(register && !onChange && !value
            ? register(name, {
                required: required
                  ? isArabic
                    ? `${label} مطلوب`
                    : `${label} is required`
                  : false,
              })
            : {})}
          value={value}
          onChange={onChange}
        />
        <DynamicIcon
          className="text-slate-500 dark:text-slate-400"
          iconName={iconName}
        />
      </div>
    </div>
  );
}

export default FormInput;
