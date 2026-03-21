import { memo } from "react";
import { DynamicIcon } from "./addCategory/IconSetter";
import { FieldValues, UseFormRegister } from "react-hook-form";

interface MyCheckBoxProps {
  checkedIcon?: string;
  register: UseFormRegister<FieldValues>;
  name: string;
  label: string;
}

const MyCheckBox = ({
  register,
  checkedIcon,
  name,
  label,
}: MyCheckBoxProps) => {
  return (
    <label
      className="
        flex items-center gap-2 
        cursor-pointer select-none
        text-neutral-700
        peer-checked:text-sky-700 
        peer-checked:bg-sky-100 
        w-full py-1 px-2 rounded
        text-sm
      "
    >
      {/* Native checkbox */}
      <input type="checkbox" {...register(name)} className="peer hidden" />

      {/* Label Text */}
      <span className="peer-checked:text-sky-700 ml-5">{label}</span>
      {/* Icons */}
      {checkedIcon && (
        <>
          <DynamicIcon
            iconName="FaSlash"
            size={17}
            className="peer-checked:hidden absolute "
          />
          <DynamicIcon
            iconName={checkedIcon}
            size={16}
            className="peer-checked:block peer-checked:text-sky-700 absolute"
          />
        </>
      )}
    </label>
  );
};

export default memo(MyCheckBox);
