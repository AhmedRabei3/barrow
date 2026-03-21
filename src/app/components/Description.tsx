import React, { memo } from "react";
import { FieldValues, UseFormRegister } from "react-hook-form";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

interface DescriptionsProps {
  register: UseFormRegister<FieldValues>;
  name: string;
  label: string;
}

const Description = ({ register, name, label }: DescriptionsProps) => {
  const { isArabic } = useAppPreferences();

  return (
    <div className="flex flex-col w-full">
      <label htmlFor="description" className="text-sm text-neutral-700">
        {label}
      </label>
      <textarea
        id="description"
        {...register(name)}
        rows={4}
        className="border py-2 border-slate-400 rounded-md px-2 text-sm shadow-md hover:shadow-sm"
        placeholder={isArabic ? "ميزات إضافية" : "Other features"}
      />
    </div>
  );
};

export default memo(Description);
