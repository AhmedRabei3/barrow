"use client";

import { useState, useEffect } from "react";
import { DateRange, Range, RangeKeyDict } from "react-date-range";
import { addDays, addMonths, addWeeks, isWithinInterval } from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

interface BookingDateRangeProps {
  rentType: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  onSelectRange: (range: { startDate: Date; endDate: Date }) => void;
  bookedDates?: { start: Date; end: Date }[];
}

const BookingDateRange: React.FC<BookingDateRangeProps> = ({
  rentType,
  onSelectRange,
  bookedDates = [],
}) => {
  const [range, setRange] = useState<Range[]>([
    {
      startDate: new Date(),
      endDate: addDays(new Date(), 1),
      key: "selection",
    },
  ]);

  /**
   * 🧠 دالة تتحقق مما إذا كان اليوم المحدد محجوزًا
   */
  const isDateBooked = (date: Date) => {
    return bookedDates.some(({ start, end }) =>
      isWithinInterval(date, { start, end }),
    );
  };

  /**
   * 🧩 توليد نهاية افتراضية حسب نوع الإيجار
   */
  useEffect(() => {
    const now = new Date();
    let end;

    switch (rentType) {
      case "WEEKLY":
        end = addWeeks(now, 1);
        break;
      case "MONTHLY":
        end = addMonths(now, 1);
        break;
      case "YEARLY":
        end = addMonths(now, 12);
        break;
      default:
        end = addDays(now, 1);
    }

    setRange([{ startDate: now, endDate: end, key: "selection" }]);
    onSelectRange({ startDate: now, endDate: end });
  }, [rentType, onSelectRange]);

  /**
   * 🎯 عند اختيار المستخدم نطاق جديد
   */
  const handleSelect = (ranges: RangeKeyDict) => {
    const selected = ranges.selection;
    if (!selected?.startDate || !selected?.endDate) return;
    setRange([selected]);
    onSelectRange({
      startDate: selected.startDate,
      endDate: selected.endDate,
    });
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <h3 className="text-lg font-semibold text-gray-800">
        🗓️ اختر نطاق الحجز ({rentType.toLowerCase()})
      </h3>

      <DateRange
        ranges={range}
        onChange={handleSelect}
        moveRangeOnFirstSelection={false}
        minDate={new Date()}
        rangeColors={["#3b82f6"]}
        direction="horizontal"
        disabledDay={(date) => isDateBooked(date)} // 🚫 منع الأيام المحجوزة
      />

      {/* 🩶 توضيح مرئي أسفل التقويم */}
      {bookedDates.length > 0 && (
        <p className="text-sm text-gray-500 mt-2 text-center">
          <span className="inline-block w-3 h-3 bg-gray-300 rounded-sm mr-1 align-middle" />
          الأيام الرمادية محجوزة مسبقًا ولا يمكن اختيارها.
        </p>
      )}
    </div>
  );
};

export default BookingDateRange;
