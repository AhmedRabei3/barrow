"use client";
import CheckBoxGroup from "../../CheckBoxGroup";
import {
  FieldValues,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import Description from "../../Description";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface StepExtraInfoProps {
  getValues: UseFormGetValues<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
  register: UseFormRegister<FieldValues>;
}

const StepExtraInfo = ({
  getValues,
  setValue,
  register,
}: StepExtraInfoProps) => {
  const { isArabic } = useAppPreferences();

  return (
    <div className="flex flex-col gap-2">
      <div id="directions">
        <label className="text-sm mb-1 text-neutral-700">
          {isArabic ? "الاتجاهات" : "Directions"}
        </label>
        <CheckBoxGroup
          name="direction"
          getValues={getValues}
          setValue={setValue}
          items={[
            {
              label: isArabic ? "شمال" : "North",
              value: "NORTH",
              checkedIcon: "FaArrowAltCircleUp",
              unCheckedIcon: "Check",
            },
            {
              label: isArabic ? "جنوب" : "South",
              value: "SOUTH",
              checkedIcon: "FaArrowAltCircleDown",
              unCheckedIcon: "Check",
            },
            {
              label: isArabic ? "شرق" : "East",
              value: "EAST",
              checkedIcon: "FaArrowAltCircleRight",
              unCheckedIcon: "Check",
            },
            {
              label: isArabic ? "غرب" : "West",
              value: "WEST",
              checkedIcon: "FaArrowAltCircleLeft",
              unCheckedIcon: "Check",
            },
          ]}
        />
      </div>
      <Description
        label={isArabic ? "وصف إضافي" : "Additional description"}
        name="description"
        register={register}
      />
      <label htmlFor="directions" />
    </div>
  );
};

export default StepExtraInfo;
