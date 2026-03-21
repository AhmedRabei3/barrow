// تم حذف هذا الملف بالكامل لإعادة بناء المساعد الذكي من الصفر.
"use client";

import { useState, useCallback, useEffect } from "react";
import ChatInterface from "../ChatInterface";
import { useChatAssistant } from "@/app/hooks/useChatAssistant";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import MapPicker from "../modals/mapPicker/MapPickerModal";
import ImageUpload from "../imageUploader/ImageUpload";
import { $Enums, Category } from "@prisma/client";
import { useAddForm } from "@/app/hooks";
import categoryFetcher from "../category/CategoryFetcher";
import submitMethod from "@/app/utils/submiteMethod";
import { createNewCarSchema } from "@/app/validations/newCarValidations";
import { createUsedCarSchema } from "@/app/validations/usedCarValidations";
import { createPropertySchema } from "@/app/validations/propertyValidations";
import { createOtherItemSchema } from "@/app/validations/otherItemValidations";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface ChatAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ChatOption = {
  label: string;
  value: string | number | boolean | $Enums.ItemType;
  icon?: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  options?: ChatOption[];
};

type AssistantQuestion = {
  text: string;
  field: string;
  type?: "text" | "number" | "textarea" | "boolean" | "dynamic-select";
  options?: ChatOption[];
};

