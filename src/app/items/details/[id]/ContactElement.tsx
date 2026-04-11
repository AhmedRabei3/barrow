"use client";

import { memo, useState } from "react";
import { Availability, ItemType } from "@prisma/client";
import toast from "react-hot-toast";
import ContactModal from "./ContactModal";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { useSession } from "next-auth/react";

interface ContactOwnerElementProps {
  itemType: ItemType;
  data: {
    id: string;
    price: number;
    currency?: string;
    status?: Availability;
    title?: string;
    sellOrRent?: string;
  };
}

const ContactOwnerElement = ({ data, itemType }: ContactOwnerElementProps) => {
  const { isArabic } = useAppPreferences();
  const { data: session } = useSession();
  const {
    price,
    currency = "USD",
    status = Availability.AVAILABLE,
    title,
    id,
    sellOrRent,
  } = data;

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(session?.user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const isAvailable = status === Availability.AVAILABLE;
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const requestKind = sellOrRent === "RENT" ? "RENT" : "BUY";
  const requestTitle =
    requestKind === "RENT"
      ? t("طلب إيجار", "Rental request")
      : t("طلب شراء", "Purchase request");

  const submitContact = async () => {
    try {
      if (!fullName.trim()) {
        toast.error(t("يرجى إدخال الاسم", "Please enter your name"));
        return;
      }

      if (!phoneNumber.trim()) {
        toast.error(
          t("يرجى إدخال رقم الهاتف", "Please enter your phone number"),
        );
        return;
      }

      setLoading(true);

      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: id,
          itemType,
          fullName,
          requestKind,
          phoneNumber,
          note: note || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(
          result.message ||
            t("فشل إرسال بيانات التواصل", "Failed to send contact details"),
        );
      }

      toast.success(
        t(
          "تم إرسال معلومات التواصل إلى مالك العنصر بنجاح",
          "Your contact details were sent to the owner successfully",
        ),
      );
      setOpen(false);
      setFullName(session?.user?.name || fullName.trim());
      setPhoneNumber("");
      setNote("");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("فشل إرسال الطلب", "Failed to send request"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="market-panel rounded-[26px] p-5 sm:p-6">
      {title && (
        <div>
          <p className="market-kicker">{t("التواصل", "Contact")}</p>
          <h3 className="mt-2 text-xl font-bold text-white">{title}</h3>
        </div>
      )}

      <div className="rounded-[22px] border border-slate-800/90 bg-slate-950/45 p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {t("السعر الحالي", "Current price")}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-sky-300">
                {price.toLocaleString()}
              </span>
              <span className="text-sm text-slate-400">{currency}</span>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
              isAvailable
                ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : "border border-rose-500/25 bg-rose-500/10 text-rose-300"
            }`}
          >
            {isAvailable
              ? t("متاح", "Available")
              : t("غير متاح", "Unavailable")}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="market-panel-soft rounded-2xl px-4 py-3 text-sm text-slate-300">
          <p className="font-semibold text-white">
            {t("شراء آمن", "Safe communication")}
          </p>
          <p className="mt-1 text-slate-400">
            {t(
              "سيتم إرسال معلومات التواصل فقط دون أي دفع داخل الصفحة.",
              "Only your contact details are sent. No payment happens on this page.",
            )}
          </p>
        </div>
        <div className="market-panel-soft rounded-2xl px-4 py-3 text-sm text-slate-300">
          <p className="font-semibold text-white">
            {t("تنسيق مباشر", "Direct request")}
          </p>
          <p className="mt-1 text-slate-400">
            {t(
              "يتلقى المالك اسمك ورقمك وملاحظتك ليعاود التواصل معك.",
              "The owner receives your name, phone number, and note to contact you back.",
            )}
          </p>
        </div>
      </div>

      <button
        disabled={!isAvailable}
        onClick={() => setOpen(true)}
        className={`w-full rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
          isAvailable
            ? "market-primary-btn"
            : "cursor-not-allowed border border-slate-800 bg-slate-900 text-slate-500"
        }`}
      >
        {requestTitle}
      </button>

      {/* MODAL */}
      {open && (
        <ContactModal
          fullName={fullName}
          setFullName={setFullName}
          phoneNumber={phoneNumber}
          setNote={setNote}
          setOpen={setOpen}
          submitContact={submitContact}
          loading={loading}
          note={note}
          setPhoneNumber={setPhoneNumber}
        />
      )}

      <p className="text-center text-xs leading-6 text-slate-500">
        {t(
          "المنصة وسيط عرض وتواصل فقط، ولا تتدخل في الدفع أو الاتفاق النهائي بين الطرفين.",
          "The platform only facilitates listing display and contact, and does not handle payment or final agreement between both parties.",
        )}
      </p>
    </div>
  );
};

export default memo(ContactOwnerElement);
