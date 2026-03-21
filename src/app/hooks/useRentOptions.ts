export const useRentOptions = () => {
  return [
    { label: "إيجار يومي", value: "DAILY" },
    { label: "إيجار أسبوعي", value: "WEEKLY" },
    { label: "إيجار شهري", value: "MONTHLY" },
  ] as { label: string; value: string }[];
};

export default useRentOptions;
