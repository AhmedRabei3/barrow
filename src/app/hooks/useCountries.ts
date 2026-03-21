import countries from "world-countries";

interface RawCountry {
  cca2: string;
  name: { common: string };
  flags?: { svg?: string };
  latlng?: [number, number];
  region?: string;
}

// علم فلسطين الرسمي SVG
const PALESTINE_FLAG =
  "https://upload.wikimedia.org/wikipedia/commons/0/00/Flag_of_Palestine.svg";

// الحصول على بيانات فلسطين من المكتبة الأصلية
const originalPalestine = (countries as RawCountry[]).find(
  (c) => c.cca2 === "PS"
);

// الحصول على بيانات إسرائيل فقط لأخذ الإحداثيات
const israelData = (countries as RawCountry[]).find(
  (c) => c.cca2 === "IL"
);

// الخطوة 1: تجهيز دولة فلسطين بعد تعديل مكانها ليكون مكان إسرائيل
const customPalestine = {
  value: "PS",
  label: "Palestine",
  flag: PALESTINE_FLAG,
  latlng: israelData?.latlng || originalPalestine?.latlng || [31.5, 34.8],
  region: originalPalestine?.region || "Asia",
};

// الخطوة 2: تجهيز باقي الدول مع استثناء IL
const formattedCountries = (countries as RawCountry[])
  .filter((c) => c.cca2 !== "IL") // حذف إسرائيل
  .map((country) => ({
    value: country.cca2,
    label: country.name?.common || "Unknown",
    flag: country.flags?.svg || "",
    latlng: country.latlng || [0, 0],
    region: country.region || "",
  }))
  // استبدال فلسطين بالنسخة المعدّلة
  .map((c) => (c.value === "PS" ? customPalestine : c));

const useCountries = () => {
  const getAll = () => formattedCountries;

  const getByValue = (value: string) => {
    if (value === "IL") return customPalestine;
    if (value === "PS") return customPalestine;
    return formattedCountries.find((item) => item.value === value) || null;
  };

  return { getAll, getByValue };
};

export default useCountries;
