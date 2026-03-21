"use client";

import { AnimatePresence, motion } from "framer-motion";
import ChatInterface from "../ChatInterface";
import MapPicker from "../modals/mapPicker/MapPickerModal";
import ImageUpload from "../imageUploader/ImageUpload";
import { FieldValues, UseFormSetValue } from "react-hook-form";
import React, { SetStateAction } from "react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

type ChatOption = {
  value: string | number | boolean;
  label: string;
};

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

type ChatQuestion = {
  options?: ChatOption[];
  type?:
    | "text"
    | "number"
    | "textarea"
    | "color"
    | "boolean"
    | "dynamic-select";
  placeholder?: string;
  optional?: boolean;
};

interface ChatModalProps {
  step: "chat" | "location" | "images";
  messages: ChatMessage[];
  currentQuestion?: ChatQuestion;
  handleOptionSelect: (option: string) => void;
  handleTextSubmit: (text: string) => void;
  selectedImages: File[];
  setSelectedImages: React.Dispatch<React.SetStateAction<File[]>>;
  handleImagesSubmit: () => void;
  setValue: UseFormSetValue<FieldValues>;
  setStep: (value: SetStateAction<"chat" | "location" | "images">) => void;
}

const ChatModal = ({
  step,
  messages,
  currentQuestion,
  handleOptionSelect,
  handleTextSubmit,
  selectedImages,
  setSelectedImages,
  handleImagesSubmit,
  setValue,
  setStep,
}: ChatModalProps) => {
  const { isArabic } = useAppPreferences();

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/50 flex justify-center items-center z-40">
        <motion.div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
          {step === "chat" && (
            <ChatInterface
              messages={messages}
              onOptionSelect={handleOptionSelect}
              onTextSubmit={handleTextSubmit}
              currentQuestion={currentQuestion}
            />
          )}

          {step === "location" && (
            <div className="flex flex-col h-full">
              <MapPicker
                radius={1000}
                onLocationSelect={(loc) =>
                  setValue("location", {
                    lat: loc.lat,
                    lng: loc.lng,
                    address: loc.address,
                    city: loc.city,
                    state: loc.state,
                    country: loc.country,
                  })
                }
              />
              <button className="btn-primary" onClick={() => setStep("images")}>
                {isArabic ? "تأكيد الموقع" : "Confirm location"}
              </button>
            </div>
          )}

          {step === "images" && (
            <div className="flex flex-col h-full">
              <ImageUpload
                selectedImages={selectedImages}
                setSelectedImages={setSelectedImages}
              />
              <button className="btn-primary" onClick={handleImagesSubmit}>
                {isArabic ? "إرسال" : "Submit"}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatModal;
