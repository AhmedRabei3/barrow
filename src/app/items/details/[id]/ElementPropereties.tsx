"use client";

import { DynamicIcon } from "@/app/components/addCategory/IconSetter";
import { formatNumber } from "@/lib/locale-format";

type ItemDetailsData = {
  [key: string]: unknown;
  // Common
  brand?: string | null;
  title?: string | null;
  name?: string | null;
  model?: string | null;
  color?: string | null;
  status?: string | null;
  rentType?: string | null;
  price?: number | null;
  description?: string | null;
  sellOrRent?: string | null;
  type?: string | null;
  // Car-specific
  fuelType?: string | null;
  gearType?: string | null;
  year?: number | null;
  mileage?: number | null;
  repainted?: boolean | null;
  reAssembled?: boolean | null;
  furnitureCondition?: string | null;
  furnitureMaterial?: string | null;
  furnitureRoomType?: string | null;
  furnitureDimensions?: string | null;
  furnitureAssemblyIncluded?: boolean | null;
  medicalCondition?: string | null;
  medicalDeviceFunction?: string | null;
  medicalManufactureYear?: number | null;
  medicalDimensions?: string | null;
  medicalWeight?: string | null;
  medicalManufacturerPlace?: string | null;
  medicalIsUsed?: boolean | null;
  medicalWarrantyMonths?: number | null;
  medicalUsageHours?: number | null;
  // Property-specific
  bedrooms?: number | null;
  bathrooms?: number | null;
  guests?: number | null;
  livingrooms?: number | null;
  kitchens?: number | null;
  area?: number | null;
  floor?: number | null;
  furnished?: boolean | null;
  petAllowed?: boolean | null;
  elvator?: boolean | null;
  direction?: string[] | null;
};

interface elementPropereties {
  data: ItemDetailsData;
  type: string;
  location: { state: string; country: string; address: string; city: string };
  isArabic: boolean;
}

const BoolBadge = ({
  value,
  label,
}: {
  value?: boolean | null;
  label: string;
}) => (
  <li
    className={`market-panel-soft rounded-2xl px-4 py-3 ${!value ? "opacity-50" : ""}`}
  >
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
      {label}
    </p>
    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
      <span
        className={`inline-block h-3 w-3 rounded-full ${value ? "bg-emerald-500" : "bg-slate-600"}`}
      />
      <span>{value ? "✓" : "✗"}</span>
    </div>
  </li>
);

const SpecItem = ({
  label,
  value,
  colorPreview,
}: {
  label: string;
  value: string;
  colorPreview?: string;
}) => (
  <li className="market-panel-soft rounded-2xl px-4 py-3">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 dark:text-slate-300">
      {label}
    </p>
    <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
      {colorPreview ? (
        <span
          style={{ backgroundColor: colorPreview }}
          className="inline-block h-4 w-4 rounded-full border border-slate-300/90 dark:border-white/20"
        />
      ) : null}
      <span>{value}</span>
    </div>
  </li>
);

