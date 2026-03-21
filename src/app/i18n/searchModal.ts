export type SearchModalLocale = "ar" | "en";

export const SEARCH_MODAL_TEXT = {
  title: {
    ar: "اكتشف بسهولة",
    en: "Discover with ease",
  },
  subtitle: {
    ar: "ابحث بثلاث خطوات بسيطة",
    en: "Search in 3 simple steps",
  },
  stepOneTitle: {
    ar: "ماذا تريد؟",
    en: "What are you looking for?",
  },
  stepTwoTitle: {
    ar: "اختر النوع المناسب",
    en: "Pick the right type",
  },
  stepThreeTitle: {
    ar: "أين تبحث؟",
    en: "Where are you searching?",
  },
  next: {
    ar: "التالي",
    en: "Next",
  },
  back: {
    ar: "رجوع",
    en: "Back",
  },
  search: {
    ar: "بحث",
    en: "Search",
  },
  allCountries: {
    ar: "الكل",
    en: "All",
  },
  exactCategory: {
    ar: "اختر الفئة الدقيقة",
    en: "Select exact category",
  },
  minPrice: {
    ar: "أدنى سعر",
    en: "Min price",
  },
  maxPrice: {
    ar: "أقصى سعر",
    en: "Max price",
  },
  city: {
    ar: "المدينة",
    en: "City",
  },
  searchCity: {
    ar: "ابحث عن مدينة...",
    en: "Search city...",
  },
  noCities: {
    ar: "لا توجد مدن",
    en: "No cities found",
  },
} as const;

export const SEARCH_ACTION_OPTIONS: Record<SearchModalLocale, string[]> = {
  ar: ["إيجار", "شراء"],
  en: ["Rent", "Buy"],
};

export const SEARCH_TYPE_OPTIONS: Record<SearchModalLocale, string[]> = {
  ar: ["عقارات", "سيارات جديدة", "سيارات مستعملة", "أخرى"],
  en: ["Real Estate", "New Cars", "Used Cars", "Others"],
};
