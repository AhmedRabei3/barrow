"use client";

import { memo, useState, useCallback } from "react";
import { Availability, ItemType } from "@prisma/client";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { formatNumber } from "@/lib/locale-format";
import Modal from "@/app/components/modals/Modal";
import Heading from "@/app/components/Heading";
import Input from "@/app/components/inputs/Input";
import { useForm, FieldValues } from "react-hook-form";

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
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      phoneNumber: "",
      offeredPrice: "",
      note: "",
    },
  });

  const submitPurchaseRequest = async (data: FieldValues) => {
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
          phoneNumber: data.phoneNumber,
          offeredPrice: data.offeredPrice
            ? Number(data.offeredPrice)
            : undefined,
          buyerNote: data.note || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || "فشل إرسال الطلب");
      }

      toast.success("تم إرسال طلب الشراء بنجاح، سيتم التواصل معك قريبًا");
      setOpen(false);
      reset();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "فشل إرسال الطلب");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = useCallback(() => {
    setOpen(false);
    reset();
  }, [reset]);

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
      <Modal
        isOpen={open}
        disabled={loading}
        onClose={handleCloseModal}
        onSubmit={handleSubmit(submitPurchaseRequest)}
        title={isArabic ? "طلب شراء" : "Purchase Request"}
        actionLabel={isArabic ? "إرسال الطلب" : "Send Request"}
        secondaryActionLabel={isArabic ? "إلغاء" : "Cancel"}
        secondaryAction={handleCloseModal}
        body={
          <div className="flex flex-col gap-4">
            <Heading
              title={isArabic ? "اطلب هذا المنتج" : "Request This Item"}
              subtitle={
                isArabic
                  ? "أدخل بيانات التواصل وعرضك السعري"
                  : "Provide your contact info and offer"
              }
            />
            <Input
              id="phoneNumber"
              label={isArabic ? "رقم الهاتف" : "Phone Number"}
              type="tel"
              disabled={loading}
              register={register}
              errors={errors}
              required
            />
            <Input
              id="offeredPrice"
              label={
                isArabic
                  ? "السعر المقترح (اختياري)"
                  : "Offered Price (Optional)"
              }
              type="number"
              disabled={loading}
              register={register}
              errors={errors}
            />
            <div className="w-full">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {isArabic
                  ? "ملاحظة إضافية (اختياري)"
                  : "Additional Note (Optional)"}
              </label>
              <textarea
                {...register("note")}
                disabled={loading}
                rows={4}
                className="w-full rounded-md border-2 border-slate-300 bg-white p-3 text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-200 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400 dark:focus:ring-sky-900/60"
                placeholder={
                  isArabic ? "اكتب ملاحظتك هنا..." : "Write your note here..."
                }
              />
            </div>
          </div>
        }
      />

      <p className="text-xs text-gray-500 text-center">
        تتم عملية الدفع بحضور الطرفين لتوثيقها رسميًا
      </p>
    </div>
  );
};

export default memo(PurchaseElement);
