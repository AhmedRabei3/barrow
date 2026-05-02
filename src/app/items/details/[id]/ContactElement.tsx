"use client";

import { memo, useState } from "react";
import { Availability, ItemType } from "@prisma/client";
import toast from "react-hot-toast";
import ContactModal from "./ContactModal";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { useSession } from "next-auth/react";
import { formatNumber } from "@/lib/locale-format";
import { useRouter } from "next/navigation";

interface ContactOwnerElementProps {
  itemType: ItemType;
  data: {
    id: string;
    ownerId?: string | null;
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
  const router = useRouter();
  const {
    price,
    currency = "USD",
    status = Availability.AVAILABLE,
    title,
    id,
    ownerId,
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
  const canStartChat = Boolean(
    ownerId && session?.user?.id && ownerId !== session.user.id,
  );

  const openChat = () => {
    if (!session?.user?.id) {
      toast.error(t("يرجى تسجيل الدخول أولاً", "Please sign in first"));
      return;
    }

    if (!ownerId || ownerId === session.user.id) {
      return;
    }

    const params = new URLSearchParams({
      ownerId,
      listingId: id,
      title: title ?? "",
      itemType,
    });

    router.push(`/messages?${params.toString()}`);
  };

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
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
          "Accept-Language": isArabic ? "ar" : "en",
        },
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
        <div className="py-2">
          <p className="market-kicker">{t("التواصل", "Contact")}</p>
          <h3 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
        </div>
      )}

      <div className="rounded-[22px] mb-2 border border-blue-200/80 bg-blue-50/55 p-4 dark:border-slate-600/80 dark:bg-slate-950/70">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {t("السعر الحالي", "Current price")}
            </p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-700 dark:text-sky-300">
                {formatNumber(price, isArabic)}
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {currency}
              </span>
            </div>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${
              isAvailable
                ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 dark:border-emerald-400/35 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "border border-rose-500/25 bg-rose-500/10 text-rose-300 dark:border-rose-400/35 dark:bg-rose-500/15 dark:text-rose-200"
            }`}
          >
            {isAvailable
              ? t("متاح", "Available")
              : t("غير متاح", "Unavailable")}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-200">
          <p className="font-semibold text-slate-900 dark:text-white">
            {t("شراء آمن", "Safe communication")}
          </p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            {t(
              "سيتم إرسال معلومات التواصل فقط دون أي دفع داخل الصفحة.",
              "Only your contact details are sent. No payment happens on this page.",
            )}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/55 dark:text-slate-200">
          <p className="font-semibold text-slate-900 dark:text-white">
            {t("تنسيق مباشر", "Direct request")}
          </p>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
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
        className={`w-full mt-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
          isAvailable
            ? "market-primary-btn bg-blue-600 text-blue-200 ring-1 ring-blue-300 shadow-md  hover:-translate-y-0.5 dark:ring-sky-400 dark:shadow-[0_20px_40px_rgba(14,165,233,0.28)]"
            : "cursor-not-allowed border border-slate-300 bg-blue-400 text-slate-200"
        }`}
      >
        {requestTitle}
      </button>

      <button
        onClick={openChat}
        disabled={!canStartChat}
        className={`w-full mt-2 rounded-2xl px-4 py-3.5 text-sm font-bold transition ${
          canStartChat
            ? "market-secondary-btn border border-slate-300 bg-white text-slate-800 hover:-translate-y-0.5 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            : "cursor-not-allowed border border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-500"
        }`}
      >
        {t("بدء محادثة مباشرة", "Start direct chat")}
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

      <p className="mt-4 text-center text-xs leading-6 text-rose-600 dark:text-rose-400">
        {t(
          "المنصة وسيط عرض وتواصل فقط، ولا تتدخل في الدفع أو الاتفاق النهائي بين الطرفين.",
          "The platform only facilitates listing display and contact, and does not handle payment or final agreement between both parties.",
        )}
      </p>
    </div>
  );
};

export default memo(ContactOwnerElement);
