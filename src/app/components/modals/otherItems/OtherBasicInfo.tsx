import {
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { ItemType } from "@prisma/client";
import OptionsGroup from "../../OptionsGroup";
import FormInput from "../body/FormInputs";
import CategoryDroper from "../usedCar/CategoryDroper";
import Description from "../../Description";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface StepBasicInfoProps {
  setValue: UseFormSetValue<FieldValues>;
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  categories: Array<{
    id: string;
    name: string;
    type: ItemType;
    icon: string | null;
  }>;
}

const OtherBasicInfo = ({
  register,
  categories,
  watch,
  setValue,
}: StepBasicInfoProps) => {
  const { isArabic } = useAppPreferences();

  return (
    <div
      className="
    grid grid-cols-1 overflow-hidden 
    md:grid-cols-2 gap-4 
    justify-center 
    items-center"
    >
      <div className="flex flex-col h-full justify-between pt-2">
        <div className="flex-1">
          <CategoryDroper
            categories={categories}
            register={register}
            setValue={setValue}
            watch={watch}
          />
        </div>
        <div>
          <div className="">
            <FormInput
              register={register}
              name="name"
              label={isArabic ? "الاسم" : "Name"}
              type="text"
              placeholder={isArabic ? "مثال: مدفأة" : "Ex: Heater"}
              required
              iconName="MdOutlineTitle"
            />
            <FormInput
              register={register}
              name="brand"
              label={isArabic ? "العلامة التجارية" : "Brand"}
              type="text"
              placeholder={isArabic ? "مثال: SONY" : "Ex: SONY"}
              required
              iconName="MdOutlineTitle"
            />
          </div>
          <FormInput
            register={register}
            name="price"
            label={isArabic ? "السعر" : "Price"}
            type="number"
            required
            iconName="TbCurrencyDollar"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1 h-full">
        <div className="">
          <OptionsGroup
            register={register}
            watch={watch}
            radioGroups={[
              {
                name: "sellOrRent",
                label: isArabic ? "بيع / إيجار" : "Sell / Rent",
                options: ["SELL", "RENT"],
                defaultValue: "RENT",
                iconName: "BiKey",
              },
            ]}
          />
          <Description
            register={register}
            label={isArabic ? "نبذة عن العنصر" : "About this item"}
            name="description"
          />
        </div>
      </div>
    </div>
  );
};

export default OtherBasicInfo;
