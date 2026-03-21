import { useMemo } from "react";
import { $Enums } from "@prisma/client";
import {
  NewCarFormData,
  OtherItemFormData,
  RealEstateFormData,
  UsedCarFormData,
} from "../components/modals/types";

export type Question<T> = {
  text: string;
  field: keyof T;
  type?: "text" | "number" | "textarea" | "boolean" | "dynamic-select";
  options?: {
    label: string;
    value: string | number | boolean | $Enums.ItemType;
    icon?: string;
  }[];
};

export const QUESTIONS = {
  initial: {
    text: "مرحباً 👋 ما نوع العنصر الذي تريد إضافته؟",
    field: "itemType",
    options: [
      { label: "🚗 سيارة جديدة", value: $Enums.ItemType.NEW_CAR },
      { label: "🚗 سيارة مستعملة", value: $Enums.ItemType.USED_CAR },
      { label: "🏠 عقار", value: $Enums.ItemType.PROPERTY },
      { label: "📦 شيء آخر", value: $Enums.ItemType.OTHER },
    ],
  },

  category: {
    text: "اختر الفئة:",
    field: "categoryId",
    type: "dynamic-select",
  },

  NEW_CAR: [
    { text: "ماركة السيارة؟", field: "brand" },
    { text: "الموديل؟", field: "model" },
    { text: "سنة الصنع؟", field: "year", type: "number" },
    { text: "السعر؟", field: "price", type: "number" },
  ] as Question<NewCarFormData>[],

  USED_CAR: [
    { text: "الماركة؟", field: "brand" },
    { text: "الموديل؟", field: "model" },
    { text: "عدد الكيلومترات؟", field: "mileage", type: "number" },
    { text: "السعر؟", field: "price", type: "number" },
  ] as Question<UsedCarFormData>[],

  PROPERTY: [
    { text: "نوع العقار؟", field: "propertyType" },
    { text: "المساحة؟", field: "area", type: "number" },
    { text: "عدد الغرف؟", field: "bedrooms", type: "number" },
    { text: "عدد الحمامات؟", field: "bathrooms", type: "number" },
    { text: "السعر؟", field: "price", type: "number" },
    { text: "الوصف؟", field: "description", type: "textarea" },
  ] as Question<RealEstateFormData>[],

  OTHER: [
    { text: "اسم المنتج؟", field: "brand" },
    { text: "السعر؟", field: "price", type: "number" },
    { text: "الوصف؟", field: "description", type: "textarea" },
  ] as Question<OtherItemFormData>[],
};

export const useChatAssistant = (itemType?: $Enums.ItemType) => {
  // منطق الأسئلة المشروطة والديناميكية
  const flow = useMemo(() => {
    if (!itemType)
      return [QUESTIONS.initial] as Array<Question<Record<string, unknown>>>;
    let questions = [QUESTIONS.category] as Array<
      Question<Record<string, unknown>>
    >;
    switch (itemType) {
      case $Enums.ItemType.NEW_CAR:
        questions = questions.concat(
          QUESTIONS.NEW_CAR as unknown as Array<
            Question<Record<string, unknown>>
          >,
        );
        break;
      case $Enums.ItemType.USED_CAR:
        questions = questions.concat(
          QUESTIONS.USED_CAR as unknown as Array<
            Question<Record<string, unknown>>
          >,
        );
        break;
      case $Enums.ItemType.PROPERTY:
        questions = questions.concat(
          QUESTIONS.PROPERTY as unknown as Array<
            Question<Record<string, unknown>>
          >,
        );
        break;
      default:
        questions = questions.concat(
          QUESTIONS.OTHER as unknown as Array<
            Question<Record<string, unknown>>
          >,
        );
    }
    // يمكن إضافة منطق مشروط هنا حسب الحاجة
    return questions;
  }, [itemType]);

  // دعم الأسئلة المشروطة بناءً على الإجابات السابقة
  const getNextQuestion = (
    values: Record<string, unknown> | undefined,
    index: number,
  ) => {
    // إذا كان السؤال الأول ولم يتم تحديد النوع بعد، أعد السؤال الأول مع الخيارات
    if (index === 0 && (!itemType || !values?.itemType)) {
      return QUESTIONS.initial;
    }
    // مثال: إذا كان نوع العقار شقة، أضف سؤال إضافي
    if (
      itemType === $Enums.ItemType.PROPERTY &&
      values?.propertyType === "APARTMENT" &&
      index === 3
    ) {
      return { text: "هل يوجد مصعد؟", field: "elevator", type: "boolean" };
    }
    return flow[index] || null;
  };

  return { QUESTIONS, getNextQuestion };
};
