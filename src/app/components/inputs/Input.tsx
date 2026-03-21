"use client";

import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { DynamicIcon } from "../addCategory/IconSetter";

interface InputProps {
  id: string;
  label: string;
  type?: string;
  disabled?: boolean;
  formatPrice?: boolean;
  required?: boolean;
  register: UseFormRegister<FieldValues>;
  errors: FieldErrors;
  iconName?: string;
}

const Input: React.FC<InputProps> = ({
  id,
  label,
  type = "text",
  disabled,
  formatPrice,
  required,
  register,
  errors,
  iconName,
}) => {
  return (
    <div className="w-full relative">
      {formatPrice && (
        <DynamicIcon
          iconName={iconName}
          size={24}
          className="absolute 
          text-slate-500 dark:text-slate-400
          top-5
          left-2"
        />
      )}
      <input
        id={id}
        disabled={disabled}
        type={type}
        {...register(id, { required })}
        placeholder=" "
        className={`
            peer
            w-full
            p-4
            pt0-6
            font-light
          text-slate-900 dark:text-slate-100
          bg-white dark:bg-slate-800
            border-2
            rounded-md
            outline-none
            transition
            disabled:opacity-70
            disabled:cursor-not-allowed
            ${formatPrice ? "pl-9" : "pl-4"}
          ${errors[id] ? "border-rose-500" : "border-slate-300 dark:border-slate-600"}
          ${errors[id] ? "focus:border-rose-500" : "focus:border-sky-600 dark:focus:border-sky-400"}
          focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/60
            `}
      />
      <label
        htmlFor={id}
        className={`
        absolute
        text-md
        duration-150
        transform
        -translate-y-3
        top-5
        z-10
        origin-left
        peer-placeholder-shown:scale-100
        peer-placeholder-shown:translate-y-0
        peer-focus:scale-75
        peer-focus:-translate-y-4
        ${formatPrice ? "left-9" : "left-4"}
        ${errors[id] ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}
        `}
      >
        {label}
      </label>
    </div>
  );
};

export default Input;
