"use client";

import useChatAssistantModal from "@/app/hooks/useChatAssistantModal";
import MyAssistance from "./MyAssistance";

const ChatAssistantModalWrapper = () => {
  const { isOpen, onClose } = useChatAssistantModal();

  return <MyAssistance isOpen={isOpen} onClose={onClose} />;
};

// تم حذف هذا الملف بالكامل لإعادة بناء المساعد الذكي من الصفر.

export default ChatAssistantModalWrapper;
