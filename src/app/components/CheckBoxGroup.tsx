"use client";

import { memo } from "react";
import {
  FieldValues,
  UseFormGetValues,
  UseFormSetValue,
} from "react-hook-form";
import { DynamicIcon } from "./addCategory/IconSetter";

type DirItem = {
  label: string;
  value: string;
  checkedIcon?: string;
  unCheckedIcon?: string;
};

interface Props {
  name: string;
  items: DirItem[];
  getValues: UseFormGetValues<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

const CheckboxGroup = ({ name, items, getValues, setValue }: Props) => {
  const currentValues =
    (getValues(name as never) as string[] | undefined) || [];

  const toggle = (value: string) => {
    const exists = currentValues.includes(value);
    const newValues = exists
      ? currentValues.filter((v: string) => v !== value)
      : [...currentValues, value];

    setValue(name as never, newValues as never, { shouldValidate: true });
  };

  return (
    <div className="text-sm grid grid-cols-4 gap-2">
      {items.map(({ label, value, checkedIcon, unCheckedIcon }) => {
        const isChecked = currentValues.includes(value);
        return (
          <button
            key={value}
            type="button"
            onClick={() => toggle(value)}
            className={`
              flex items-center justify-between 
              border rounded px-2 py-1 text-sm
              transition select-none hover:cursor-pointer
              ${
                isChecked
                  ? "border-sky-600 bg-sky-100 text-sky-700"
                  : "border-neutral-300"
              }
            `}
          >
            <span>{label}</span>

            {checkedIcon && unCheckedIcon ? (
              <DynamicIcon
                iconName={isChecked ? checkedIcon : unCheckedIcon}
                size={16}
                className={isChecked ? "text-sky-600" : "hover:bg-sky-50"}
              />
            ) : (
              <input
                type="checkbox"
                name="checkboxGroupItem"
                checked={isChecked}
                readOnly
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default memo(CheckboxGroup);
