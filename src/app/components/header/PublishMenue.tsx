import { motion } from "framer-motion";
import useChatAssistantModal from "@/app/hooks/useChatAssistantModal";
import { Dispatch, SetStateAction } from "react";
import { FaRobot } from "react-icons/fa";

interface PublishMenueProps {
  setPublishOpen: Dispatch<SetStateAction<boolean>>;
}

const PublishMenue = ({ setPublishOpen }: PublishMenueProps) => {
  const chatAssistant = useChatAssistantModal();

  const openAssistant = () => {
    setPublishOpen(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("open-smart-chat"));
    }
    chatAssistant.onOpen();
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="absolute right-0 mt-2 overflow-hidden bg-white rounded-xl shadow-lg w-56 z-50 origin-top"
    >
      <ul className="divide-y divide-gray-100">
        <li
          onClick={openAssistant}
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-blue-50 transition-all bg-blue-50/50"
        >
          <FaRobot className="text-blue-500" />
          <div>
            <span className="font-semibold text-blue-600">
              🤖 النشر عبر المساعد
            </span>
            <p className="text-xs text-gray-500">
              الطريقة الوحيدة لإضافة العناصر
            </p>
          </div>
        </li>
      </ul>
    </motion.div>
  );
};

export default PublishMenue;
