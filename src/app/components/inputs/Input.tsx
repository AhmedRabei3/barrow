"use client";

import { useState } from "react";
import { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { DynamicIcon } from "../addCategory/IconSetter";
import type { RegisterOptions } from "react-hook-form";

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
  onIconClick?: () => void;
  registerOptions?: RegisterOptions<FieldValues, string>;
  inputDir?: "ltr" | "rtl";
  textAlign?: "left" | "right";
  allowPasswordToggle?: boolean;
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
  registerOptions,
  inputDir,
  textAlign,
  allowPasswordToggle = false,
}) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordField = type === "password";
  const resolvedType =
    isPasswordField && allowPasswordToggle
      ? isPasswordVisible
        ? "text"
        : "password"
      : type;
  const hasRightAction = isPasswordField && allowPasswordToggle;

  return (
    <div className="w-full relative gap-1">
      <input
        id={id}
        disabled={disabled}
        type={resolvedType}
        dir={inputDir}
        {...register(id, { required, ...registerOptions })}
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
            disabled:cursor-not-allowed gap-1
            ${iconName || formatPrice ? "pl-9" : "pl-4"}
            ${hasRightAction ? "pr-11" : "pr-4"}
            ${textAlign === "left" ? "text-left" : textAlign === "right" ? "text-right" : ""}
          ${errors[id] ? "border-rose-500" : "border-slate-300 dark:border-slate-600"}
          ${errors[id] ? "focus:border-rose-500" : "focus:border-sky-600 dark:focus:border-sky-400"}
          focus:ring-2 focus:ring-sky-200 dark:focus:ring-sky-900/60
            `}
      />
      {hasRightAction ? (
        <button
          type="button"
          onClick={() => setIsPasswordVisible((value) => !value)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          aria-label={isPasswordVisible ? "Hide password" : "Show password"}
        >
          <DynamicIcon
            iconName={isPasswordVisible ? "MdVisibilityOff" : "MdVisibility"}
            size={20}
          />
        </button>
      ) : null}
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
        peer-focus:-translate-y-4 gap-1
        ${formatPrice ? "left-9" : "left-4"}
        ${textAlign === "right" ? "text-right" : "text-left"}
        ${errors[id] ? "text-rose-500" : "text-slate-500 dark:text-slate-400"}
        `}
      >
        {label}
      </label>
    </div>
  );
};

export default Input;