const ElementPropereties = ({
  data,
  type,
  location,
  isArabic,
}: elementPropereties) => {
  const rentType = data?.rentType;

  const isProperty = type === "PROPERTY";
  const isCar = type === "NEW_CAR" || type === "USED_CAR";
  const isUsedCar = type === "USED_CAR";
  const isMedicalDevice = type === "MEDICAL_DEVICE";

  const rentTypeLabelMap: Record<string, { ar: string; en: string }> = {
    DAILY: { ar: "يومي", en: "daily" },
    WEEKLY: { ar: "أسبوعي", en: "weekly" },
    MONTHLY: { ar: "شهري", en: "monthly" },
    YEARLY: { ar: "سنوي", en: "yearly" },
  };

  // Common specs (all types)
  const commonSpecs: Array<{
    label: string;
    value: string;
    colorPreview?: string;
  }> = [
    {
      label: isArabic ? "نوع العرض" : "Listing type",
      value: rentType
        ? `${isArabic ? "إيجار" : "Rent"} • ${rentTypeLabelMap[rentType]?.[isArabic ? "ar" : "en"] ?? rentType}`
        : isArabic
          ? "للبيع"
          : "For sale",
    },
    {
      label: isArabic ? "السعر" : "Price",
      value: `${formatNumber(Number(data.price ?? 0), isArabic)} $${
        rentType
          ? ` / ${(rentTypeLabelMap[rentType]?.[isArabic ? "ar" : "en"] ?? rentType).toLowerCase()}`
          : ""
      }`,
    },
  ];

  // Property specs
  const propertySpecs = isProperty
    ? [
        data.bedrooms != null
          ? {
              label: isArabic ? "غرف النوم" : "Bedrooms",
              value: String(data.bedrooms),
            }
          : null,
        data.bathrooms != null
          ? {
              label: isArabic ? "الحمامات" : "Bathrooms",
              value: String(data.bathrooms),
            }
          : null,
        data.guests != null
          ? {
              label: isArabic ? "الضيوف" : "Guests",
              value: String(data.guests),
            }
          : null,
        data.livingrooms != null
          ? {
              label: isArabic ? "غرف المعيشة" : "Living rooms",
              value: String(data.livingrooms),
            }
          : null,
        data.kitchens != null
          ? {
              label: isArabic ? "المطابخ" : "Kitchens",
              value: String(data.kitchens),
            }
          : null,
        data.area != null
          ? { label: isArabic ? "المساحة" : "Area", value: `${data.area} m²` }
          : null,
        data.floor != null
          ? { label: isArabic ? "الطابق" : "Floor", value: String(data.floor) }
          : null,
        data.direction?.length
          ? {
              label: isArabic ? "الاتجاه" : "Direction",
              value: data.direction.join(", "),
            }
          : null,
      ].filter(Boolean)
    : [];

  // Car specs
  const carSpecs = isCar
    ? [
        data.color
          ? {
              label: isArabic ? "اللون" : "Color",
              value: data.color,
              colorPreview: data.color,
            }
          : null,
        data.year != null
          ? { label: isArabic ? "سنة الصنع" : "Year", value: String(data.year) }
          : null,
        data.fuelType
          ? {
              label: isArabic ? "نوع الوقود" : "Fuel type",
              value: data.fuelType,
            }
          : null,
        data.gearType
          ? {
              label: isArabic ? "ناقل الحركة" : "Transmission",
              value: data.gearType,
            }
          : null,
        isUsedCar && data.mileage != null
          ? {
              label: isArabic ? "المسافة المقطوعة" : "Mileage",
              value: `${formatNumber(Number(data.mileage), isArabic)} km`,
            }
          : null,
        data.status
          ? { label: isArabic ? "الحالة" : "Status", value: data.status }
          : null,
      ].filter(Boolean)
    : [];

  // Other item specs
  const otherSpecs =
    !isProperty && !isCar
      ? [
          data.furnitureCondition
            ? {
                label: isArabic ? "حالة الأثاث" : "Furniture condition",
                value: data.furnitureCondition,
              }
            : null,
          data.furnitureMaterial
            ? {
                label: isArabic ? "الخامة" : "Material",
                value: data.furnitureMaterial,
              }
            : null,
          data.furnitureRoomType
            ? {
                label: isArabic ? "الغرفة المناسبة" : "Room type",
                value: data.furnitureRoomType,
              }
            : null,
          data.furnitureDimensions
            ? {
                label: isArabic ? "الأبعاد" : "Dimensions",
                value: data.furnitureDimensions,
              }
            : null,
          data.medicalCondition
            ? {
                label: isArabic ? "حالة الجهاز" : "Device condition",
                value: data.medicalCondition,
              }
            : null,
          data.medicalDeviceFunction
            ? {
                label: isArabic ? "وظيفة الجهاز" : "Device function",
                value: data.medicalDeviceFunction,
              }
            : null,
          data.medicalManufactureYear != null
            ? {
                label: isArabic ? "سنة التصنيع" : "Manufacture year",
                value: String(data.medicalManufactureYear),
              }
            : null,
          data.medicalDimensions
            ? {
                label: isArabic ? "الأبعاد" : "Dimensions",
                value: data.medicalDimensions,
              }
            : null,
          data.medicalWeight
            ? {
                label: isArabic ? "الوزن" : "Weight",
                value: data.medicalWeight,
              }
            : null,
          data.medicalManufacturerPlace
            ? {
                label: isArabic ? "مكان التصنيع" : "Manufacturer place",
                value: data.medicalManufacturerPlace,
              }
            : null,
          data.medicalWarrantyMonths != null
            ? {
                label: isArabic ? "مدة الضمان" : "Warranty",
                value: isArabic
                  ? `${data.medicalWarrantyMonths} شهر`
                  : `${data.medicalWarrantyMonths} months`,
              }
            : null,
          data.medicalUsageHours != null
            ? {
                label: isArabic ? "ساعات الاستخدام" : "Usage hours",
                value: String(data.medicalUsageHours),
              }
            : null,
          data.status
            ? { label: isArabic ? "الحالة" : "Status", value: data.status }
            : null,
        ].filter(Boolean)
      : [];

  const allSpecs = [
    ...(propertySpecs as Array<{
      label: string;
      value: string;
      colorPreview?: string;
    }>),
    ...(carSpecs as Array<{
      label: string;
      value: string;
      colorPreview?: string;
    }>),
    ...(otherSpecs as Array<{
      label: string;
      value: string;
      colorPreview?: string;
    }>),
    ...commonSpecs,
  ];

  const locationText = [location?.state, location?.city, location?.country]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="market-panel rounded-3xl p-5 sm:p-6">
      <div className="flex flex-col gap-5">
        <div>
          <p className="market-kicker">
            {isArabic ? "المواصفات" : "Specifications"}
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-950 dark:text-slate-50 sm:text-2xl">
            {isArabic ? "تفاصيل العنصر" : "Listing details"}
          </h2>
        </div>

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {allSpecs.map((spec) => (
            <SpecItem
              key={`${spec.label}-${spec.value}`}
              label={spec.label}
              value={spec.value}
              colorPreview={spec.colorPreview}
            />
          ))}
        </ul>

        {/* Boolean flags for properties */}
        {isProperty && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            <BoolBadge
              value={data.furnished}
              label={isArabic ? "مفروش" : "Furnished"}
            />
            <BoolBadge
              value={data.petAllowed}
              label={isArabic ? "الحيوانات مسموح" : "Pets allowed"}
            />
            <BoolBadge
              value={data.elvator}
              label={isArabic ? "مصعد" : "Elevator"}
            />
          </ul>
        )}

        {/* Boolean flags for used cars */}
        {isUsedCar && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <BoolBadge
              value={data.repainted}
              label={isArabic ? "مطلي" : "Repainted"}
            />
            <BoolBadge
              value={data.reAssembled}
              label={isArabic ? "معاد تجميعه" : "Re-assembled"}
            />
          </ul>
        )}

        {!isProperty && !isCar && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <BoolBadge
              value={data.furnitureAssemblyIncluded}
              label={isArabic ? "يشمل التركيب" : "Assembly included"}
            />
            {isMedicalDevice ? (
              <>
                <BoolBadge
                  value={
                    data.medicalIsUsed === undefined
                      ? undefined
                      : !data.medicalIsUsed
                  }
                  label={isArabic ? "جديد" : "New"}
                />
                <BoolBadge
                  value={data.medicalIsUsed}
                  label={isArabic ? "مستعمل" : "Used"}
                />
              </>
            ) : null}
          </ul>
        )}

        {locationText ? (
          <div className="market-panel-soft rounded-2xl px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
            <p className="mb-2 flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
              <DynamicIcon
                iconName="MdLocationPin"
                className="text-blue-600 dark:text-sky-300"
              />
              {isArabic ? "الموقع" : "Location"}
            </p>
            <p>{locationText}</p>
            {location?.address ? (
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {location.address}
              </p>
            ) : null}
          </div>
        ) : null}

        {data.description ? (
          <div className="market-panel-soft rounded-2xl px-4 py-4">
            <p className="market-kicker">
              {isArabic ? "الوصف" : "Description"}
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-800 dark:text-slate-200 sm:text-[15px]">
              {data.description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ElementPropereties;
