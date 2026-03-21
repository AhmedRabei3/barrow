import { FieldValues, UseFormRegister, UseFormWatch } from "react-hook-form";
import { DynamicIcon } from "./addCategory/IconSetter";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

interface OptionsGroupProps {
  register: UseFormRegister<FieldValues>;
  watch: UseFormWatch<FieldValues>;
  radioGroups: {
    name: string;
    label: string;
    options: string[];
    defaultValue: string;
    iconName: string;
  }[];
}

const OptionsGroup = ({ register, watch, radioGroups }: OptionsGroupProps) => {
  const { isArabic } = useAppPreferences();

  const localizeOption = (value: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      SELL: { ar: "بيع", en: "Sell" },
      RENT: { ar: "إيجار", en: "Rent" },
      DAILY: { ar: "يومي", en: "Daily" },
      WEEKLY: { ar: "أسبوعي", en: "Weekly" },
      MONTHLY: { ar: "شهري", en: "Monthly" },
      YEARLY: { ar: "سنوي", en: "Yearly" },
      GASOLINE: { ar: "بنزين", en: "Gasoline" },
      DIESEL: { ar: "ديزل", en: "Diesel" },
      HYBRID: { ar: "هجين", en: "Hybrid" },
      ELECTRIC: { ar: "كهربائي", en: "Electric" },
      AUTOMATIC: { ar: "أوتوماتيك", en: "Automatic" },
      MANUAL: { ar: "عادي", en: "Manual" },
    };

    const translated = map[value];
    if (!translated) return value;
    return isArabic ? translated.ar : translated.en;
  };

  return (
    <>
      {radioGroups.map((group) => (
        <div
          key={group.name}
          className="
            flex text-sm 
            flex-1 flex-col
          "
        >
          <div className="flex items-center justify-between text-neutral-700 pt-2">
            <label className="text-md">{group.label}</label>
            <DynamicIcon iconName={group.iconName} size={12} />
          </div>
          <div
            className="
            border-gray-400 
              border p-2 rounded-md
              hover:bg-slate-50 
            "
          >
            {group.options.map((option) => {
              const optionId = `${group.name}-${option.toLowerCase()}`;
              return (
                <div key={option} className="flex items-center gap-2 mb-1">
                  <input
                    id={optionId}
                    type="radio"
                    value={option}
                    defaultChecked={option === group.defaultValue}
                    {...register!(group.name)}
                    className="hover:cursor-pointer"
                  />
                  <label
                    htmlFor={optionId}
                    className="hover:cursor-pointer text-xs"
                  >
                    {localizeOption(option)}
                  </label>
                </div>
              );
            })}
            {/* Extra: rent type */}
            {group.name === "sellOrRent" && watch!("sellOrRent") === "RENT" && (
              <div className="flex items-center gap-2 mt-1">
                <label htmlFor={`${group.name}-rentType`}>
                  {isArabic ? "نوع الإيجار:" : "Rent type:"}
                </label>
                <select
                  id={`${group.name}-rentType`}
                  className="flex-2 p-1 
                   focus:outline-none bg-gray-50 rounded
                  "
                  {...register!("rentType")}
                >
                  <option value="DAILY">{isArabic ? "يومي" : "Daily"}</option>
                  <option value="WEEKLY">
                    {isArabic ? "أسبوعي" : "Weekly"}
                  </option>
                  <option value="MONTHLY">
                    {isArabic ? "شهري" : "Monthly"}
                  </option>
                  <option value="YEARLY">{isArabic ? "سنوي" : "Yearly"}</option>
                </select>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
};

export default OptionsGroup;
