"use client";
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import useInviteModal from "@/app/hooks/useInviteHook";
import "./InviteModal.css";
import { FaRegCopy, FaTimes } from "react-icons/fa";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

const InviteModal = () => {
  const { data: session } = useSession();
  const user = session?.user;
  const { isArabic } = useAppPreferences();

  const { isOpen, onClose } = useInviteModal();
  const inviteLink = `${window.location.origin}?ref=${user?.id}`;

  const [message, setMessage] = useState(
    isArabic
      ? "اشتر , بع , استأجر , أجر عبر هذا الموقع الرائع ولا تدع أحداً يستغلك بالعمولة المرتفعة , استخدم رابط الدعوة للحصول على خصم خاص!"
      : "Buy, sell, rent, and list items on this great platform. Use my invite link to get a special discount!",
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${message}\n${inviteLink}`);
    toast.success(
      isArabic ? "تم نسخ رابط الدعوة بنجاح" : "Invite link copied successfully",
    );
  };

  return (
    <AnimatePresence>
      {user && isOpen && (
        <motion.div
          className="invite-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="invite-modal"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button className="close-btn" onClick={onClose}>
              <FaTimes />
            </button>
            <h2 className="invite-title">
              {isArabic ? "🎁 دعوة الأصدقاء" : "🎁 Invite Friends"}
            </h2>
            <p className="invite-subtitle">
              {isArabic
                ? "شارك رابطك الخاص لدعوة أصدقائك للحصول على مزايا إضافية!"
                : "Share your personal link to invite friends and earn extra benefits!"}
            </p>

            <textarea
              className="invite-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <div className="invite-link">
              <span>{inviteLink}</span>
              <button onClick={handleCopy}>
                <FaRegCopy />
              </button>
            </div>

            <button
              className="invite-send-btn"
              onClick={() =>
                toast.success(
                  isArabic ? "تم إرسال الدعوة 💌" : "Invitation sent 💌",
                )
              }
            >
              {isArabic ? "إرسال الدعوة" : "Send invitation"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InviteModal;
