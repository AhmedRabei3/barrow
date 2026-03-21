import { FieldValues, UseFormRegister, UseFormWatch } from "react-hook-form";
import OptionsGroup from "../../OptionsGroup";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

interface CostumRadioProps {
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
}

const CostumRadioGroup = ({ register, watch }: CostumRadioProps) => {
  const { isArabic } = useAppPreferences();

  const radioGroups = [
    {
      name: "fuelType",
      label: isArabic ? "الوقود" : "Fuel",
      options: ["GASOLINE", "DIESEL", "HYBRID", "ELECTRIC"],
      defaultValue: "GASOLINE",
      iconName: "BsFuelPump",
    },
    {
      name: "gearType",
      label: isArabic ? "ناقل الحركة" : "Gear Type",
      options: ["AUTOMATIC", "MANUAL"],
      defaultValue: "AUTOMATIC",
      iconName: "TbManualGearbox",
    },
    {
      name: "sellOrRent",
      label: isArabic ? "نوع العرض" : "Offered To",
      options: ["RENT", "SELL"],
      defaultValue: "RENT",
      iconName: "GiCarKey",
    },
  ];
  return (
    <div className="flex flex-row w-full gap-1 justify-between">
      <OptionsGroup
        register={register}
        radioGroups={radioGroups}
        watch={watch}
      />
    </div>
  );
};

export default CostumRadioGroup;
