"use client";

import { memo } from "react";
import useChatAssistantModal from "@/app/hooks/useChatAssistantModal";
import { motion } from "framer-motion";

const PublishButton = () => {
  const chatAssistant = useChatAssistantModal();

  const openAssistant = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-smart-chat"));
    }
    chatAssistant.onOpen();
  };

  return (
    <div className="flex gap-2 md:gap-3">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={openAssistant}
        className="flex items-center gap-2 px-3 md:px-4 py-2 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all duration-300"
        title="إضافة عنصر عبر المساعد الذكي"
      >
        <span className="text-lg">🤖</span>
        <span className="hidden sm:inline font-medium">إضافة عبر المساعد</span>
      </motion.button>
    </div>
  );
};

export default memo(PublishButton);
