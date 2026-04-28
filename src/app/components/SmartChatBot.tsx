"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { $Enums, Directions } from "@prisma/client";
import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import submitMethod from "@/app/utils/submiteMethod";
import categoryFetcher from "./category/CategoryFetcher";
import { FieldValues, useForm } from "react-hook-form";
import {
  createNewCarSchema,
  createMedicalDeviceSchema,
  createOtherItemSchema,
  createPropertySchema,
  createUsedCarSchema,
} from "@/app/validations";
import MapPicker from "./modals/mapPicker/MapPickerModal";
import { useAppPreferences } from "./providers/AppPreferencesProvider";
import { SMART_CHAT_EN_MAP, SMART_CHAT_TEXT } from "@/app/i18n/smartChat";
import { ASSISTANT_NAME_AR, ASSISTANT_NAME_EN } from "@/app/i18n/brand";
import { DynamicIcon } from "./addCategory/IconSetter";
import ImageUpload from "./imageUploader/ImageUpload";

type ItemType = $Enums.ItemType;

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  questionKey?: string;
  questionIndex?: number;
  questionLabel?: string;
  isEditableAnswer?: boolean;
};

type EditFieldEntry = Question & {
  index: number;
  displayValue: string;
};

type QuestionKind =
  | "text"
  | "number"
  | "select"
  | "boolean"
  | "multiselect"
  | "files"
  | "location";

type QuestionOption = {
  label: string;
  value: string;
};

type Question = {
  key: string;
  label: string;
  type: QuestionKind;
  required?: boolean;
  options?: QuestionOption[];
  placeholder?: string;
  condition?: (answers: FieldValues) => boolean;
};

type Category = {
  id: string;
  name: string;
};

type LocationSelection = {
  lat: number;
  lng: number;
  address: string;
  city: string;
  state: string;
  country: string;
};

const DEFAULT_MAP_CENTER: [number, number] = [34.8021, 38.9968];
const SMART_CHAT_EDIT_PAYLOAD_KEY = "smart-chat-edit-payload";
const SMART_CHAT_ACTION_ADD_ITEM = "ACTION_ADD_ITEM";
const SMART_CHAT_ACTION_SUBSCRIPTION = "ACTION_SUBSCRIPTION";

type SmartChatEditPayload =
  | {
      mode: "edit";
      itemType: ItemType;
      itemId?: string;
      data?: FieldValues;
    }
  | {
      mode: "create";
      action: typeof SMART_CHAT_ACTION_ADD_ITEM;
    };

type SubscriptionFaqOption = {
  labelAr: string;
  labelEn: string;
  value: string;
};

const SUBSCRIPTION_FAQ_OPTIONS: SubscriptionFaqOption[] = [
  {
    value: "SUB_BENEFITS",
    labelAr: "ما مزايا الاشتراك؟",
    labelEn: "What are subscription benefits?",
  },
  {
    value: "SUB_ACTIVATE",
    labelAr: "كيف أفعّل الحساب؟",
    labelEn: "How do I activate my account?",
  },
  {
    value: "SUB_GRACE",
    labelAr: "ما هي فترة السماح؟",
    labelEn: "What is the grace period?",
  },
  {
    value: "SUB_REFERRAL",
    labelAr: "كيف أربح من الدعوات؟",
    labelEn: "How do referrals earn me money?",
  },
  {
    value: "SUB_PENDING",
    labelAr: "متى أستلم الأرباح المعلقة؟",
    labelEn: "When do pending earnings get paid?",
  },
  {
    value: "SUB_INVITE",
    labelAr: "كيف أرسل رابط الدعوة؟",
    labelEn: "How do I share my invite link?",
  },
  {
    value: "SUB_WITHDRAW",
    labelAr: "كيف أسحب أرباحي؟",
    labelEn: "How do I withdraw my earnings?",
  },
  {
    value: "SUB_CODES",
    labelAr: "بلدي لا يدعم بوابات الدفع، كيف أشترك؟",
    labelEn:
      "My country doesn't support payment gateways, how can I subscribe?",
  },
];

const ITEM_TYPE_OPTIONS: QuestionOption[] = [
  { label: "🚗 سيارات جديدة", value: $Enums.ItemType.NEW_CAR },
  { label: "🚙 سيارات مستعملة", value: $Enums.ItemType.USED_CAR },
  { label: "🏠 عقارات", value: $Enums.ItemType.PROPERTY },
  { label: "🛋️ أثاث منزلي", value: $Enums.ItemType.HOME_FURNITURE },
  { label: "🩺 أجهزة طبية", value: $Enums.ItemType.MEDICAL_DEVICE },
  { label: "📦 أشياء أخرى", value: $Enums.ItemType.OTHER },
];

const ITEM_TYPE_LABELS: Record<ItemType, { ar: string; en: string }> = {
  NEW_CAR: { ar: "سيارة جديدة", en: "New car" },
  USED_CAR: { ar: "سيارة مستعملة", en: "Used car" },
  PROPERTY: { ar: "عقار", en: "Property" },
  HOME_FURNITURE: { ar: "أثاث منزلي", en: "Home furniture" },
  MEDICAL_DEVICE: { ar: "جهاز طبي", en: "Medical device" },
  OTHER: { ar: "عنصر آخر", en: "Other item" },
};

const BOOLEAN_OPTIONS: QuestionOption[] = [
  { label: "نعم", value: "true" },
  { label: "لا", value: "false" },
];

const RENT_OPTIONS: QuestionOption[] = [
  { label: "للبيع", value: "SELL" },
  { label: "للإيجار", value: "RENT" },
];

const RENT_TYPE_OPTIONS: QuestionOption[] = [
  { label: "يومي", value: "DAILY" },
  { label: "أسبوعي", value: "WEEKLY" },
  { label: "شهري", value: "MONTHLY" },
  { label: "سنوي", value: "YEARLY" },
];

const STATUS_OPTIONS: QuestionOption[] = [
  { label: "متاح", value: "AVAILABLE" },
  { label: "محجوز", value: "RESERVED" },
  { label: "مؤجر", value: "RENTED" },
  { label: "مباع", value: "SOLD" },
  { label: "صيانة", value: "MAINTENANCE" },
];

const FUEL_OPTIONS: QuestionOption[] = [
  { label: "بنزين", value: "GASOLINE" },
  { label: "ديزل", value: "DIESEL" },
  { label: "هجين", value: "HYBRID" },
  { label: "كهربائي", value: "ELECTRIC" },
];

const GEAR_OPTIONS: QuestionOption[] = [
  { label: "أوتوماتيك", value: "AUTOMATIC" },
  { label: "عادي", value: "MANUAL" },
];

const DIRECTION_OPTIONS: QuestionOption[] = (
  Object.values(Directions) as string[]
).map((direction) => ({
  label: direction,
  value: direction,
}));

const ROUTE_BY_TYPE: Record<ItemType, string> = {
  NEW_CAR: "/api/cars",
  USED_CAR: "/api/cars/used_car",
  PROPERTY: "/api/realestate",
  HOME_FURNITURE: "/api/homeFurniture",
  MEDICAL_DEVICE: "/api/medicalDevices",
  OTHER: "/api/otherItems",
};

const EDIT_ROUTE_BY_TYPE: Record<ItemType, string> = {
  NEW_CAR: "/api/cars/new_car",
  USED_CAR: "/api/cars/used_car",
  PROPERTY: "/api/realestate",
  HOME_FURNITURE: "/api/homeFurniture",
  MEDICAL_DEVICE: "/api/medicalDevices",
  OTHER: "/api/otherItems",
};

const SCHEMA_BY_TYPE = {
  NEW_CAR: createNewCarSchema,
  USED_CAR: createUsedCarSchema,
  PROPERTY: createPropertySchema,
  HOME_FURNITURE: createOtherItemSchema,
  MEDICAL_DEVICE: createMedicalDeviceSchema,
  OTHER: createOtherItemSchema,
} as const;

const FRIENDLY_WELCOME_PREFIXES = {
  ar: [`🌟 أهلاً بك مع ${ASSISTANT_NAME_AR}.`],
  en: [`🌟 Welcome to ${ASSISTANT_NAME_EN}.`],
} as const;

