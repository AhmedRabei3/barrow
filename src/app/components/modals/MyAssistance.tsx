"use client";
import { $Enums } from "@prisma/client";
import { useEffect, useState, useCallback } from "react";
import { useAddForm } from "@/app/hooks";
import { useChatAssistant } from "@/app/hooks/useChatAssistant";
import submitMethod from "@/app/utils/submiteMethod";
import ChatModal from "./ChatModal";
import { useRouter } from "next/navigation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ChatOption = {
  value: string | number | boolean | $Enums.ItemType;
  label: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  options?: ChatOption[];
};

type AnswerValue = string | number | boolean;

type AssistantQuestion = {
  text: string;
  field: string;
  options?: ChatOption[];
};

const MyAssistance = ({ isOpen, onClose, onSuccess }: Props) => {
  const router = useRouter();
  const [type, setType] = useState<$Enums.ItemType>($Enums.ItemType.OTHER);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setIsLoading] = useState(false);
  const [step, setStep] = useState<"chat" | "location" | "images">("chat");
  const { QUESTIONS, getNextQuestion } = useChatAssistant(type);

  const { setValue, trigger, getValues, reset } = useAddForm(type);

  useEffect(() => {
    if (!isOpen) return;
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: QUESTIONS.initial.text,
        options: QUESTIONS.initial.options,
      },
    ]);
    setCurrentIndex(0);
    reset();
    setStep("chat");
  }, [isOpen, QUESTIONS.initial.options, QUESTIONS.initial.text, reset]);

  const currentQuestion = getNextQuestion(
    getValues(),
    currentIndex,
  ) as AssistantQuestion | null;

  const goNext = useCallback(() => {
    const next = getNextQuestion(
      getValues(),
      currentIndex + 1,
    ) as AssistantQuestion | null;
    if (!next) return setStep("location");

    setMessages((p) => [
      ...p,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: next.text,
        options: next.options,
      },
    ]);
    setCurrentIndex((i) => i + 1);
  }, [currentIndex, getNextQuestion, getValues]);

  const handleAnswer = useCallback(
    async (value: AnswerValue) => {
      if (!currentQuestion) return;

      setMessages((p) => [
        ...p,
        { id: Date.now().toString(), role: "user", content: String(value) },
      ]);

      if (currentQuestion.field === "itemType") {
        setType(value as $Enums.ItemType);
        setMessages([]);
        setCurrentIndex(0);
        return;
      }

      setValue(currentQuestion.field as never, value as never);
      const valid = await trigger(currentQuestion.field as never);
      if (!valid) return;

      goNext();
    },
    [currentQuestion, goNext, setValue, trigger],
  );

  const handleSubmitFinal = async () => {
    await submitMethod({
      selectedImages,
      data: getValues(),
      setIsLoading,
      url: "",
      onClose,
      reset,
      router,
      method: "POST",
    });
    onSuccess?.();
  };

  if (!isOpen) return null;

  return (
    <ChatModal
      step={step}
      messages={messages}
      currentQuestion={currentQuestion ?? undefined}
      handleOptionSelect={handleAnswer}
      handleTextSubmit={handleAnswer}
      selectedImages={selectedImages}
      setSelectedImages={setSelectedImages}
      handleImagesSubmit={handleSubmitFinal}
      setValue={setValue}
      setStep={setStep}
    />
  );
};

export default MyAssistance;
