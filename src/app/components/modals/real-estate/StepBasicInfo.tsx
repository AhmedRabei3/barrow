import {
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { ItemType } from "@prisma/client";
import MyCheckBox from "../../MyCheckBox";
import OptionsGroup from "../../OptionsGroup";
import FormInput from "../body/FormInputs";
import CategoryDroper from "../usedCar/CategoryDroper";
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

const StepBasicInfo = ({
  register,
  categories,
  watch,
  setValue,
}: StepBasicInfoProps) => {
  const { isArabic } = useAppPreferences();

  return (
    <div
      className="
    grid grid-cols-1 
    md:grid-cols-2 gap-4 
    justify-center 
    items-center"
    >
      <div className="flex flex-col h-full justify-between">
        <CategoryDroper
          categories={categories}
          register={register}
          setValue={setValue}
          watch={watch}
        />
        <FormInput
          register={register}
          name="title"
          label={isArabic ? "العنوان" : "Title"}
          type="text"
          placeholder={isArabic ? "أدخل عنوان الإعلان" : "Enter title"}
          required
          iconName="MdOutlineTitle"
        />
        <div className="grid grid-cols-3 gap-1 sm:grid-cols-1">
          <FormInput
            register={register}
            name="price"
            label={isArabic ? "السعر" : "Price"}
            type="number"
            required
            iconName="TbCurrencyDollar"
          />
          <FormInput
            register={register}
            name="area"
            label={isArabic ? "المساحة (م²)" : "Area (m^2)"}
            type="number"
            required
            iconName="MdOutlinePhotoSizeSelectSmall"
          />
          <FormInput
            register={register}
            name="floor"
            label={isArabic ? "الطابق" : "Floor"}
            type="number"
            required
            iconName="MdOutlineElevator"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1 h-full py-2 pt-5">
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
        <div className="p-2 gap-2 border rounded shadow-md border-gray-400">
          <MyCheckBox
            name="elevator"
            register={register}
            label={isArabic ? "مصعد" : "Elevator"}
            checkedIcon="TbElevator"
          />
          <MyCheckBox
            name="furnished"
            register={register}
            label={isArabic ? "مفروش" : "Furnished"}
            checkedIcon="RiSofaLine"
          />
          <MyCheckBox
            name="petAllowed"
            register={register}
            label={isArabic ? "يسمح بالحيوانات" : "Pets Allowed"}
            checkedIcon="TbDog"
          />
        </div>
      </div>
    </div>
  );
};

export default StepBasicInfo;
