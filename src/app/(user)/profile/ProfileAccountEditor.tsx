"use client";
import toast from "react-hot-toast";
import { useState } from "react";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { useProfileVerification } from "./useProfileVerification";
// ...existing code...

type User = {
  id: string;
  name: string;
  email: string;
  profileImage?: string | null;
  // أضف أي خصائص أخرى حسب الحاجة
};

type ProfileAccountEditorProps = {
  user: User;
  onSaved: () => Promise<void>;
};

const ProfileAccountEditor = ({ user, onSaved }: ProfileAccountEditorProps) => {
  const { isArabic } = useAppPreferences();
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const { verificationTicket, codeSent } = useProfileVerification(isArabic);
  // دالة وهمية للتحقق من الرمز
  const verifyCode = () => {
    setVerifyingCode(true);
    setTimeout(() => {
      setVerifyingCode(false);
      toast.success(
        isArabic ? "تم التحقق من الرمز (وهمي)" : "Code verified (dummy)",
      );
      setIsVerified(true);
    }, 1000);
  };

  // دالة وهمية لإرسال رمز التحقق
  const sendVerificationCode = () => {
    setSendingCode(true);
    setTimeout(() => {
      setSendingCode(false);
      toast.success(
        isArabic
          ? "تم إرسال رمز التحقق (وهمي)"
          : "Verification code sent (dummy)",
      );
    }, 1000);
  };
  // ...أي state آخر مستخدم في الكود...

  const submit = async () => {
    try {
      setLoading(true);
      if (!verificationTicket) {
        toast.error(
          isArabic
            ? "يجب التحقق من البريد قبل تعديل الحساب"
            : "Email verification is required before editing account",
        );
        return;
      }
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      if (!trimmedName || !trimmedEmail) {
        toast.error(
          isArabic
            ? "الاسم والبريد الإلكتروني مطلوبان"
            : "Name and email are required",
        );
        return;
      }
      const profileRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-profile-edit-ticket": verificationTicket,
        },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
      });
      const profileJson = await profileRes.json();
      if (!profileRes.ok) {
        toast.error(
          profileJson?.message ||
            (isArabic
              ? "فشل تحديث بيانات الحساب"
              : "Failed to update account info"),
        );
        return;
      }
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        const imageRes = await fetch("/api/profile-image", {
          method: "POST",
          headers: {
            "x-profile-edit-ticket": verificationTicket,
          },
          body: formData,
        });
        const imageJson = await imageRes.json();
        if (!imageRes.ok) {
          toast.error(
            imageJson?.message ||
              (isArabic
                ? "فشل تحديث الصورة"
                : "Failed to update profile image"),
          );
          return;
        }
      }
      // إذا كان هناك دالة update في الأعلى، أبقها، وإلا احذف السطر التالي
      // await update();
      await onSaved();
      setLoading(false);
      toast.success(
        isArabic ? "تم تحديث الحساب بنجاح" : "Account updated successfully",
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(isArabic ? "حدث خطأ غير متوقع" : "Unexpected error");
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 space-y-3">
      <h3 className="text-base sm:text-lg font-semibold text-slate-800">
        {isArabic ? "تعديل البيانات الشخصية" : "Edit personal information"}
      </h3>

      {!isVerified ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={sendVerificationCode}
              disabled={sendingCode}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {sendingCode
                ? isArabic
                  ? "جاري الإرسال..."
                  : "Sending..."
                : isArabic
                  ? "إرسال رمز التحقق"
                  : "Send verification code"}
            </button>
          </div>

          {codeSent && (
            <div className="space-y-2">
              <input
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                placeholder={
                  isArabic ? "أدخل رمز التحقق (6 أرقام)" : "Enter 6-digit code"
                }
                maxLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />

              <button
                type="button"
                onClick={verifyCode}
                disabled={verifyingCode}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {verifyingCode
                  ? isArabic
                    ? "جاري التحقق..."
                    : "Verifying..."
                  : isArabic
                    ? "تأكيد الرمز"
                    : "Verify code"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            {isArabic
              ? "تم التحقق من البريد، يمكنك الآن تعديل الحساب"
              : "Email verified, you can now edit your account"}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={isArabic ? "الاسم" : "Name"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={isArabic ? "البريد الإلكتروني" : "Email"}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />

            <div className="md:col-span-2">
              <label className="text-sm text-slate-600 block mb-1">
                {isArabic
                  ? "صورة الحساب (اختياري)"
                  : "Profile image (optional)"}
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setImageFile(file);
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm hover:bg-sky-700 disabled:opacity-60"
            >
              {loading
                ? isArabic
                  ? "جاري الحفظ..."
                  : "Saving..."
                : isArabic
                  ? "حفظ التعديلات"
                  : "Save changes"}
            </button>
          </div>
        </>
      )}
    </section>
  );
};

export default ProfileAccountEditor;
