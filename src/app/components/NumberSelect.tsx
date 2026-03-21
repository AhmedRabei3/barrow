"use client";

import React, { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DynamicIcon } from "./addCategory/IconSetter";
import { FieldValues, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

interface NumberSelectorProps {
  label?: string;
  setValue: UseFormSetValue<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  name: string;
  iconName?: string;
}

const NumberSelector = ({
  label,
  setValue,
  watch,
  name,
  iconName,
}: NumberSelectorProps) => {
  const { isArabic } = useAppPreferences();
  // local state to fix delayed UI updates
  const formValue = watch(name);
  const initial =
    typeof formValue === "number" && !isNaN(formValue) ? formValue : 1;

  const [value, setLocalValue] = useState(initial);

  // Sync when RHF value changes from outside
  useEffect(() => {
    if (formValue !== value && typeof formValue === "number") {
      setLocalValue(formValue);
    }
  }, [formValue, value]);

  const update = (newVal: number) => {
    setLocalValue(newVal); // instant UI update
    setValue(name, newVal, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const increase = () => update(value + 1);

  const decrease = () => {
    if (value > 1) update(value - 1);
  };

  return (
    <div className="px-2 relative flex flex-col border border-gray-400 gap-2 justify-center items-center shadow py-2 rounded-md select-none">
      <label className="text-sm text-neutral-700 flex gap-x-2 items-center border-b border-gray-300 w-full justify-center pb-1">
        {label}
        <DynamicIcon iconName={iconName} size={16} />
      </label>

      <div className="flex items-center justify-center gap-x-3 w-full">
        <motion.p
          whileTap={{ scale: 0.85 }}
          onClick={decrease}
          className="rounded-full p-2 hover:text-sky-600 transition cursor-pointer"
        >
          <DynamicIcon
            iconName={isArabic ? "MdChevronRight" : "MdChevronLeft"}
            size={22}
          />
        </motion.p>

        <input
          type="number"
          className="focus:outline-none text-center text-lg font-semibold w-14 no-spinner"
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v) && v >= 1) update(v);
          }}
        />

        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={increase}
          className="rounded-full p-2 hover:text-sky-600 transition cursor-pointer"
        >
          <DynamicIcon
            iconName={isArabic ? "MdChevronLeft" : "MdChevronRight"}
            size={22}
          />
        </motion.button>
      </div>
    </div>
  );
};

export default memo(NumberSelector);
