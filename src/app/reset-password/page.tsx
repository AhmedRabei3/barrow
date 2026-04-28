"use client";
import { useResetToken } from "./useResetToken";
import { useResetPassword } from "./useResetPassword";

import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import PasswordHintsPanel from "@/app/components/inputs/PasswordHintsPanel";

export default function ResetPasswordPage() {
  const token = useResetToken();
  const { isArabic } = useAppPreferences();
  const {
    password,
    setPassword,
    confirm,
    setConfirm,
    message,
    loading,
    handleSubmit,
  } = useResetPassword();

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">
        {isArabic ? "إعادة تعيين كلمة المرور" : "Reset Password"}
      </h2>
      <form onSubmit={(e) => handleSubmit(token, e)}>
        <input
          type="password"
          name="newPassword"
          placeholder={isArabic ? "كلمة المرور الجديدة" : "New Password"}
          className="w-full mb-2 p-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <PasswordHintsPanel value={password} className="mb-3" />
        <input
          type="password"
          name="confirmPassword"
          placeholder={isArabic ? "تأكيد كلمة المرور" : "Confirm Password"}
          className="w-full mb-2 p-2 border rounded"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
          disabled={loading}
        >
          {loading
            ? isArabic
              ? "جاري الحفظ..."
              : "Saving..."
            : isArabic
              ? "حفظ كلمة المرور الجديدة"
              : "Save New Password"}
        </button>
      </form>
      {message && (
        <div className="mt-4 text-center text-red-600">{message}</div>
      )}
    </div>
  );
}
