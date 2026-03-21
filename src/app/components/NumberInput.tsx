"use client";

import React, { useState } from "react";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { DynamicIcon } from "./addCategory/IconSetter";

interface NumberSpinnerProps {
  label: string;
  iconName?: string;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  register: UseFormRegister<FieldValues>;
  errors?: FieldErrors;
}

const NumberSpinner: React.FC<NumberSpinnerProps> = ({
  label,
  iconName,
  placeholder,
  min,
  max,
  step = 1,
  register,
  errors,
}) => {
  const [value, setValue] = useState<number>(0);
  const errorMessage =
    errors &&
    register.name &&
    (errors[register.name]?.message as string | undefined);

  const increment = () =>
    setValue((prev) => Math.min(max ?? Infinity, prev + step));
  const decrement = () =>
    setValue((prev) => Math.max(min ?? -Infinity, prev - step));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value);
    if (!isNaN(num)) setValue(num);
  };

  return (
    <div className="flex flex-col mb-4">
      <label className="flex items-center gap-2 mb-1 font-medium text-gray-700">
        {iconName && <DynamicIcon iconName={iconName} size={16} />}
        {label}
      </label>
      <div className="flex items-center border rounded-md overflow-hidden w-full">
        <button
          type="button"
          onClick={decrement}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200"
        >
          -
        </button>
        <div className="flex-1 relative h-10 flex items-center justify-center">
          <AnimatePresence mode="popLayout">
            <motion.input
              key={value}
              type="number"
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              min={min}
              max={max}
              step={step}
              className={`w-full text-center outline-none border-none appearance-none bg-transparent`}
              initial={{ opacity: 0, rotateX: -90 }}
              animate={{ opacity: 1, rotateX: 0 }}
              exit={{ opacity: 0, rotateX: 90 }}
              transition={{ duration: 0.3 }}
            />
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={increment}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200"
        >
          +
        </button>
      </div>
      {errorMessage && typeof errorMessage === "string" && (
        <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
      )}
    </div>
  );
};

export default NumberSpinner;
