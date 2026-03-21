import { useState } from "react";
import toast from "react-hot-toast";

export function useProfileVerification(isArabic: boolean) {
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationTicket, setVerificationTicket] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  const sendVerificationCode = async () => {
    try {
      setSendingCode(true);
      const res = await fetch("/api/profile/edit-verification/send-code", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          json?.message ||
            (isArabic
              ? "فشل إرسال رمز التحقق"
              : "Failed to send verification code"),
        );
        return;
      }
      setCodeSent(true);
      toast.success(
        isArabic
          ? "تم إرسال رمز التحقق إلى بريدك"
          : "Verification code was sent to your email",
      );
    } catch {
      toast.error(isArabic ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setSendingCode(false);
    }
  };

  const verifyCode = async () => {
    try {
      if (!verificationCode.trim()) {
        toast.error(isArabic ? "أدخل رمز التحقق" : "Enter verification code");
        return;
      }
      setVerifyingCode(true);
      const res = await fetch("/api/profile/edit-verification/verify-code", {
        method: "POST",
        body: JSON.stringify({ code: verificationCode }),
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(
          json?.message || (isArabic ? "فشل التحقق" : "Verification failed"),
        );
        return;
      }
      setIsVerified(true);
      setVerificationTicket(json.ticket || "");
      toast.success(isArabic ? "تم التحقق بنجاح" : "Verified successfully");
    } catch {
      toast.error(isArabic ? "حدث خطأ غير متوقع" : "Unexpected error");
    } finally {
      setVerifyingCode(false);
    }
  };

  return {
    verificationCode,
    setVerificationCode,
    codeSent,
    isVerified,
    verificationTicket,
    sendingCode,
    verifyingCode,
    sendVerificationCode,
    verifyCode,
  };
}