const locationQuestions: Question[] = [
  {
    key: "locationPicker",
    label: "اختر الموقع من الخريطة",
    type: "location",
    required: true,
  },
  {
    key: "address",
    label: "العنوان التفصيلي",
    type: "text",
    required: true,
    placeholder: "مثال: حي الملك فهد",
    condition: (answers) => !answers.address,
  },
  {
    key: "city",
    label: "المدينة",
    type: "text",
    required: true,
    placeholder: "مثال: الرياض",
    condition: (answers) => !answers.city,
  },
  {
    key: "state",
    label: "المنطقة/الولاية (اختياري)",
    type: "text",
    required: false,
    condition: (answers) => !answers.state,
  },
  {
    key: "country",
    label: "الدولة",
    type: "text",
    required: true,
    placeholder: "مثال: Saudi Arabia",
    condition: (answers) => !answers.country,
  },
  { key: "images", label: "ارفع صور الإعلان", type: "files", required: true },
];

const getQuestionsByType = (
  itemType: ItemType,
  categories: Category[],
): Question[] => {
  const categoryOptions = categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));

  const sharedStart: Question[] = [
    {
      key: "categoryId",
      label: "اختر الفئة المناسبة",
      type: "select",
      required: true,
      options: categoryOptions,
    },
  ];

  if (itemType === $Enums.ItemType.NEW_CAR) {
    return [
      ...sharedStart,
      {
        key: "brand",
        label: "ما هي ماركة السيارة؟",
        type: "text",
        required: true,
      },
      { key: "model", label: "ما هو الموديل؟", type: "text", required: true },
      { key: "year", label: "سنة الصنع", type: "number", required: true },
      { key: "color", label: "اللون", type: "text", required: true },
      { key: "price", label: "السعر", type: "number", required: true },
      {
        key: "sellOrRent",
        label: "نوع الإعلان",
        type: "select",
        required: true,
        options: RENT_OPTIONS,
      },
      {
        key: "rentType",
        label: "نوع الإيجار",
        type: "select",
        required: true,
        options: RENT_TYPE_OPTIONS,
        condition: (answers) => answers.sellOrRent === "RENT",
      },
      {
        key: "fuelType",
        label: "نوع الوقود",
        type: "select",
        required: true,
        options: FUEL_OPTIONS,
      },
      {
        key: "gearType",
        label: "نوع القير",
        type: "select",
        required: true,
        options: GEAR_OPTIONS,
      },
      {
        key: "status",
        label: "حالة الإعلان",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
      {
        key: "description",
        label: "الوصف (اختياري)",
        type: "text",
        required: false,
      },
      ...locationQuestions,
    ];
  }

  if (itemType === $Enums.ItemType.USED_CAR) {
    return [
      ...sharedStart,
      {
        key: "brand",
        label: "ما هي ماركة السيارة؟",
        type: "text",
        required: true,
      },
      { key: "model", label: "ما هو الموديل؟", type: "text", required: true },
      { key: "year", label: "سنة الصنع", type: "number", required: true },
      { key: "color", label: "اللون", type: "text", required: false },
      { key: "mileage", label: "الممشى (كم)", type: "number", required: true },
      { key: "price", label: "السعر", type: "number", required: true },
      {
        key: "repainted",
        label: "هل السيارة مرشوشة؟",
        type: "boolean",
        required: true,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "reAssembled",
        label: "هل السيارة مفككة/مركبة؟",
        type: "boolean",
        required: true,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "sellOrRent",
        label: "نوع الإعلان",
        type: "select",
        required: true,
        options: RENT_OPTIONS,
      },
      {
        key: "rentType",
        label: "نوع الإيجار",
        type: "select",
        required: true,
        options: RENT_TYPE_OPTIONS,
        condition: (answers) => answers.sellOrRent === "RENT",
      },
      {
        key: "fuelType",
        label: "نوع الوقود",
        type: "select",
        required: true,
        options: FUEL_OPTIONS,
      },
      {
        key: "gearType",
        label: "نوع القير",
        type: "select",
        required: true,
        options: GEAR_OPTIONS,
      },
      {
        key: "status",
        label: "حالة الإعلان",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
      {
        key: "description",
        label: "الوصف (اختياري)",
        type: "text",
        required: false,
      },
      ...locationQuestions,
    ];
  }

  if (itemType === $Enums.ItemType.PROPERTY) {
    return [
      ...sharedStart,
      { key: "title", label: "عنوان الإعلان", type: "text", required: true },
      { key: "price", label: "السعر", type: "number", required: true },
      {
        key: "sellOrRent",
        label: "نوع الإعلان",
        type: "select",
        required: true,
        options: RENT_OPTIONS,
      },
      {
        key: "rentType",
        label: "نوع الإيجار",
        type: "select",
        required: true,
        options: RENT_TYPE_OPTIONS,
        condition: (answers) => answers.sellOrRent === "RENT",
      },
      {
        key: "guests",
        label: "عدد الضيوف",
        type: "number",
        required: false,
        condition: (answers) => answers.sellOrRent === "RENT",
      },
      {
        key: "livingrooms",
        label: "عدد غرف المعيشة",
        type: "number",
        required: true,
      },
      {
        key: "bathrooms",
        label: "عدد الحمامات",
        type: "number",
        required: true,
      },
      {
        key: "bedrooms",
        label: "عدد غرف النوم",
        type: "number",
        required: true,
      },
      { key: "kitchens", label: "عدد المطابخ", type: "number", required: true },
      { key: "area", label: "المساحة", type: "number", required: true },
      { key: "floor", label: "رقم الطابق", type: "number", required: true },
      {
        key: "direction",
        label: "اختر اتجاه العقار (يمكن اختيار أكثر من اتجاه)",
        type: "multiselect",
        required: true,
        options: DIRECTION_OPTIONS,
      },
      {
        key: "petAllowed",
        label: "هل الحيوانات الأليفة مسموحة؟",
        type: "boolean",
        required: false,
        options: BOOLEAN_OPTIONS,
        condition: (answers) => answers.sellOrRent === "RENT",
      },
      {
        key: "furnished",
        label: "هل العقار مفروش؟",
        type: "boolean",
        required: true,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "elvator",
        label: "هل يوجد مصعد؟",
        type: "boolean",
        required: true,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "status",
        label: "حالة الإعلان",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
      {
        key: "description",
        label: "الوصف (اختياري)",
        type: "text",
        required: false,
      },
      ...locationQuestions,
    ];
  }

  if (itemType === $Enums.ItemType.HOME_FURNITURE) {
    return [
      ...sharedStart,
      { key: "name", label: "اسم قطعة الأثاث", type: "text", required: true },
      {
        key: "brand",
        label: "العلامة التجارية أو الورشة (اختياري)",
        type: "text",
        required: false,
      },
      { key: "price", label: "السعر", type: "number", required: true },
      {
        key: "sellOrRent",
        label: "نوع الإعلان",
        type: "select",
        required: true,
        options: RENT_OPTIONS,
      },
      {
        key: "rentType",
        label: "نوع الإيجار",
        type: "select",
        required: true,
        options: RENT_TYPE_OPTIONS,
        condition: (answers) => answers.sellOrRent === "RENT",
      },
      {
        key: "condition",
        label: "حالة الأثاث",
        type: "text",
        required: true,
      },
      {
        key: "material",
        label: "الخامة",
        type: "text",
        required: false,
      },
      {
        key: "roomType",
        label: "الغرفة المناسبة",
        type: "text",
        required: false,
      },
      {
        key: "dimensions",
        label: "الأبعاد",
        type: "text",
        required: false,
      },
      { key: "color", label: "اللون", type: "text", required: false },
      {
        key: "assemblyIncluded",
        label: "هل يشمل التركيب؟",
        type: "boolean",
        required: false,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "isUsed",
        label: "هل الأثاث مستعمل؟",
        type: "boolean",
        required: true,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "status",
        label: "حالة الإعلان",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
      {
        key: "description",
        label: "الوصف (اختياري)",
        type: "text",
        required: false,
      },
      ...locationQuestions,
    ];
  }

  if (itemType === $Enums.ItemType.MEDICAL_DEVICE) {
    return [
      ...sharedStart,
      { key: "name", label: "اسم الجهاز", type: "text", required: true },
      {
        key: "manufacturer",
        label: "الشركة الصانعة",
        type: "text",
        required: true,
      },
      {
        key: "model",
        label: "الموديل أو الرقم المرجعي",
        type: "text",
        required: true,
      },
      {
        key: "deviceFunction",
        label: "ما وظيفة الجهاز؟",
        type: "text",
        required: true,
      },
      {
        key: "manufactureYear",
        label: "سنة التصنيع",
        type: "number",
        required: true,
      },
      { key: "price", label: "السعر", type: "number", required: true },
      {
        key: "sellOrRent",
        label: "نوع الإعلان",
        type: "select",
        required: true,
        options: RENT_OPTIONS,
      },
      {
        key: "rentType",
        label: "نوع الإيجار",
        type: "select",
        required: true,
        options: RENT_TYPE_OPTIONS,
        condition: (answers) => answers.sellOrRent === "RENT",
      },
      {
        key: "condition",
        label: "وصف حالة الجهاز (اختياري)",
        type: "text",
        required: false,
      },
      {
        key: "dimensions",
        label: "الأبعاد",
        type: "text",
        required: true,
      },
      {
        key: "weight",
        label: "الوزن",
        type: "text",
        required: true,
      },
      {
        key: "manufacturerPlace",
        label: "مكان التصنيع",
        type: "text",
        required: true,
      },
      {
        key: "isUsed",
        label: "هل الجهاز جديد أم مستعمل؟ اختر نعم إذا كان مستعملًا",
        type: "boolean",
        required: true,
        options: BOOLEAN_OPTIONS,
      },
      {
        key: "warrantyMonths",
        label: "مدة الضمان بالأشهر",
        type: "number",
        required: false,
      },
      {
        key: "usageHours",
        label: "ساعات الاستخدام",
        type: "number",
        required: false,
      },
      {
        key: "status",
        label: "حالة الإعلان",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
      },
      {
        key: "description",
        label: "الوصف (اختياري)",
        type: "text",
        required: false,
      },
      ...locationQuestions,
    ];
  }

  return [
    ...sharedStart,
    { key: "name", label: "اسم العنصر", type: "text", required: true },
    { key: "brand", label: "العلامة التجارية", type: "text", required: true },
    { key: "price", label: "السعر", type: "number", required: true },
    {
      key: "sellOrRent",
      label: "نوع الإعلان",
      type: "select",
      required: true,
      options: RENT_OPTIONS,
    },
    {
      key: "rentType",
      label: "نوع الإيجار",
      type: "select",
      required: true,
      options: RENT_TYPE_OPTIONS,
      condition: (answers) => answers.sellOrRent === "RENT",
    },
    {
      key: "status",
      label: "حالة الإعلان",
      type: "select",
      required: true,
      options: STATUS_OPTIONS,
    },
    {
      key: "description",
      label: "الوصف (اختياري)",
      type: "text",
      required: false,
    },
    ...locationQuestions,
  ];
};

const normalizeAnswer = (
  question: Question,
  rawValue: string | string[] | File[] | LocationSelection,
) => {
  if (question.type === "number") {
    return Number(rawValue);
  }

  if (question.type === "boolean") {
    if (typeof rawValue === "string") {
      return rawValue === "true";
    }
    return Boolean(rawValue);
  }

  if (question.type === "multiselect") {
    return Array.isArray(rawValue) ? rawValue : [];
  }

  return rawValue;
};

const getSubscriptionAnswerByKey = (key: string, isArabic: boolean) => {
  const answerMap: Record<string, { ar: string; en: string }> = {
    SUB_BENEFITS: {
      ar: "القدرة على الإعلان عبر المنصة \n تحصل على رابط خاص بك تدعو الآخرين من خلاله للاشتراك : \n يحصل المشتركون من خلال رابطك على حسم للاشتراك الأول 10% \n تحصل على 60% من قيمة الاشتراك لأول 10 مشتركين، 40% من 11-20، 30% من 21-30، و20% لما فوق ذلك \n مع كل تجديد للاشتراك، تنتقل الأرباح المعلقة إلى رصيدك الجاهز للسحب.",
      en: "✨ The subscription make you able to list throw platform and earn from referrals. \n You get a unique invite link that offers new subscribers a 10% discount on their first subscription. You earn 60% of the subscription fee for your first 10 referrals, 40% for referrals 11-20, 30% for referrals 21-30, and 20% for any referrals beyond that.\n With each subscription renewal, your pending earnings move to your balance, ready for withdrawal.",
    },
    SUB_ACTIVATE: {
      ar: "🔐 تفعيل الحساب بسيط: عبر شام كاش أو باستخدام كود تفعيل رسمي. بعد التأكيد مباشرة يتفعل حسابك لمدة 30 يومًا وتحصل على المزايا الكاملة فورًا.",
      en: "🔐 Activation is simple: use ShamCash or an official activation code. Once confirmed, your account is active for 30 days and you start getting full benefits immediately.",
    },
    SUB_GRACE: {
      ar: "⏳ بعد انتهاء الاشتراك لديك فترة لمدة 15 يومًا لتجديد الاشتراك",
      en: "⏳ After subscription expiry, you have a 15-day period for renewal.",
    },
    SUB_REFERRAL: {
      ar: "💸 بدعوتك الآخرين تحصل على 60% من اشتراك أول 10 مشتركين وعلى نسبة 40% للمشتركين العشرة التالين، 30% من 21 - 30مشترك و 20% لمافوق ذلك وذلك كلما جددوا اشتراكهم أي أن أرباحك الشهرية شبه ثابتة",
      en: "💸 By inviting others, you earn 60% from the subscription of the first 10 subscribers, 40% from the next 10 subscribers, 30% from 21-30 subscribers, and 20% for any beyond that, each time they renew their subscription, meaning your monthly earnings are almost stable.",
    },
    SUB_PENDING: {
      ar: "💰 الأرباح المعلقة تُضاف إلى رصيدك عند تجديد الاشتراك. وإذا تجاوزت فترة اعادة التجديد، تفقد الأرباح المعلقة.",
      en: "💰 Pending earnings are transferred to your balance when you renew your subscription. If you pass the grace period without renewal, pending earnings may be lost.",
    },
    SUB_INVITE: {
      ar: "🔗 من خيار دعوة الأصدقاء يتم إنشاء رابطك الخاص (?ref=معرفك). شارك الرابط، وعند التسجيل ثم التفعيل من خلاله تُحتسب الإحالة لك تلقائيًا.",
      en: "🔗 From the invite-friends option, your personal link is generated (?ref=yourId). Share it; when others register and activate through it, the referral is credited to you.",
    },
    SUB_WITHDRAW: {
      ar: "🏦 تتجمع أرباحك في الرصيد، وعند الجاهزية يمكنك طلب السحب بسهولة من قسم الرصيد. الاشتراك والسحب يتمان عبر شام كاش ووسائل محلية معتمدة حسب بلدك.",
      en: "🏦 Your earnings accumulate in your balance, and when ready you can request payout easily from the balance section. Subscription and withdrawals run through ShamCash and approved local methods based on your country.",
    },
    SUB_CODES: {
      ar: "🌍 حتى لو كان بلدك لا يدعم بوابات الدفع (مثل سوريا)، يبقى الاشتراك متاحًا عبر أكواد التفعيل الرسمية المباعة محليًا. اشترِ الكود، أدخله في صفحة التفعيل، وابدأ الاستفادة فورًا.",
      en: "🌍 Even if your country does not support payment gateways (such as Syria), you can still subscribe through official activation codes sold locally. Buy a code, enter it on the activation page, and start benefiting instantly with no hassle.",
    },
  };

  const item = answerMap[key];
  return item ? (isArabic ? item.ar : item.en) : null;
};

const getSubscriptionAnswerByQuestion = (
  question: string,
  isArabic: boolean,
) => {
  const text = question.toLowerCase();

  if (text.includes("مزايا") || text.includes("benefit")) {
    return getSubscriptionAnswerByKey("SUB_BENEFITS", isArabic);
  }

  if (
    text.includes("تفعيل") ||
    text.includes("activate") ||
    text.includes("activation") ||
    text.includes("كود") ||
    text.includes("code")
  ) {
    return getSubscriptionAnswerByKey("SUB_ACTIVATE", isArabic);
  }

  if (text.includes("سماح") || text.includes("grace")) {
    return getSubscriptionAnswerByKey("SUB_GRACE", isArabic);
  }

  if (
    text.includes("دعوة") ||
    text.includes("إحالة") ||
    text.includes("referral") ||
    text.includes("invite")
  ) {
    return getSubscriptionAnswerByKey("SUB_REFERRAL", isArabic);
  }

  if (
    text.includes("معلقة") ||
    text.includes("pending") ||
    text.includes("أرباح")
  ) {
    return getSubscriptionAnswerByKey("SUB_PENDING", isArabic);
  }

  if (text.includes("رابط") || text.includes("link")) {
    return getSubscriptionAnswerByKey("SUB_INVITE", isArabic);
  }

  if (
    text.includes("سحب") ||
    text.includes("withdraw") ||
    text.includes("payout") ||
    text.includes("wallet") ||
    text.includes("shamcash") ||
    text.includes("شام كاش")
  ) {
    return getSubscriptionAnswerByKey("SUB_WITHDRAW", isArabic);
  }

  if (
    text.includes("سوريا") ||
    text.includes("بلدي") ||
    text.includes("بوابات") ||
    text.includes("payment gateway") ||
    text.includes("unsupported") ||
    text.includes("غير مدعوم")
  ) {
    return getSubscriptionAnswerByKey("SUB_CODES", isArabic);
  }

  return null;
};

interface SmartChatBotProps {
  onClose?: () => void;
}

const SmartChatBot = ({ onClose }: SmartChatBotProps) => {
  const { isArabic } = useAppPreferences();
  const router = useRouter();
  const { reset } = useForm<FieldValues>();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastWelcomeIndexRef = useRef<number>(-1);

  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const tc = useCallback(
    (key: keyof typeof SMART_CHAT_TEXT) =>
      isArabic ? SMART_CHAT_TEXT[key].ar : SMART_CHAT_TEXT[key].en,
    [isArabic],
  );

  const translate = useCallback(
    (text: string) => {
      if (isArabic) return text;

      return SMART_CHAT_EN_MAP[text] ?? text;
    },
    [isArabic],
  );

  const getFriendlyGreeting = useCallback(() => {
    const baseGreeting = tc("greeting");
    const prefixes = isArabic
      ? FRIENDLY_WELCOME_PREFIXES.ar
      : FRIENDLY_WELCOME_PREFIXES.en;

    if (!prefixes.length) {
      return baseGreeting;
    }

    const randomIndex = Math.floor(Math.random() * prefixes.length);
    const hasAlternatives = prefixes.length > 1;
    const nextIndex =
      hasAlternatives && randomIndex === lastWelcomeIndexRef.current
        ? (randomIndex + 1) % prefixes.length
        : randomIndex;

    lastWelcomeIndexRef.current = nextIndex;
    return `${prefixes[nextIndex]}\n\n${baseGreeting}`;
  }, [isArabic, tc]);

  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [assistantMode, setAssistantMode] = useState<
    "home" | "add-item" | "subscription"
  >("home");
  const [categories, setCategories] = useState<Category[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      role: "assistant",
      content: getFriendlyGreeting(),
    },
  ]);
  const [answers, setAnswers] = useState<FieldValues>({});
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedLocation, setSelectedLocation] =
    useState<LocationSelection | null>(null);
  const [mapInitialCenter, setMapInitialCenter] =
    useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [textInput, setTextInput] = useState("");
  const [subscriptionQuestion, setSubscriptionQuestion] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadyToSubmit, setIsReadyToSubmit] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [selectedEditableFieldKey, setSelectedEditableFieldKey] = useState<
    string | null
  >(null);
  const [selectedEditableMessageId, setSelectedEditableMessageId] = useState<
    string | null
  >(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [viewportMetrics, setViewportMetrics] = useState<{
    height: number | null;
    keyboardOpen: boolean;
  }>({
    height: null,
    keyboardOpen: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(SMART_CHAT_EDIT_PAYLOAD_KEY);
    if (!raw) return;

    try {
      const payload = JSON.parse(raw) as SmartChatEditPayload;

      if (payload.mode === "create") {
        if (payload.action !== SMART_CHAT_ACTION_ADD_ITEM) {
          window.localStorage.removeItem(SMART_CHAT_EDIT_PAYLOAD_KEY);
          return;
        }

        setAssistantMode("add-item");
        setItemType(null);
        setEditItemId(null);
        setAnswers({});
        setSelectedImages([]);
        setSelectedLocation(null);
        setMapInitialCenter(DEFAULT_MAP_CENTER);
        setTextInput("");
        setSubscriptionQuestion("");
        setIsReadyToSubmit(false);
        setActiveIndex(0);
        setMessages([
          {
            id: "create-init-1",
            role: "assistant",
            content: t(
              "ممتاز 👌 تم فتح المساعد في وضع الإضافة. اختر نوع العنصر الذي تريد نشره الآن:",
              "Great 👌 the assistant is now in add mode. Choose the item type you want to publish now:",
            ),
          },
        ]);
        return;
      }

      if (payload.mode !== "edit" || !payload.itemType || !payload.itemId) {
        window.localStorage.removeItem(SMART_CHAT_EDIT_PAYLOAD_KEY);
        return;
      }

      setItemType(payload.itemType);
      setAssistantMode("add-item");
      setEditItemId(payload.itemId);

      const nextAnswers: FieldValues = {
        ...(payload.data || {}),
        itemType: payload.itemType,
      };
      setAnswers(nextAnswers);

      if (nextAnswers.latitude && nextAnswers.longitude) {
        const selected: LocationSelection = {
          lat: Number(nextAnswers.latitude),
          lng: Number(nextAnswers.longitude),
          address: String(nextAnswers.address || ""),
          city: String(nextAnswers.city || ""),
          state: String(nextAnswers.state || ""),
          country: String(nextAnswers.country || ""),
        };
        setSelectedLocation(selected);
        setMapInitialCenter([selected.lat, selected.lng]);
      }

      setIsReadyToSubmit(true);
      setActiveIndex(0);
      setMessages([
        {
          id: "edit-init-1",
          role: "assistant",
          content: t(
            "😊 راجع الإجابات ثم اضغط على حفظ التعديلات.",
            "😊 Review your answers then click Save changes.",
          ),
        },
        {
          id: "edit-init-2",
          role: "assistant",
          content: t(
            "يمكنك الضغط على حفظ التعديلات مباشرة أو الرجوع لتعديل أي إجابة.",
            "You can save now or go back to edit any answer.",
          ),
        },
      ]);
    } catch {
      // ignore invalid payload
    } finally {
      window.localStorage.removeItem(SMART_CHAT_EDIT_PAYLOAD_KEY);
    }
  }, [t]);

  const questions = useMemo(() => {
    if (!itemType || assistantMode !== "add-item") return [];
    return getQuestionsByType(itemType, categories).map((question) => ({
      ...question,
      label: translate(question.label),
      placeholder: question.placeholder
        ? translate(question.placeholder)
        : question.placeholder,
      options: question.options?.map((option) => ({
        ...option,
        label: translate(option.label),
      })),
    }));
  }, [itemType, categories, translate, assistantMode]);

  const currentQuestion = useMemo(() => {
    if (!itemType) return null;

    for (let index = activeIndex; index < questions.length; index += 1) {
      const question = questions[index];
      if (!question.condition || question.condition(answers)) {
        return { ...question, index };
      }
    }
    return null;
  }, [activeIndex, answers, itemType, questions]);

  const editItemSummary = useMemo(() => {
    if (!editItemId || !itemType) return null;

    const typeLabel = isArabic
      ? ITEM_TYPE_LABELS[itemType].ar
      : ITEM_TYPE_LABELS[itemType].en;

    const nameCandidate =
      answers.title ||
      answers.name ||
      (answers.brand && answers.model
        ? `${answers.brand} ${answers.model}`
        : answers.brand || answers.model);

    const displayName =
      nameCandidate && String(nameCandidate).trim().length > 0
        ? String(nameCandidate)
        : `#${editItemId.slice(-6)}`;

    return {
      typeLabel,
      displayName,
    };
  }, [answers, editItemId, isArabic, itemType]);

  const editFieldOptions = useMemo(() => {
    if (!editItemId || !isReadyToSubmit) return [];

    return questions
      .map((question, index) => ({ ...question, index }))
      .filter((question) => {
        if (question.key === "locationPicker") return true;
        return !question.condition || question.condition(answers);
      });
  }, [answers, editItemId, isReadyToSubmit, questions]);

  const getQuestionAnswerDisplay = useCallback(
    (question: Question, sourceAnswers: FieldValues) => {
      const emptyValueText = t(
        "لم يتم تحديد قيمة بعد",
        "No value selected yet",
      );

      if (question.type === "location") {
        const address = String(sourceAnswers.address || "").trim();
        const latitude = sourceAnswers.latitude;
        const longitude = sourceAnswers.longitude;

        if (address) {
          return `📍 ${address}`;
        }

        if (latitude !== undefined && longitude !== undefined) {
          return `📍 ${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
        }

        return emptyValueText;
      }

      const rawValue = sourceAnswers[question.key];

      if (
        rawValue === undefined ||
        rawValue === null ||
        (typeof rawValue === "string" && rawValue.trim() === "")
      ) {
        if (question.type === "files") {
          return selectedImages.length > 0
            ? t(
                `${selectedImages.length} صورة مرفقة`,
                `${selectedImages.length} attached image${selectedImages.length === 1 ? "" : "s"}`,
              )
            : emptyValueText;
        }

        return emptyValueText;
      }

      if (question.type === "boolean") {
        return rawValue ? t("نعم", "Yes") : t("لا", "No");
      }

      if (question.type === "select") {
        return (
          question.options?.find((option) => option.value === String(rawValue))
            ?.label ?? String(rawValue)
        );
      }

      if (question.type === "multiselect") {
        if (!Array.isArray(rawValue) || rawValue.length === 0) {
          return emptyValueText;
        }

        return rawValue
          .map(
            (value) =>
              question.options?.find((option) => option.value === String(value))
                ?.label ?? String(value),
          )
          .join(isArabic ? "، " : ", ");
      }

      if (question.type === "files") {
        const imageCount = Array.isArray(rawValue) ? rawValue.length : 0;
        if (imageCount === 0) {
          return emptyValueText;
        }

        return t(
          `${imageCount} صورة مرفقة`,
          `${imageCount} attached image${imageCount === 1 ? "" : "s"}`,
        );
      }

      return String(rawValue);
    },
    [isArabic, selectedImages.length, t],
  );

  const editFieldEntries = useMemo<EditFieldEntry[]>(() => {
    if (!editItemId || !isReadyToSubmit) return [];

    return editFieldOptions.map((field) => ({
      ...field,
      displayValue: getQuestionAnswerDisplay(field, answers),
    }));
  }, [
    answers,
    editFieldOptions,
    editItemId,
    getQuestionAnswerDisplay,
    isReadyToSubmit,
  ]);

  useEffect(() => {
    if (!itemType) {
      setCategories([]);
      return;
    }

    categoryFetcher({
      type: itemType,
      setList: (list) => {
        const nextList = typeof list === "function" ? list([]) : list;
        setCategories(
          nextList.map((entry) => ({ id: entry.id, name: entry.name })),
        );
      },
    });
  }, [itemType]);

  useEffect(() => {
    if (!isReadyToSubmit) {
      setSelectedEditableFieldKey(null);
    }
  }, [isReadyToSubmit]);

  useEffect(() => {
    if (isReadyToSubmit) return;
    if (!currentQuestion) return;

    setMessages((prev) => {
      const alreadyExists = prev.some(
        (msg) =>
          msg.role === "assistant" && msg.content === currentQuestion.label,
      );
      if (alreadyExists) return prev;
      return [
        ...prev,
        {
          id: `q-${currentQuestion.index}`,
          role: "assistant",
          content: currentQuestion.label,
        },
      ];
    });
  }, [currentQuestion, isReadyToSubmit]);

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    messagesContainerRef.current.scrollTo({
      top: messagesContainerRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (currentQuestion?.type !== "location") return;
    if (selectedLocation) {
      setMapInitialCenter([selectedLocation.lat, selectedLocation.lng]);
      return;
    }

    if (typeof window === "undefined" || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapInitialCenter([coords.latitude, coords.longitude]);
      },
      () => {
        setMapInitialCenter(DEFAULT_MAP_CENTER);
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
        maximumAge: 60000,
      },
    );
  }, [currentQuestion?.type, selectedLocation]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const visualViewport = window.visualViewport;

    const syncViewportMetrics = () => {
      const layoutHeight = window.innerHeight;
      const visibleHeight = visualViewport?.height ?? layoutHeight;

      setViewportMetrics({
        height: Math.round(visibleHeight),
        keyboardOpen: layoutHeight - visibleHeight > 120,
      });
    };

    syncViewportMetrics();

    window.addEventListener("resize", syncViewportMetrics);
    visualViewport?.addEventListener("resize", syncViewportMetrics);
    visualViewport?.addEventListener("scroll", syncViewportMetrics);

    return () => {
      window.removeEventListener("resize", syncViewportMetrics);
      visualViewport?.removeEventListener("resize", syncViewportMetrics);
      visualViewport?.removeEventListener("scroll", syncViewportMetrics);
    };
  }, []);

  const pushUserMessage = (content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        role: "user",
        content,
      },
    ]);
  };

  const upsertUserAnswerMessage = useCallback(
    (
      content: string,
      question: Question & { index: number },
      messageId?: string | null,
    ) => {
      const nextMessage: ChatMessage = {
        id: messageId || `${Date.now()}-${Math.random()}`,
        role: "user",
        content,
        questionKey: question.key,
        questionIndex: question.index,
        questionLabel: question.label,
        isEditableAnswer: true,
      };

      setMessages((prev) => {
        if (!messageId) {
          return [...prev, nextMessage];
        }

        return prev.map((message) =>
          message.id === messageId ? { ...message, ...nextMessage } : message,
        );
      });
    },
    [],
  );

  const getNextVisibleIndex = (
    startFrom: number,
    sourceAnswers: FieldValues,
  ) => {
    let nextIndex = startFrom + 1;
    while (nextIndex < questions.length) {
      const candidate = questions[nextIndex];
      if (!candidate.condition || candidate.condition(sourceAnswers))
        return nextIndex;
      nextIndex += 1;
    }
    return -1;
  };

  const getPreviousVisibleIndex = (
    startFrom: number,
    sourceAnswers: FieldValues,
  ) => {
    let prevIndex = startFrom - 1;
    while (prevIndex >= 0) {
      const candidate = questions[prevIndex];
      if (!candidate.condition || candidate.condition(sourceAnswers))
        return prevIndex;
      prevIndex -= 1;
    }
    return -1;
  };

  const moveToNextQuestion = (
    startFrom: number,
    sourceAnswers: FieldValues,
  ) => {
    const nextIndex = getNextVisibleIndex(startFrom, sourceAnswers);

    if (nextIndex === -1) {
      setIsReadyToSubmit(true);
      setActiveIndex(questions.length);
      setMessages((prev) => {
        const text = t(
          SMART_CHAT_TEXT.readyToSubmit.ar,
          SMART_CHAT_TEXT.readyToSubmit.en,
        );
        if (
          prev.some(
            (message) =>
              message.role === "assistant" && message.content === text,
          )
        ) {
          return prev;
        }

        return [
          ...prev,
          {
            id: `ready-${Date.now()}`,
            role: "assistant",
            content: text,
          },
        ];
      });
      return;
    }

    setIsReadyToSubmit(false);
    setActiveIndex(nextIndex);
  };

  const validateBeforeSubmit = (payload: FieldValues) => {
    if (!itemType)
      return {
        ok: false,
        message: tc("itemTypeMissing"),
      };

    const schema = SCHEMA_BY_TYPE[itemType];
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      return {
        ok: false,
        message: parsed.error.issues[0]?.message || tc("invalidData"),
      };
    }

    return { ok: true, message: "" };
  };

  const resetConversation = () => {
    setItemType(null);
    setAssistantMode("home");
    setEditItemId(null);
    setSelectedEditableFieldKey(null);
    setSelectedEditableMessageId(null);
    setEditingMessageId(null);
    setCategories([]);
    setAnswers({});
    setSelectedImages([]);
    setSelectedLocation(null);
    setMapInitialCenter(DEFAULT_MAP_CENTER);
    setTextInput("");
    setActiveIndex(0);
    setIsReadyToSubmit(false);
    setMessages([
      {
        id: "init-1",
        role: "assistant",
        content: getFriendlyGreeting(),
      },
    ]);
  };

  const handleSubmitFinal = async (sourceAnswers: FieldValues = answers) => {
    if (!itemType) return;

    const payload: FieldValues = {
      ...sourceAnswers,
      itemType,
      rentType:
        sourceAnswers.sellOrRent === "RENT" ? sourceAnswers.rentType : null,
    };

    const validation = validateBeforeSubmit(payload);
    if (!validation.ok) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          content: `❌ ${validation.message}`,
        },
      ]);
      return;
    }

    const isEditMode = Boolean(editItemId);
    const editRoute = EDIT_ROUTE_BY_TYPE[itemType];

    if (isEditMode && !editItemId) {
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-edit-not-supported`,
          role: "assistant",
          content: t(
            "❌ تعذّر تحديد العنصر المراد تعديله.",
            "❌ Could not determine the item to edit.",
          ),
        },
      ]);
      return;
    }

    await submitMethod({
      selectedImages,
      data: payload,
      setIsLoading,
      url: isEditMode ? `${editRoute}/${editItemId}` : ROUTE_BY_TYPE[itemType],
      onClose: () => {
        resetConversation();
        onClose?.();
      },
      reset,
      method: isEditMode ? "PATCH" : "POST",
      router,
    });
  };

  const handleAnswer = async (
    rawValue: string | string[] | File[] | LocationSelection,
  ) => {
    if (!itemType) {
      if (
        typeof rawValue === "string" &&
        rawValue === SMART_CHAT_ACTION_ADD_ITEM
      ) {
        pushUserMessage(t("إضافة عنصر جديد", "Add a new item"));
        setAssistantMode("add-item");
        setMessages((prev) => [
          ...prev,
          {
            id: `add-item-start-${Date.now()}`,
            role: "assistant",
            content: t(
              "ممتاز 👌 لنبدأ بالنشر. اختر نوع العنصر الذي تريد إضافته:",
              "Great 👌 choose the item type you want to add:",
            ),
          },
        ]);
        return;
      }

      if (
        typeof rawValue === "string" &&
        rawValue === SMART_CHAT_ACTION_SUBSCRIPTION
      ) {
        pushUserMessage(t("الاشتراك وطرق الربح", "Subscription & earnings"));
        setAssistantMode("subscription");
        setMessages((prev) => [
          ...prev,
          {
            id: `subscription-start-${Date.now()}`,
            role: "assistant",
            content: t(
              "رائع ✨ اسألني عن الاشتراك والدعوات والأرباح، أو اختر سؤالًا سريعًا من القائمة.",
              "Great ✨ ask me anything about subscription, referrals, and earnings, or choose a quick question below.",
            ),
          },
        ]);
        return;
      }

      if (typeof rawValue === "string" && rawValue.startsWith("SUB_")) {
        const faq = SUBSCRIPTION_FAQ_OPTIONS.find(
          (option) => option.value === rawValue,
        );
        const label = faq ? (isArabic ? faq.labelAr : faq.labelEn) : rawValue;

        pushUserMessage(label);
        const answer = getSubscriptionAnswerByKey(rawValue, isArabic);
        if (answer) {
          setMessages((prev) => [
            ...prev,
            {
              id: `sub-faq-${Date.now()}`,
              role: "assistant",
              content: answer,
            },
          ]);
        }
        return;
      }

      const selectedType = rawValue as ItemType;
      const label =
        ITEM_TYPE_OPTIONS.find((option) => option.value === selectedType)
          ?.label ?? selectedType;
      pushUserMessage(label);
      setItemType(selectedType);
      setAssistantMode("add-item");
      setAnswers((prev) => ({ ...prev, itemType: selectedType }));
      setIsReadyToSubmit(false);
      setActiveIndex(0);
      return;
    }

    if (!currentQuestion) {
      await handleSubmitFinal(answers);
      return;
    }

    let nextAnswers = { ...answers };
    const targetMessageId = editingMessageId;

    if (currentQuestion.type === "location") {
      const picked = rawValue as LocationSelection;

      nextAnswers = {
        ...nextAnswers,
        latitude: picked.lat,
        longitude: picked.lng,
        address: picked.address || nextAnswers.address || "",
        city: picked.city || nextAnswers.city || "",
        state: picked.state || nextAnswers.state || "",
        country: picked.country || nextAnswers.country || "",
      };
      upsertUserAnswerMessage(
        getQuestionAnswerDisplay(currentQuestion, nextAnswers),
        currentQuestion,
        targetMessageId,
      );
      setSelectedLocation(picked);
    } else {
      const normalized = normalizeAnswer(currentQuestion, rawValue);
      nextAnswers = {
        ...nextAnswers,
        [currentQuestion.key]: normalized,
      };

      upsertUserAnswerMessage(
        getQuestionAnswerDisplay(currentQuestion, nextAnswers),
        currentQuestion,
        targetMessageId,
      );

      if (currentQuestion.key === "images") {
        setSelectedImages(rawValue as File[]);
      }
    }

    setAnswers(nextAnswers);
    setEditingMessageId(null);
    setSelectedEditableMessageId(null);
    setSelectedEditableFieldKey(null);

    if (editItemId) {
      setIsReadyToSubmit(true);
      setActiveIndex(questions.length);
      setTextInput("");
      setMessages((prev) => [
        ...prev,
        {
          id: `edit-followup-${Date.now()}`,
          role: "assistant",
          content: t(
            "✅ تم تحديث هذا الحقل. هل ترغب بتعديل شيء آخر أم تريد إلغاء التعديل؟ يمكنك أيضًا الضغط على حفظ التعديلات الآن.",
            "✅ This field is updated. Do you want to edit something else or cancel editing? You can also save changes now.",
          ),
        },
      ]);
      return;
    }

    moveToNextQuestion(currentQuestion.index, nextAnswers);
  };

  const handleNavigatePrevious = () => {
    if (!itemType) return;

    const startFrom = currentQuestion?.index ?? questions.length;
    const previousIndex = getPreviousVisibleIndex(startFrom, answers);
    if (previousIndex === -1) return;

    setIsReadyToSubmit(false);
    setActiveIndex(previousIndex);

    const previousQuestion = questions[previousIndex];
    if (
      previousQuestion.type === "text" ||
      previousQuestion.type === "number"
    ) {
      const existing = answers[previousQuestion.key];
      setTextInput(
        existing === undefined || existing === null ? "" : String(existing),
      );
    }
  };

  const handleSelectEditField = (questionIndex: number, fieldLabel: string) => {
    setEditingMessageId(null);
    setSelectedEditableMessageId(null);
    setSelectedEditableFieldKey(null);
    pushUserMessage(fieldLabel);
    setMessages((prev) => [
      ...prev,
      {
        id: `edit-field-${Date.now()}`,
        role: "assistant",
        content: t(
          "ممتاز، لنعدّل هذا الحقل الآن.",
          "Great, let's update this field now.",
        ),
      },
    ]);

    setIsReadyToSubmit(false);
    setActiveIndex(questionIndex);

    const selectedQuestion = questions[questionIndex];
    if (
      selectedQuestion &&
      (selectedQuestion.type === "text" || selectedQuestion.type === "number")
    ) {
      const existing = answers[selectedQuestion.key];
      setTextInput(
        existing === undefined || existing === null ? "" : String(existing),
      );
    }
  };

  const handleStartInlineMessageEdit = (message: ChatMessage) => {
    if (
      !message.isEditableAnswer ||
      message.questionIndex === undefined ||
      message.questionIndex < 0
    ) {
      return;
    }

    const selectedQuestion = questions[message.questionIndex];
    if (!selectedQuestion) return;

    setSelectedEditableFieldKey(message.questionKey ?? selectedQuestion.key);
    setSelectedEditableMessageId(message.id);
    setEditingMessageId(message.id);
    setIsReadyToSubmit(false);
    setActiveIndex(message.questionIndex);

    if (
      selectedQuestion.type === "text" ||
      selectedQuestion.type === "number"
    ) {
      const existing = answers[selectedQuestion.key];
      setTextInput(
        existing === undefined || existing === null ? "" : String(existing),
      );
    }
  };

  const canSubmitText =
    Boolean(currentQuestion) &&
    currentQuestion?.type !== "select" &&
    currentQuestion?.type !== "boolean" &&
    currentQuestion?.type !== "multiselect" &&
    currentQuestion?.type !== "files" &&
    currentQuestion?.type !== "location";

  const chipButtonClass =
    "px-2.5 py-2 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs text-right transition-all duration-200 shadow-xs hover:shadow-sm";
  const primaryButtonClass =
    "px-3 py-2 rounded-xl bg-linear-to-r from-blue-600 to-teal-600 text-white text-sm font-medium disabled:opacity-50 shadow-sm hover:shadow-md hover:from-blue-500 hover:to-teal-500 transition-all";
  const secondaryButtonClass =
    "px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors";
  const staggerContainerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.045,
        delayChildren: 0.02,
      },
    },
  };
  const staggerItemVariants: Variants = {
    hidden: { opacity: 0, y: 8, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.2, ease: "easeOut" },
    },
  };

  const assistantMessageWrapClass = isArabic ? "justify-end" : "justify-start";
  const userMessageWrapClass = isArabic ? "justify-start" : "justify-end";
  const assistantBubbleClass = isArabic ? "ml-auto" : "mr-auto";
  const userBubbleClass = isArabic ? "mr-auto" : "ml-auto";
  const isCompactViewport =
    viewportMetrics.keyboardOpen ||
    (viewportMetrics.height !== null && viewportMetrics.height < 760);
  const panelStyle = useMemo(() => {
    if (viewportMetrics.height === null) {
      return undefined;
    }

    const viewportPadding = isCompactViewport ? 12 : 24;
    const availableHeight = Math.max(
      Math.floor(viewportMetrics.height - viewportPadding),
      360,
    );

    return {
      height: `${Math.min(availableHeight, 704)}px`,
      maxHeight: `${availableHeight}px`,
    };
  }, [isCompactViewport, viewportMetrics.height]);

  return (
    <div
      className="flex h-[min(80dvh-2rem,44rem)] min-h-0 w-full max-w-104 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 sm:rounded-2xl"
      dir={isArabic ? "rtl" : "ltr"}
      style={panelStyle}
    >
      <div
        className={`border-b border-blue-100/70 bg-linear-to-r from-blue-600 via-teal-600 to-cyan-600 text-white dark:border-slate-700 ${
          isCompactViewport ? "px-3 py-2.5" : "px-4 py-3"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-200 animate-pulse" />
              <h3 className="text-sm font-semibold">{tc("headerTitle")}</h3>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white text-sm"
              aria-label={t("إغلاق", "Close")}
            >
              ✕
            </button>
          )}
        </div>
        {editItemSummary && (
          <p className="text-[11px] text-blue-50 mt-2 bg-white/15 rounded-md px-2 py-1 inline-block">
            {t("وضع التعديل:", "Edit mode:")} {editItemSummary.typeLabel} —{" "}
            {editItemSummary.displayName}
          </p>
        )}
      </div>

      <div
        ref={messagesContainerRef}
        className={`flex-1 overflow-y-auto bg-linear-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 ${
          isCompactViewport ? "space-y-1.5 p-2.5" : "space-y-2 p-3"
        }`}
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{
                opacity: 0,
                y: 8,
                x:
                  message.role === "assistant"
                    ? isArabic
                      ? 10
                      : -10
                    : isArabic
                      ? -10
                      : 10,
                scale: 0.98,
              }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              layout
              className="space-y-1"
            >
              {(() => {
                const isEditableBubble =
                  message.role === "user" &&
                  message.isEditableAnswer &&
                  message.questionIndex !== undefined;
                const isSelectedMessage =
                  isEditableBubble && selectedEditableMessageId === message.id;

                return (
                  <div
                    className={`flex ${
                      message.role === "assistant"
                        ? assistantMessageWrapClass
                        : userMessageWrapClass
                    }`}
                  >
                    {isEditableBubble ? (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedEditableMessageId((current) =>
                            current === message.id ? null : message.id,
                          )
                        }
                        className={`max-w-[88%] text-sm px-3 py-2 rounded-2xl whitespace-pre-line leading-relaxed text-start bg-linear-to-r from-blue-600 to-teal-600 text-white ${userBubbleClass} shadow-md transition-all ${
                          isSelectedMessage
                            ? "ring-2 ring-blue-200 dark:ring-blue-400/60"
                            : "hover:shadow-lg"
                        }`}
                      >
                        {message.content}
                      </button>
                    ) : (
                      <div
                        className={`max-w-[88%] text-sm px-3 py-2 rounded-2xl whitespace-pre-line leading-relaxed ${
                          message.role === "assistant"
                            ? `bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 ${assistantBubbleClass} shadow-sm`
                            : `bg-linear-to-r from-blue-600 to-teal-600 text-white ${userBubbleClass} shadow-md`
                        }`}
                      >
                        {message.content}
                      </div>
                    )}
                  </div>
                );
              })()}

              {message.role === "user" &&
                message.isEditableAnswer &&
                message.questionIndex !== undefined &&
                selectedEditableMessageId === message.id && (
                  <div className={`flex ${userMessageWrapClass}`}>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleStartInlineMessageEdit(message)}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50 dark:border-blue-500/40 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800 disabled:opacity-50"
                    >
                      <span aria-hidden="true">✎</span>
                      <span>{t("تعديل هذه الإجابة", "Edit this answer")}</span>
                    </button>
                  </div>
                )}
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-slate-500 dark:text-slate-300 text-xs shadow-sm">
              <span className="inline-flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        )}
      </div>

      <div
        className={`border-t border-slate-200 bg-white/85 dark:border-slate-700 dark:bg-slate-900/85 ${
          isCompactViewport ? "space-y-1.5 p-2.5" : "space-y-2 p-3"
        }`}
      >
        {!itemType && (
          <>
            {assistantMode === "home" && (
              <motion.div
                className="grid grid-cols-1 gap-2"
                variants={staggerContainerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.button
                  type="button"
                  onClick={() => handleAnswer(SMART_CHAT_ACTION_ADD_ITEM)}
                  variants={staggerItemVariants}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 text-sm text-right transition-all"
                >
                  {t("🆕 إضافة عنصر جديد", "🆕 Add a new item")}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleAnswer(SMART_CHAT_ACTION_SUBSCRIPTION)}
                  variants={staggerItemVariants}
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-sky-500 hover:text-sky-700 dark:hover:text-sky-300 text-sm text-right transition-all"
                >
                  {t(
                    "💰 الاشتراك وطرق الربح",
                    "💰 Ask about subscription and earnings",
                  )}
                </motion.button>
              </motion.div>
            )}

            {assistantMode === "subscription" && (
              <>
                <p className="text-xs text-neutral-600">
                  {t(
                    "اختر سؤالًا سريعًا عن الاشتراك أو الدعوات أو سحب الأرباح:",
                    "Before you start, you can pick a quick subscription/referral/withdrawal question:",
                  )}
                </p>
                <motion.div
                  className="grid grid-cols-2 gap-2 max-h-30 overflow-y-auto"
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {SUBSCRIPTION_FAQ_OPTIONS.map((option) => (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => handleAnswer(option.value)}
                      variants={staggerItemVariants}
                      className={chipButtonClass}
                    >
                      {isArabic ? option.labelAr : option.labelEn}
                    </motion.button>
                  ))}
                </motion.div>

                <div className="flex gap-2">
                  <input
                    name="subscriptionQuestion"
                    value={subscriptionQuestion}
                    onChange={(event) =>
                      setSubscriptionQuestion(event.target.value)
                    }
                    placeholder={t(
                      "ماهو سؤالك ...",
                      "Ask about subscription, referrals, or withdrawals...",
                    )}
                    className="flex-1 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:focus:ring-sky-900/40 bg-white dark:bg-slate-900"
                  />
                  <button
                    type="button"
                    disabled={isLoading || !subscriptionQuestion.trim()}
                    className="px-3 py-2 rounded-xl bg-linear-to-r from-sky-600 to-cyan-600 text-white text-sm disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
                    onClick={() => {
                      const question = subscriptionQuestion.trim();
                      if (!question) return;

                      pushUserMessage(question);
                      const answer = getSubscriptionAnswerByQuestion(
                        question,
                        isArabic,
                      );

                      setMessages((prev) => [
                        ...prev,
                        {
                          id: `sub-free-${Date.now()}`,
                          role: "assistant",
                          content:
                            answer ||
                            t(
                              "أقدر أشرح لك: مزايا الاشتراك، التفعيل عبر شام كاش أو أكواد التفعيل، فترة السماح، نظام الدعوات، الأرباح المعلقة، وطريقة السحب. وإذا كانت بوابات الدفع غير مدعومة في بلدك (مثل سوريا) اسألني عن أكواد التفعيل.",
                              "I can explain: subscription benefits, activation via ShamCash or activation codes, grace period, referrals, pending earnings, and withdrawals. If gateways are unavailable in your country (like Syria), ask me about activation codes.",
                            ),
                        },
                      ]);

                      setSubscriptionQuestion("");
                    }}
                  >
                    {tc("send")}
                  </button>
                </div>
              </>
            )}

            {assistantMode === "add-item" && (
              <>
                <p className="text-xs text-neutral-600 pt-1">
                  {t(
                    "اختر نوع العنصر لبدء النشر:",
                    "Then choose item type to start listing:",
                  )}
                </p>
                <motion.div
                  className="grid grid-cols-2 gap-2"
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {ITEM_TYPE_OPTIONS.map((option) => (
                    <motion.button
                      key={option.value}
                      type="button"
                      onClick={() => handleAnswer(option.value)}
                      variants={staggerItemVariants}
                      className={chipButtonClass}
                    >
                      {translate(option.label)}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}

            {assistantMode !== "home" && (
              <button
                type="button"
                className="text-xs text-neutral-500 hover:text-neutral-700"
                onClick={() => {
                  setAssistantMode("home");
                  setSubscriptionQuestion("");
                  setMessages((prev) => [
                    ...prev,
                    {
                      id: `back-home-${Date.now()}`,
                      role: "assistant",
                      content: t(
                        "عدنا للخيارات الرئيسية. اختر كيف تحب أن أساعدك.",
                        "Back to main options. Choose how I can help.",
                      ),
                    },
                  ]);
                }}
              >
                {t("العودة للخيارات الرئيسية", "Back to main options")}
              </button>
            )}
          </>
        )}

        {itemType && currentQuestion?.type === "select" && !isReadyToSubmit && (
          <motion.div
            className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto"
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
          >
            {(currentQuestion.options || []).map((option) => (
              <motion.button
                key={option.value}
                type="button"
                onClick={() => handleAnswer(option.value)}
                variants={staggerItemVariants}
                className={chipButtonClass}
              >
                {option.label}
              </motion.button>
            ))}
          </motion.div>
        )}

        {itemType &&
          currentQuestion?.type === "boolean" &&
          !isReadyToSubmit && (
            <motion.div
              className="grid grid-cols-2 gap-2"
              variants={staggerContainerVariants}
              initial="hidden"
              animate="visible"
            >
              {BOOLEAN_OPTIONS.map((option) => (
                <motion.button
                  key={option.value}
                  type="button"
                  onClick={() => handleAnswer(option.value)}
                  variants={staggerItemVariants}
                  className={chipButtonClass}
                >
                  {translate(option.label)}
                </motion.button>
              ))}
            </motion.div>
          )}

        {itemType &&
          currentQuestion?.type === "multiselect" &&
          !isReadyToSubmit && (
            <MultiSelectComposer
              options={currentQuestion.options || []}
              onConfirm={(values) => handleAnswer(values)}
              disabled={isLoading}
            />
          )}

        {itemType && currentQuestion?.type === "files" && !isReadyToSubmit && (
          <div className="space-y-2">
            <ImageUpload
              selectedImages={selectedImages}
              setSelectedImages={setSelectedImages}
            />
            <button
              type="button"
              disabled={selectedImages.length === 0 || isLoading}
              className={`w-full ${primaryButtonClass}`}
              onClick={() => handleAnswer(selectedImages)}
            >
              {tc("confirmImages")} ({selectedImages.length})
            </button>
          </div>
        )}

        {itemType &&
          currentQuestion?.type === "location" &&
          !isReadyToSubmit && (
            <div className="space-y-2">
              <MapPicker
                radius={600}
                initialCenter={mapInitialCenter}
                onLocationSelect={(location) => {
                  setSelectedLocation(location);
                }}
              />
              <button
                type="button"
                disabled={!selectedLocation || isLoading}
                className={`w-full ${primaryButtonClass}`}
                onClick={() => {
                  if (!selectedLocation) return;
                  handleAnswer(selectedLocation);
                }}
              >
                {tc("confirmLocation")}
              </button>
            </div>
          )}

        {canSubmitText && !isReadyToSubmit && (
          <div
            className={`flex w-full items-center px-0.5 ${
              isCompactViewport ? "gap-1.5" : "gap-2"
            }`}
          >
            <input
              name="smartChatTextInput"
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder={
                currentQuestion?.placeholder || tc("answerPlaceholder")
              }
              type={currentQuestion?.type === "number" ? "number" : "text"}
              className={`max-w-[90%] rounded-xl border border-slate-300 bg-white text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900 dark:focus:border-blue-500 dark:focus:ring-blue-900/40 ${
                isCompactViewport ? "px-2.5 py-1.5" : "px-3 py-2"
              }`}
            />
            <button
              type="button"
              disabled={
                isLoading ||
                (!textInput.trim() && currentQuestion?.required !== false)
              }
              className="
               text-blue-600
                 disabled:opacity-50 shadow-sm 
                 hover:shadow-md
                  transition-all
                  p-1"
              onClick={() => {
                const value = textInput.trim();
                if (!value && currentQuestion?.required === false) {
                  handleAnswer("");
                  setTextInput("");
                  return;
                }
                if (!value) return;
                handleAnswer(value);
                setTextInput("");
              }}
            >
              <DynamicIcon iconName="BsSendFill" size={18} />
            </button>
          </div>
        )}

        {itemType && !isReadyToSubmit && (
          <motion.div
            className={`grid grid-cols-3 ${
              isCompactViewport ? "gap-1.5" : "gap-2"
            }`}
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.button
              type="button"
              onClick={handleNavigatePrevious}
              disabled={isLoading}
              variants={staggerItemVariants}
              className="px-2 py-2 rounded-xl border border-blue-300/80 text-blue-700 dark:text-blue-300 text-xs disabled:opacity-50 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              {tc("editAnswer")}
            </motion.button>
          </motion.div>
        )}

        {itemType && isReadyToSubmit && (
          <div className="space-y-2">
            {editItemId && editFieldOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-neutral-600">
                  {t(
                    "اضغط على الإجابة التي تريد تعديلها، ثم اضغط على زر التعديل الذي يظهر أسفل منها:",
                    "Tap the answer you want to edit, then use the edit button that appears below it:",
                  )}
                </p>
                <motion.div
                  className={`overflow-y-auto ${
                    isCompactViewport
                      ? "max-h-44 space-y-1.5"
                      : "max-h-56 space-y-2"
                  }`}
                  variants={staggerContainerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {editFieldEntries.map((field) => {
                    const isSelected = selectedEditableFieldKey === field.key;

                    return (
                      <motion.div
                        key={`edit-field-msg-${field.key}`}
                        variants={staggerItemVariants}
                        className="space-y-1"
                      >
                        <div className={`flex ${userMessageWrapClass}`}>
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() =>
                              setSelectedEditableFieldKey((current) =>
                                current === field.key ? null : field.key,
                              )
                            }
                            className={`max-w-[92%] w-full text-start rounded-2xl px-3 py-2 bg-linear-to-r from-blue-600 to-teal-600 text-white shadow-md transition-all ${userBubbleClass} ${
                              isSelected
                                ? "ring-2 ring-blue-200 dark:ring-blue-400/60"
                                : "hover:shadow-lg"
                            } disabled:opacity-50`}
                          >
                            <div className="text-[11px] text-white/75">
                              {field.label}
                            </div>
                            <div className="text-sm whitespace-pre-line leading-relaxed">
                              {field.displayValue}
                            </div>
                          </button>
                        </div>
                        {isSelected && (
                          <div className={`flex ${userMessageWrapClass}`}>
                            <button
                              type="button"
                              disabled={isLoading}
                              onClick={() =>
                                handleSelectEditField(field.index, field.label)
                              }
                              className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50 dark:border-blue-500/40 dark:bg-slate-900 dark:text-blue-300 dark:hover:bg-slate-800 disabled:opacity-50"
                            >
                              <span aria-hidden="true">✎</span>
                              <span>
                                {t("تعديل هذه الإجابة", "Edit this answer")}
                              </span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleSubmitFinal(answers)}
                className={primaryButtonClass}
              >
                {isLoading
                  ? editItemId
                    ? t("جاري حفظ التعديلات...", "Saving changes...")
                    : tc("submitting")
                  : editItemId
                    ? t("حفظ التعديلات", "Save changes")
                    : tc("confirmSubmit")}
              </button>
              <button
                type="button"
                onClick={resetConversation}
                className={secondaryButtonClass}
              >
                {editItemId ? t("إلغاء التعديل", "Cancel edit") : tc("cancel")}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            className="text-xs text-neutral-500 hover:text-neutral-700"
            onClick={resetConversation}
            disabled={isLoading}
          >
            {tc("resetConversation")}
          </button>
          {currentQuestion?.required === false && canSubmitText && (
            <button
              type="button"
              className="text-xs text-blue-700 hover:text-blue-800"
              onClick={() => {
                handleAnswer("");
                setTextInput("");
              }}
              disabled={isLoading}
            >
              {tc("skip")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface MultiSelectComposerProps {
  options: QuestionOption[];
  onConfirm: (values: string[]) => void;
  disabled?: boolean;
}

const MultiSelectComposer = ({
  options,
  onConfirm,
  disabled,
}: MultiSelectComposerProps) => {
  const { isArabic } = useAppPreferences();
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
        {options.map((option) => {
          const active = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSelectedValues((prev) =>
                  prev.includes(option.value)
                    ? prev.filter((value) => value !== option.value)
                    : [...prev, option.value],
                );
              }}
              className={`px-2 py-2 rounded-xl border text-xs transition-all ${
                active
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-slate-200 dark:border-slate-700 hover:border-blue-400"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={selectedValues.length === 0 || disabled}
        className="w-full px-3 py-2 rounded-xl bg-linear-to-r from-blue-600 to-teal-600 text-white text-sm font-medium disabled:opacity-50 shadow-sm hover:shadow-md transition-all"
        onClick={() => onConfirm(selectedValues)}
      >
        {isArabic
          ? SMART_CHAT_TEXT.confirmSelection.ar
          : SMART_CHAT_TEXT.confirmSelection.en}
      </button>
    </div>
  );
};

export default SmartChatBot;
