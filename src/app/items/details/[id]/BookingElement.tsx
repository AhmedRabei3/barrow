"use client";
import { useState, useMemo, useCallback, memo } from "react";
import BookingDateRange from "@/app/components/Booking";
import calculateDuration from "./functionallity/durationCalculater";
import handleBooking from "./functionallity/bookingRequest";

interface BookingElementProps {
  data: {
    id: string;
    price?: number;
    rentType?: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | string;
  };
  bookedTransactions: {
    startDate: string;
    endDate: string;
    status: string;
  }[];
}

const BookingElement = ({
  data,
  bookedTransactions = [],
}: BookingElementProps) => {
  const allowedRentTypes = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
  const rentType = allowedRentTypes.includes(
    (data?.rentType as (typeof allowedRentTypes)[number]) ?? "DAILY",
  )
    ? (data?.rentType as (typeof allowedRentTypes)[number])
    : "DAILY";

  const [selectedRange, setSelectedRange] = useState<{
    startDate: Date;
    endDate: Date;
  } | null>(null);

  // safe bookedTransactions default + memoize conversion once when input changes
  const bookedDates = useMemo(() => {
    const safeTx = bookedTransactions ?? [];
    return safeTx
      .filter((t) => t?.status === "APPROVED" || t?.status === "PENDING")
      .map((t) => ({
        start: new Date(t.startDate),
        end: new Date(t.endDate),
      }));
  }, [bookedTransactions]);

  // 🔒 effect في BookingDateRange
  const handleRangeSelect = useCallback(
    (range: { startDate: Date; endDate: Date }) => {
      setSelectedRange(range);
    },
    [],
  );

  const duration = calculateDuration({ selectedRange, rentType });
  const totalPrice = duration * (data?.price || 0);

  const booking = async () => {
    if (!selectedRange) return;
    await handleBooking({
      selectedRange,
      rentType,
      itemId: data?.id,
      totalPrice,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
      <BookingDateRange
        rentType={rentType}
        onSelectRange={handleRangeSelect}
        bookedDates={bookedDates}
      />

      {selectedRange && (
        <div className="mt-4 text-center">
          <p className="text-gray-700 text-base">
            🕒 Duration:{" "}
            <span className="font-semibold text-sky-700">
              {duration}{" "}
              {rentType === "DAILY"
                ? "Day"
                : rentType === "WEEKLY"
                  ? "Week"
                  : rentType === "MONTHLY"
                    ? "Month"
                    : "Year"}
            </span>
          </p>
          <p className="text-lg font-semibold text-rose-600 mt-1">
            Total Price: {totalPrice.toFixed(2)} $
          </p>
        </div>
      )}

      <button
        onClick={booking}
        disabled={!selectedRange}
        className={`mt-4 w-full py-2 rounded-lg font-semibold transition-all duration-300 ${
          selectedRange
            ? "bg-sky-600 text-white hover:bg-sky-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        Booking Now
      </button>
    </div>
  );
};

export default memo(BookingElement);
