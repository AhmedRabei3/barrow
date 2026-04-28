"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ASSISTANT_NAME_AR } from "@/app/i18n/brand";
import { useAppPreferences } from "./providers/AppPreferencesProvider";

type ChatOption = {
  label: string;
  value: string | number | boolean;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type ChatQuestion = {
  type?:
    | "text"
    | "number"
    | "textarea"
    | "color"
    | "boolean"
    | "dynamic-select";
  placeholder?: string;
  optional?: boolean;
  options?: ChatOption[];
};

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onOptionSelect: (value: string) => void;
  onTextSubmit: (text: string) => void;
  isLoading?: boolean;
  currentQuestion?: ChatQuestion;
}

const ChatInterface = ({
  messages,
  onOptionSelect,
  onTextSubmit,
  isLoading,
  currentQuestion,
}: ChatInterfaceProps) => {
  const { isArabic } = useAppPreferences();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isTextarea = currentQuestion?.type === "textarea";
    const currentValue = isTextarea
      ? (textAreaRef.current?.value ?? "")
      : (inputRef.current?.value ?? "");

    if (currentValue.trim()) {
      onTextSubmit(currentValue);
      if (isTextarea && textAreaRef.current) {
        textAreaRef.current.value = "";
      }
      if (!isTextarea && inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] bg-white dark:bg-slate-950"
    >
      {/* رأس المحادثة */}
      <div className="sticky top-0 z-10 bg-linear-to-r from-emerald-500 to-emerald-600 px-4 py-4 sm:px-5">
        <h2 className="text-lg font-bold text-white">🤖 {ASSISTANT_NAME_AR}</h2>
        <p className="text-sm text-emerald-100">
          {isArabic
            ? "أجب عن الأسئلة بسرعة وسهولة"
            : "Answer the guided questions quickly and clearly"}
        </p>
      </div>

      {/* المحادثة */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-5 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) =>
            msg.role === "assistant" ? (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <div className="max-w-[85%] rounded-2xl rounded-bl-none bg-slate-100 p-3 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100 sm:max-w-md">
                  <p>{msg.content}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-end"
              >
                <div className="max-w-[85%] rounded-2xl rounded-br-none bg-emerald-500 p-3 text-sm text-white sm:max-w-md">
                  <p>{msg.content}</p>
                </div>
              </motion.div>
            ),
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* الخيارات أو حقل الإدخال */}
      {currentQuestion && (
        <div className="border-t border-slate-200 px-4 py-4 space-y-3 dark:border-slate-800 sm:px-5">
          {/* الخيارات */}
          {currentQuestion.options && (
            <div className="grid gap-2 sm:grid-cols-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => onOptionSelect(String(option.value))}
                  disabled={isLoading}
                  className="w-full rounded-2xl border-2 border-emerald-200 p-3 text-start transition-all hover:border-emerald-500 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-emerald-900/60 dark:hover:bg-emerald-950/30"
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* حقل النص */}
          {currentQuestion.type && !currentQuestion.options && (
            <form
              onSubmit={handleSubmit}
              className="flex w-full min-w-0 flex-col gap-2 sm:flex-row"
            >
              {currentQuestion.type === "textarea" ? (
                <textarea
                  name="chatAnswerTextarea"
                  ref={textAreaRef}
                  placeholder={currentQuestion.placeholder || "اكتب الإجابة..."}
                  className="min-h-28 flex-1 resize-none rounded-2xl border-2 border-slate-300 p-3 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  rows={3}
                  disabled={isLoading}
                />
              ) : currentQuestion.type === "color" ? (
                <input
                  ref={inputRef}
                  type="color"
                  name="chatAnswerColor"
                  className="h-12 flex-1 cursor-pointer rounded-2xl border-2 border-slate-300 p-2 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  disabled={isLoading}
                />
              ) : (
                <input
                  ref={inputRef}
                  type={currentQuestion.type || "text"}
                  name="chatAnswerInput"
                  placeholder={currentQuestion.placeholder || "اكتب الإجابة..."}
                  className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-slate-300 p-3 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  disabled={isLoading}
                />
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="h-12 rounded-2xl bg-emerald-500 px-5 py-2 text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✓
              </button>
            </form>
          )}

          {/* زر اختياري (إذا كان السؤال اختياري) */}
          {currentQuestion.optional && (
            <button
              onClick={() => onOptionSelect("skip")}
              disabled={isLoading}
              className="w-full p-2 text-sm text-slate-500 transition-colors hover:text-slate-700 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {isArabic ? "تخطي" : "Skip"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
