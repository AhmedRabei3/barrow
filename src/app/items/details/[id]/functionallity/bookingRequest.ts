"use client ";

import toast from "react-hot-toast";

interface BookingProps {
  totalPrice: number;
  selectedRange: {
    startDate: Date;
    endDate: Date;
  } | null;
  rentType: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  itemId: string;
}
const handleBooking = async ({
  selectedRange,
  rentType,
  itemId,
  totalPrice,
}: BookingProps) => {
  if (!selectedRange) {
    toast.error("الرجاء اختيار نطاق الحجز أولاً");
    return;
  }

  try {
    const res = await fetch("/api/transactions/rent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId,
        rentType,
        startDate: selectedRange.startDate,
        endDate: selectedRange.endDate,
        totalPrice,
      }),
    });

    const result = await res.json();
    if (res.ok) {
      toast.success("Your request has been submited");
    } else {
      toast.error(`فشل إرسال الحجز: ${result.message || "حدث خطأ"}`);
    }
  } catch (error) {
    console.error(error);
    toast.error("حدث خطأ أثناء إرسال الطلب");
  }
};

export default handleBooking;
