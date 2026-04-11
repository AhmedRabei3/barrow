"use client";

import React, { Dispatch, SetStateAction } from "react";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface Props {
  fullName: string;
  setFullName: Dispatch<SetStateAction<string>>;
  phoneNumber: string;
  setPhoneNumber: Dispatch<SetStateAction<string>>;
  note: string;
  submitContact: () => Promise<void>;
  loading: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  setNote: Dispatch<SetStateAction<string>>;
}

const ContactModal = ({
  fullName,
  setFullName,
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 px-4 backdrop-blur-md"
    >
      <div className="market-panel w-full max-w-md rounded-[26px] p-6 space-y-4">
        <h4 className="text-lg font-semibold text-white">
          {isArabic ? "التواصل مع المالك" : "Contact owner"}
        </h4>

        <p className="text-sm leading-6 text-slate-400">
          {isArabic
            ? "أدخل اسمك ورقم هاتفك ليتم إرسالهما مباشرة إلى مالك العنصر ليتواصل معك."
            : "Enter your name and phone number. They will be sent directly to the owner so they can contact you."}
        </p>

        <input
          type="text"
          placeholder={isArabic ? "الاسم الكامل" : "Full name"}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          type="tel"
          placeholder={isArabic ? "رقم الهاتف" : "Phone number"}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <textarea
          placeholder={isArabic ? "ملاحظة (اختياري)" : "Note (optional)"}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-sm text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={submitContact}
            disabled={loading}
            className="market-primary-btn flex-1 rounded-2xl py-3 text-sm font-bold disabled:opacity-60"
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
            className="market-secondary-btn flex-1 rounded-2xl py-3 text-sm font-bold transition-colors"
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
