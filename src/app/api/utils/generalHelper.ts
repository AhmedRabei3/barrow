//---------------Helper to convert to date-----------------------//
export const formatDate = (iso?: string) => {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

//---------------Helper to convert to currency-----------------------//
export const formatCurrency = (val?: string) => {
  if (!val) return "0";
  return Number(val).toLocaleString("ar-EG");
};
