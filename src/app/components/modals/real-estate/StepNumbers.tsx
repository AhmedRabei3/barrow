import NumberSelect from "../../NumberSelect";
import {
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface StepNumbersProps {
  register?: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  setValue: UseFormSetValue<FieldValues>;
}

const StepNumbers = ({ watch, setValue }: StepNumbersProps) => {
  const { isArabic } = useAppPreferences();

  return (
    <div className="grid grid-cols-2 sm:grid-cols md:grid-cols-3 gap-4">
      <NumberSelect
        name="guests"
        label={isArabic ? "الضيوف" : "Guests"}
        watch={watch}
        setValue={setValue}
      />
      <NumberSelect
        name="livingrooms"
        label={isArabic ? "غرف المعيشة" : "Livingrooms"}
        watch={watch}
        setValue={setValue}
      />
      <NumberSelect
        name="bedrooms"
        label={isArabic ? "غرف النوم" : "Bedrooms"}
        watch={watch}
        setValue={setValue}
      />
      <NumberSelect
        name="bathrooms"
        label={isArabic ? "الحمامات" : "Bathrooms"}
        watch={watch}
        setValue={setValue}
      />
      <NumberSelect
        name="kitchens"
        label={isArabic ? "المطابخ" : "Kitchens"}
        watch={watch}
        setValue={setValue}
      />
    </div>
  );
};
export default StepNumbers;
