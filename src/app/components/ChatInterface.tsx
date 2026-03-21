"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ASSISTANT_NAME_AR } from "@/app/i18n/brand";

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
    <div className="flex flex-col h-full bg-white rounded-lg">
      {/* رأس المحادثة */}
      <div className="bg-linear-to-r from-emerald-500 to-emerald-600 p-4 rounded-t-lg">
        <h2 className="text-white font-bold text-lg">🤖 {ASSISTANT_NAME_AR}</h2>
        <p className="text-emerald-100 text-sm">أجب عن الأسئلة بسرعة وسهولة</p>
      </div>

      {/* المحادثة */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                <div className="bg-gray-100 rounded-lg rounded-bl-none p-3 max-w-xs">
                  <p className="text-gray-800 text-sm">{msg.content}</p>
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
                <div className="bg-emerald-500 text-white rounded-lg rounded-br-none p-3 max-w-xs">
                  <p className="text-sm">{msg.content}</p>
                </div>
              </motion.div>
            ),
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* الخيارات أو حقل الإدخال */}
      {currentQuestion && (
        <div className="border-t p-4 space-y-3">
          {/* الخيارات */}
          {currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => (
                <button
                  key={String(option.value)}
                  onClick={() => onOptionSelect(String(option.value))}
                  disabled={isLoading}
                  className="w-full p-3 text-left border-2 border-emerald-200 rounded-lg hover:bg-emerald-50 hover:border-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="font-medium text-gray-800">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* حقل النص */}
          {currentQuestion.type && !currentQuestion.options && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              {currentQuestion.type === "textarea" ? (
                <textarea
                  ref={textAreaRef}
                  placeholder={currentQuestion.placeholder || "اكتب الإجابة..."}
                  className="flex-1 p-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none resize-none"
                  rows={3}
                  disabled={isLoading}
                />
              ) : currentQuestion.type === "color" ? (
                <input
                  ref={inputRef}
                  type="color"
                  className="flex-1 p-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none cursor-pointer"
                  disabled={isLoading}
                />
              ) : (
                <input
                  ref={inputRef}
                  type={currentQuestion.type || "text"}
                  placeholder={currentQuestion.placeholder || "اكتب الإجابة..."}
                  className="flex-1 p-2 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:outline-none"
                  disabled={isLoading}
                />
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="w-full p-2 text-gray-500 text-sm hover:text-gray-700 transition-colors disabled:opacity-50"
            >
              تخطي
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
