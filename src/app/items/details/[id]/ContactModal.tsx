"use client";

import React, { Dispatch, SetStateAction } from "react";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface Props {
  phoneNumber: string;
  setPhoneNumber: Dispatch<SetStateAction<string>>;
  note: string;
  submitContact: () => Promise<void>;
  loading: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setNote: Dispatch<SetStateAction<string>>;
}

const ContactModal = ({
  phoneNumber,
  setPhoneNumber,
  note,
  setNote,
  submitContact,
  loading,
  setOpen,
}: Props) => {
  const { isArabic } = useAppPreferences();

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 "
    >
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <h4 className="text-lg font-semibold">
          {isArabic ? "التواصل مع المالك" : "Contact owner"}
        </h4>

        <p className="text-sm text-gray-600">
          {isArabic
            ? "سيتم إرسال رقم هاتفك مباشرة إلى مالك العنصر ليتواصل معك."
            : "Your phone number will be sent directly to the owner so they can contact you."}
        </p>

        <input
          type="tel"
          placeholder={isArabic ? "رقم الهاتف" : "Phone number"}
          className="w-full border rounded-md p-2"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <textarea
          placeholder={isArabic ? "ملاحظة (اختياري)" : "Note (optional)"}
          className="w-full border rounded-md p-2"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={submitContact}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white py-2 rounded-md"
          >
            {loading
              ? isArabic
                ? "جاري الإرسال..."
                : "Sending..."
              : isArabic
                ? "إرسال رقم الهاتف"
                : "Send phone number"}
          </button>

          <button
            onClick={() => setOpen(false)}
            className="flex-1 bg-red-600 text-white py-2 rounded-md hover:bg-red-700 transition-colors"
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
