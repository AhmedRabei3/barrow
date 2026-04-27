import {
  TransactionStatus,
  TransactionType,
  type ItemType,
} from "@prisma/client";

export const OWNER_ACTION_OPTIONS = [
  { key: "SELL", labelAr: "للبيع", labelEn: "For sale" },
  { key: "RENT", labelAr: "للإيجار", labelEn: "For rent" },
  { key: "RENTED", labelAr: "مؤجر", labelEn: "Rented" },
  { key: "SOLD", labelAr: "مباع", labelEn: "Sold" },
  { key: "UNAVAILABLE", labelAr: "غير متاح", labelEn: "Unavailable" },
] as const;

export const RENT_TYPE_OPTIONS = [
  { key: "DAILY", labelAr: "يومي", labelEn: "Daily" },
  { key: "WEEKLY", labelAr: "أسبوعي", labelEn: "Weekly" },
  { key: "MONTHLY", labelAr: "شهري", labelEn: "Monthly" },
  { key: "YEARLY", labelAr: "سنوي", labelEn: "Yearly" },
] as const;

export type OwnerActionKey = (typeof OWNER_ACTION_OPTIONS)[number]["key"];
export type RentTypeKey = (typeof RENT_TYPE_OPTIONS)[number]["key"];

export const endpointByType: Record<ItemType, string> = {
  NEW_CAR: "/api/cars/new_car",
  USED_CAR: "/api/cars/used_car",
  PROPERTY: "/api/realestate",
  HOME_FURNITURE: "/api/homeFurniture",
  MEDICAL_DEVICE: "/api/medicalDevices",
  OTHER: "/api/otherItems",
};

export const addPeriodsToDate = (
  date: Date,
  rentType: RentTypeKey,
  periods: number,
) => {
  const endDate = new Date(date);

  switch (rentType) {
    case "DAILY":
      endDate.setDate(endDate.getDate() + periods);
      return endDate;
    case "WEEKLY":
      endDate.setDate(endDate.getDate() + periods * 7);
      return endDate;
    case "MONTHLY":
      endDate.setMonth(endDate.getMonth() + periods);
      return endDate;
    case "YEARLY":
      endDate.setFullYear(endDate.getFullYear() + periods);
      return endDate;
  }
};

export const deriveOwnerAction = (
  sellOrRent?: string | null,
  status?: string | null,
): OwnerActionKey => {
  if (status === "RENTED") return "RENTED";
  if (status === "SOLD") return "SOLD";
  if (status === "MAINTENANCE") return "UNAVAILABLE";
  return sellOrRent === "RENT" ? "RENT" : "SELL";
};

export const getStatusLabel = (
  isArabic: boolean,
  sellOrRent?: string | null,
  status?: string | null,
) => {
  if (status === "RENTED") {
    return isArabic ? "مؤجر" : "Rented";
  }
  if (status === "SOLD") {
    return isArabic ? "مباع" : "Sold";
  }
  if (status === "MAINTENANCE") {
    return isArabic ? "غير متاح" : "Unavailable";
  }
  return sellOrRent === "RENT"
    ? isArabic
      ? "للإيجار"
      : "For rent"
    : isArabic
      ? "للبيع"
      : "For sale";
};

export const getStatusBadgeClass = (
  sellOrRent?: string | null,
  status?: string | null,
) => {
  if (status === "RENTED") {
    return "border border-amber-300 dark:border-amber-700 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-100";
  }
  if (status === "SOLD") {
    return "border border-rose-300 dark:border-rose-700 bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-100";
  }
  if (status === "MAINTENANCE") {
    return "border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100";
  }
  return sellOrRent === "RENT"
    ? "border border-sky-300 dark:border-sky-700 bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-100"
    : "border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-100";
};

export const normalizeManualRentalEndsAt = (value?: string | Date | null) => {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

type TransactionLike = {
  ownerId?: string | null;
  clientId?: string | null;
  type?: string | null;
  status?: string | null;
  payment?: unknown;
  endDate?: string | Date | null;
  createdAt?: string | Date | null;
};

const MANUAL_RENTAL_STATUSES = new Set<string>([
  TransactionStatus.PENDING,
  TransactionStatus.APPROVED,
  TransactionStatus.COMPLETED,
]);

export const getManualRentalEndsAtFromTransactions = (
  transactions: TransactionLike[] | null | undefined,
  ownerId?: string | null,
) => {
  if (!transactions?.length || !ownerId) {
    return null;
  }

  const manualRental = [...transactions]
    .filter(
      (transaction) =>
        transaction.ownerId === ownerId &&
        transaction.clientId === ownerId &&
        transaction.type === TransactionType.RENT &&
        transaction.payment == null &&
        Boolean(transaction.endDate) &&
        MANUAL_RENTAL_STATUSES.has(transaction.status ?? ""),
    )
    .sort((left, right) => {
      const leftTime = new Date(left.createdAt ?? 0).getTime();
      const rightTime = new Date(right.createdAt ?? 0).getTime();
      return rightTime - leftTime;
    })[0];

  return normalizeManualRentalEndsAt(manualRental?.endDate ?? null);
};
