"use client";

import { memo, useState } from "react";
import { Availability, ItemType } from "@prisma/client";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { formatNumber } from "@/lib/locale-format";

interface PurchaseElementProps {
  itemType: ItemType;
  data: {
    id: string;
    price: number;
    currency?: string;
    status?: Availability;
    title?: string;
  };
}

const PurchaseElement = ({ data, itemType }: PurchaseElementProps) => {
  const { isArabic } = useAppPreferences();
  const {
    price,
    currency = "USD",
    status = Availability.AVAILABLE,
    title,
    id,
  } = data;

  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [offeredPrice, setOfferedPrice] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const submitPurchaseRequest = async () => {
    try {
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
          phoneNumber,
          offeredPrice,
          buyerNote: note || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "فشل إرسال الطلب");
      }

      toast.success("تم إرسال طلب الشراء بنجاح، سيتم التواصل معك قريبًا");
      setOpen(false);
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
          {formatNumber(price, isArabic)}
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
        طلب الشراء
      </button>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h4 className="text-lg font-semibold">طلب شراء</h4>

            <input
              type="tel"
              name="purchaseRequestPhone"
              placeholder="رقم الهاتف"
              className="w-full border rounded-md p-2"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />

            <input
              type="number"
              name="purchaseRequestOfferedPrice"
              placeholder="سعر مقترح (اختياري)"
              className="w-full border rounded-md p-2"
              onChange={(e) => setOfferedPrice(Number(e.target.value))}
            />

            <textarea
              name="purchaseRequestNote"
              placeholder="ملاحظة (اختياري)"
              className="w-full border rounded-md p-2"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            <div className="flex gap-2">
              <button
                onClick={submitPurchaseRequest}
                disabled={loading}
                className="flex-1 bg-emerald-600 text-white py-2 rounded-md"
              >
                {loading ? "جاري الإرسال..." : "إرسال الطلب"}
              </button>

              <button
                onClick={() => setOpen(false)}
                className="flex-1 bg-gray-200 py-2 rounded-md"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        تتم عملية الدفع بحضور الطرفين لتوثيقها رسميًا
      </p>
    </div>
  );
};

export default memo(PurchaseElement);
