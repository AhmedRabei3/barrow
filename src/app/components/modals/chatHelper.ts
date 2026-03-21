import { Dispatch, SetStateAction, useCallback } from "react";
import { FieldValues, UseFormSetValue, UseFormTrigger } from "react-hook-form";

type ChatOption = {
  value: string;
  label: string;
};

type ChatQuestion = {
  field: string;
  type?: "boolean" | "number" | "text" | "textarea";
  options?: ChatOption[];
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
};

export const useOptions = (
  currentQuestion: ChatQuestion | null | undefined,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  setValue: UseFormSetValue<FieldValues>,
  trigger: UseFormTrigger<FieldValues>,
  goNext: () => void,
) => {
  return useCallback(
    async (value: string) => {
      if (!currentQuestion) return;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "user",
          content:
            currentQuestion.options?.find((o) => o.value === value)?.label ||
            value,
          timestamp: new Date(),
        },
      ]);

      let finalValue: string | number | boolean = value;
      if (currentQuestion.type === "boolean") finalValue = value === "true";
      if (currentQuestion.type === "number") finalValue = Number(value);

      setValue(currentQuestion.field as never, finalValue as never, {
        shouldDirty: true,
      });

      const valid = await trigger(currentQuestion.field as never);

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
    [currentQuestion, setMessages, setValue, trigger, goNext],
  );
};
