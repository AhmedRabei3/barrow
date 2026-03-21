interface calculateDurationProops {
  selectedRange: {
    startDate: Date;
    endDate: Date;
  } | null;

  rentType: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
}

// 📅 حساب المدة حسب نوع الإيجار
const calculateDuration = ({
  selectedRange,
  rentType,
}: calculateDurationProops) => {
  if (!selectedRange) return 0;

  const diffTime =
    selectedRange.endDate.getTime() - selectedRange.startDate.getTime();

  const days = diffTime / (1000 * 3600 * 24);

  switch (rentType) {
    case "WEEKLY":
      return Math.ceil(days / 7);
    case "MONTHLY":
      return Math.ceil(days / 30);
    case "YEARLY":
      return Math.ceil(days / 365);
    default:
      return Math.ceil(days);
  }
};

export default calculateDuration;