const ChatAssistantModal = ({
  isOpen,
  onClose,
  onSuccess,
}: ChatAssistantModalProps) => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [step, setStep] = useState<"chat" | "location" | "images">("chat");
  const [, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [dynamicOptions, setDynamicOptions] = useState<ChatOption[]>([]);
  const [itemTypeEnum, setItemTypeEnum] = useState<$Enums.ItemType>(
    $Enums.ItemType.OTHER,
  );
  const { QUESTIONS, getNextQuestion } = useChatAssistant(itemTypeEnum);

  const form = useAddForm(itemTypeEnum);
  const { setValue, trigger, getValues, reset } = form;

  // بدء المحادثة
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: QUESTIONS.initial.text,
          timestamp: new Date(),
          options: QUESTIONS.initial.options,
        },
      ]);
    }
  }, [isOpen, QUESTIONS.initial, messages.length]);

  let currentQuestion = getNextQuestion(
    getValues(),
    currentQuestionIndex,
  ) as AssistantQuestion | null;
  const currentQuestionType =
    currentQuestion && "type" in currentQuestion
      ? currentQuestion.type
      : undefined;
  // إصلاح: تمرير الخيارات دائماً إذا كانت موجودة
  if (currentQuestion) {
    if (currentQuestionType === "dynamic-select") {
      currentQuestion = { ...currentQuestion, options: dynamicOptions };
    } else if (currentQuestion.options) {
      currentQuestion = {
        ...currentQuestion,
        options: currentQuestion.options,
      };
    }
    // إصلاح إضافي: إذا كان السؤال الأول ولم تظهر الخيارات، خذها من الرسالة الأولى
    if (
      currentQuestionIndex === 0 &&
      (!currentQuestion.options || currentQuestion.options.length === 0) &&
      messages.length > 0 &&
      messages[0].options
    ) {
      currentQuestion = {
        ...currentQuestion,
        options: messages[0].options,
      };
    }
  }

  // جلب الفئات الديناميكية
  useEffect(() => {
    const fetchDynamicOptions = async () => {
      if (!currentQuestion || currentQuestionType !== "dynamic-select") {
        setDynamicOptions([]);
        return;
      }

      try {
        const setCategoryList: React.Dispatch<
          React.SetStateAction<Category[]>
        > = (value) => {
          const categories =
            typeof value === "function" ? value([] as Category[]) : value;
          setDynamicOptions(
            categories.map((cat) => ({
              label: cat.name,
              value: cat.id,
              icon: cat.icon ?? undefined,
            })),
          );
        };

        categoryFetcher({ setList: setCategoryList, type: itemTypeEnum });
      } catch {
        setDynamicOptions([]);
      }
    };

    fetchDynamicOptions();
  }, [currentQuestion, currentQuestionType, itemTypeEnum]);

  const goNext = useCallback(() => {
    const next = getNextQuestion(
      getValues(),
      currentQuestionIndex + 1,
    ) as AssistantQuestion | null;

    if (next) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: next.text,
          timestamp: new Date(),
          options:
            next.type === "dynamic-select" ? dynamicOptions : next.options,
        },
      ]);
      setCurrentQuestionIndex((i) => i + 1);
    } else {
      setStep("location");
    }
  }, [currentQuestionIndex, dynamicOptions, getNextQuestion, getValues]);

  const handleOptionSelect = useCallback(
    async (value: string) => {
      if (!currentQuestion) return;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content:
            currentQuestion.options?.find((o: ChatOption) => o.value === value)
              ?.label || value,
          timestamp: new Date(),
        },
      ]);

      let finalValue: string | number | boolean = value;
      if (currentQuestionType === "boolean") finalValue = value === "true";
      if (currentQuestionType === "number") finalValue = Number(value);

      // إذا السؤال هو نوع العنصر → نبدّل الفورم
      if (currentQuestion.field === "itemType") {
        const enumValue = value as $Enums.ItemType;
        setItemTypeEnum(enumValue);
        reset(); // إعادة ضبط الفورم حسب النوع الجديد
      }

      setValue(currentQuestion.field, finalValue, { shouldDirty: true });

      const valid = await trigger(currentQuestion.field);
      if (!valid) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: "❌ القيمة غير صحيحة، حاول مرة أخرى",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      goNext();
    },
    [currentQuestion, currentQuestionType, setValue, trigger, reset, goNext],
  );

  const handleTextSubmit = useCallback(
    async (text: string) => {
      if (!currentQuestion || !text.trim()) return;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content: text,
          timestamp: new Date(),
        },
      ]);

      let value: string | number = text;
      if (currentQuestionType === "number") value = Number(text);

      setValue(currentQuestion.field, value, { shouldDirty: true });

      const valid = await trigger(currentQuestion.field);
      if (!valid) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            role: "assistant",
            content: t(
              "❌ القيمة غير صحيحة، أدخل قيمة صحيحة",
              "❌ Invalid value, please enter a valid one",
            ),
            timestamp: new Date(),
          },
        ]);
        return;
      }

      goNext();
    },
    [currentQuestion, currentQuestionType, setValue, t, trigger, goNext],
  );

  // تحديد الراوت المناسب والفاليديشن لكل نوع
  const getEndpointAndSchema = (itemType: $Enums.ItemType) => {
    switch (itemType) {
      case $Enums.ItemType.NEW_CAR:
        return {
          url: "/api/cars",
          schema: createNewCarSchema,
        };
      case $Enums.ItemType.USED_CAR:
        return {
          url: "/api/usedCar",
          schema: createUsedCarSchema,
        };
      case $Enums.ItemType.PROPERTY:
        return {
          url: "/api/realestate",
          schema: createPropertySchema,
        };
      default:
        return {
          url: "/api/otherItems",
          schema: createOtherItemSchema,
        };
    }
  };

  const handleImagesSubmit = async () => {
    const values = getValues();
    if (!values.latitude || !values.longitude)
      return toast.error(t("حدد الموقع", "Select location"));
    if (!values.categoryId)
      return toast.error(t("اختر الفئة", "Choose a category"));
    if (selectedImages.length === 0)
      return toast.error(t("اختر صورة", "Choose an image"));

    const { url, schema } = getEndpointAndSchema(values.itemType);
    // فحص الفاليديشن عبر zod
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ||
          t("البيانات غير صالحة", "Invalid data"),
      );
      return;
    }

    // إرسال عبر submitMethod
    await submitMethod({
      selectedImages,
      data: values,
      setIsLoading: setIsLoading,
      url,
      onClose,
      reset,
      method: "POST",
      router,
    });
    onSuccess?.();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/50 flex justify-center items-center">
        <motion.div className="bg-white rounded-lg w-full max-w-lg">
          {step === "chat" && (
            <ChatInterface
              messages={messages}
              onOptionSelect={handleOptionSelect}
              onTextSubmit={handleTextSubmit}
              currentQuestion={currentQuestion ?? undefined}
            />
          )}

          {step === "location" && (
            <div>
              <MapPicker
                radius={1000}
                onLocationSelect={(loc) =>
                  setValue("location", { lat: loc.lat, lng: loc.lng })
                }
              />
              <button
                className="btn-primary w-full"
                onClick={() => setStep("images")}
              >
                {t("تأكيد الموقع", "Confirm location")}
              </button>
            </div>
          )}

          {step === "images" && (
            <div>
              <ImageUpload
                selectedImages={selectedImages}
                setSelectedImages={setSelectedImages}
              />
              <button
                className="btn-primary w-full"
                onClick={handleImagesSubmit}
              >
                {t("إرسال", "Submit")}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatAssistantModal;
