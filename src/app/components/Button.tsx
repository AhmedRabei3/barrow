"use client";

import { IconType } from "react-icons";

interface ButtonProps {
  label?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  outline?: boolean;
  small?: boolean;
  icon?: IconType;
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  disabled,
  outline,
  small,
  icon: Icon,
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
    relative
    disabled:opacity-70
    disabled:cursor-not-allowed
    rounded-lg
    hover:opacity-80
    transition
    w-full
    text-white
    ${outline ? "bg-white" : "bg-sky-900"}
    ${outline ? "border-black" : "bg-sky-950"}
    ${outline ? "text-black" : "text-white"}
    ${small ? "text-sm" : "text-md"}
    ${small ? "py-1" : "py-3"}
    ${small ? "font-light" : "font-semibold"}
    ${small ? "border" : "border-2"}
    `}
    >
      {Icon && <Icon size={24} className="absolute left-4 top-3" />}
      {label}
    </button>
  );
};

export default Button;
