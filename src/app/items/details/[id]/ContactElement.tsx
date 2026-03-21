"use client";

import { memo, useState } from "react";
import { Availability, ItemType } from "@prisma/client";
import toast from "react-hot-toast";
import ContactModal from "./ContactModal";

interface ContactOwnerElementProps {
  itemType: ItemType;
  data: {
    id: string;
    price: number;
    currency?: string;
    status?: Availability;
    title?: string;
  };
}

const ContactOwnerElement = ({ data, itemType }: ContactOwnerElementProps) => {
  const {
    price,
    currency = "USD",
    status = Availability.AVAILABLE,
    title,
    id,
  } = data;

  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const submitContact = async () => {
    try {
      if (!phoneNumber.trim()) {
        toast.error("يرجى إدخال رقم الهاتف");
        return;
      }

      setLoading(true);

      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: id,
          itemType,
          phoneNumber,
          note: note || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "فشل إرسال بيانات التواصل");
      }

      toast.success("تم إرسال رقم هاتفك لمالك العنصر بنجاح");
      setOpen(false);
      setPhoneNumber("");
      setNote("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-emerald-50 rounded-xl shadow-md p-4 flex flex-col gap-4">
      {title && (
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      )}

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-emerald-700">
          {price.toLocaleString()}
        </span>
        <span className="text-sm text-gray-600">{currency}</span>
      </div>

      <div
        className={`text-sm font-medium ${
          status === Availability.AVAILABLE
            ? "text-emerald-600"
            : "text-red-500"
        }`}
      >
        {status === Availability.AVAILABLE ? "✔ متوفر حالياً" : "✖ غير متوفر"}
      </div>

      <button
        disabled={status !== Availability.AVAILABLE}
        onClick={() => setOpen(true)}
        className={`w-full py-3 rounded-lg font-semibold transition
          ${
            status === Availability.AVAILABLE
              ? "bg-emerald-600 text-white hover:bg-emerald-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
      >
        تواصل مع المالك
      </button>

      {/* MODAL */}
      {open && (
        <ContactModal
          phoneNumber={phoneNumber}
          setNote={setNote}
          setOpen={setOpen}
          submitContact={submitContact}
          loading={loading}
          note={note}
          setPhoneNumber={setPhoneNumber}
        />
      )}

      <p className="text-xs text-gray-500 text-center">
        الموقع وسيط تواصل فقط ولا يتدخل في الدفع أو الاتفاق بين الطرفين تقتصر
        مهمته على عرض العناصر فقط
      </p>
    </div>
  );
};

export default memo(ContactOwnerElement);
