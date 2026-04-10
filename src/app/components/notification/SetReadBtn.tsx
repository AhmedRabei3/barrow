import { memo } from "react";
import { motion } from "framer-motion";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface Props {
  notificationId: string;
  onMarkAsRead: (id: string) => void;
}

const SetReadBtn = ({ notificationId, onMarkAsRead }: Props) => {
  const { isArabic } = useAppPreferences();

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      whileHover={{ opacity: 0.85 }}
      onClick={() => onMarkAsRead(notificationId)}
      className="text-xs 
      hover:underline
      "
    >
      {isArabic ? "تعيين كمقروء" : "Mark as read"}
    </motion.button>
  );
};

export default memo(SetReadBtn);
