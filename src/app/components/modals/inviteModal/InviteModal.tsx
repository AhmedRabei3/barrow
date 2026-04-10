"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  const [origin, setOrigin] = useState("");
  const [isMobileShare, setIsMobileShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    const checkMobileShare = () => {
      const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
      setIsMobileShare(Boolean(isMobileViewport && navigator.share));
    };

    checkMobileShare();
    window.addEventListener("resize", checkMobileShare);

    return () => {
      window.removeEventListener("resize", checkMobileShare);
    };
  }, []);

  const inviteLink = useMemo(() => {
    if (!origin || !user?.id) {
      return "";
    }

    return `${origin}?ref=${user.id}`;
  }, [origin, user?.id]);

  const [message, setMessage] = useState(
    isArabic
      ? "أعلن عن منتجاتك وخدماتك واكسب المال أيضاً عبر هذا الموقع ، إعلانك يصل إلى الكثير من الأشخاص حول العالم ، باستخدامك رابط الدعوة الخاص بي ستحصل على حسم 10% من قيمة الاشتراك "
      : "Promote your products and services and earn money through this platform, your advertisement reaches people around the world and by using my invite link you will get a 10% discount on the subscription price",
  );

  // لجعل textarea يتمدد تلقائياً مع النص
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  const shareText = useMemo(() => {
    if (!inviteLink) {
      return message;
    }

    return `${message}\n\n${inviteLink}`;
  }, [inviteLink, message]);

  const handleCopy = async () => {
    if (!inviteLink) {
      toast.error(
        isArabic ? "رابط الدعوة غير جاهز بعد" : "Invite link is not ready yet",
      );
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
    toast.success(
      isArabic ? "تم نسخ رابط الدعوة بنجاح" : "Invite link copied successfully",
    );
  };

  const handleSendInvitation = async () => {
    if (!inviteLink) {
      toast.error(
        isArabic ? "رابط الدعوة غير جاهز بعد" : "Invite link is not ready yet",
      );
      return;
    }

    if (isMobileShare && navigator.share) {
      try {
        await navigator.share({
          title: isArabic ? "دعوة للانضمام" : "Invitation to join",
          text: message,
          url: inviteLink,
        });
      } catch {
        // ignore user-cancelled native share
      }
      return;
    }

    await navigator.clipboard.writeText(shareText);
    toast.success(
      isArabic
        ? "تم نسخ رسالة الدعوة مع الرابط"
        : "Invitation message and link copied",
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
            className="invite-modal dark:bg-gray-800 dark:text-slate-200"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button className="close-btn" onClick={onClose}>
              <FaTimes />
            </button>
            <h2 className="invite-title">
              {isArabic ? " دعوة الآخرين" : "Invite new person"}
            </h2>
            <p className="invite-subtitle">
              {isArabic
                ? "أدع الآخرين للاشتراك وشجعهم على التفعيل ، واكسب مكافآت مالية"
                : "Invite others to subscribe and encourage them to activate their account, and earn financial rewards"}
            </p>

            <textarea
              className="invite-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              ref={textareaRef}
              rows={1}
            />

            <div
              className="
                  invite-link dark:bg-gray-800
                dark:text-slate-200
                "
            >
              <a
                href={inviteLink}
                target="_blank"
                rel="noreferrer"
                className="invite-link-anchor"
              >
                {inviteLink}
              </a>
              <button onClick={handleCopy} type="button">
                <FaRegCopy />
              </button>
            </div>

            <button className="invite-send-btn" onClick={handleSendInvitation}>
              {isMobileShare
                ? isArabic
                  ? "مشاركة الدعوة"
                  : "Share invitation"
                : isArabic
                  ? "نسخ رسالة الدعوة"
                  : "Copy invitation message"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InviteModal;
