import { $Enums } from "@prisma/client";

export const USER_INTEREST_KEYS = [
  "PROPERTY",
  "CARS",
  "HOME_FURNITURE",
  "MEDICAL_DEVICES",
  "OTHER",
] as const;

export type UserInterestKey = (typeof USER_INTEREST_KEYS)[number];

export const DEFAULT_USER_INTEREST_ORDER: UserInterestKey[] = [
  "PROPERTY",
  "CARS",
  "HOME_FURNITURE",
  "MEDICAL_DEVICES",
  "OTHER",
];

export const PENDING_INTEREST_ORDER_STORAGE_KEY = "pending-interest-order";

export const PRIMARY_CATEGORY_KEYS = [
  "PROPERTY",
  "NEW_CAR",
  "USED_CAR",
  "HOME_FURNITURE",
  "MEDICAL_DEVICES",
  "OTHER",
] as const;

export type PrimaryCategoryKey = (typeof PRIMARY_CATEGORY_KEYS)[number];

type PrimaryCategoryIconName =
  | "MdOutlineRealEstateAgent"
  | "FaCarSide"
  | "MdCarCrash"
  | "MdOutlineChair"
  | "FaStethoscope"
  | "MdDevicesOther";

export type PrimaryCategoryTab = {
  key: PrimaryCategoryKey;
  interestKey: UserInterestKey;
  type: $Enums.ItemType;
  catName: string;
  icon: PrimaryCategoryIconName;
  nameAr: string;
  nameEn: string;
};

export const PRIMARY_CATEGORY_TABS: PrimaryCategoryTab[] = [
  {
    key: "PROPERTY",
    interestKey: "PROPERTY",
    type: $Enums.ItemType.PROPERTY,
    catName: "All",
    icon: "MdOutlineRealEstateAgent",
    nameAr: "عقارات",
    nameEn: "Real Estate",
  },
  {
    key: "NEW_CAR",
    interestKey: "CARS",
    type: $Enums.ItemType.NEW_CAR,
    catName: "All",
    icon: "FaCarSide",
    nameAr: "سيارة جديدة",
    nameEn: "New Car",
  },
  {
    key: "USED_CAR",
    interestKey: "CARS",
    type: $Enums.ItemType.USED_CAR,
    catName: "All",
    icon: "MdCarCrash",
    nameAr: "سيارة مستعملة",
    nameEn: "Used Car",
  },
  {
    key: "HOME_FURNITURE",
    interestKey: "HOME_FURNITURE",
    type: $Enums.ItemType.HOME_FURNITURE,
    catName: "All",
    icon: "MdOutlineChair",
    nameAr: "الأثاث المنزلي",
    nameEn: "Home Furniture",
  },
  {
    key: "MEDICAL_DEVICES",
    interestKey: "MEDICAL_DEVICES",
    type: $Enums.ItemType.MEDICAL_DEVICE,
    catName: "All",
    icon: "FaStethoscope",
    nameAr: "الأجهزة الطبية",
    nameEn: "Medical Devices",
  },
  {
    key: "OTHER",
    interestKey: "OTHER",
    type: $Enums.ItemType.OTHER,
    catName: "All",
    icon: "MdDevicesOther",
    nameAr: "أخرى",
    nameEn: "Other",
  },
];

export const normalizeUserInterestOrder = (
  value?: readonly string[] | null,
): UserInterestKey[] => {
  const valid = new Set<UserInterestKey>(USER_INTEREST_KEYS);
  const normalized: UserInterestKey[] = [];

  for (const entry of value ?? []) {
    if (valid.has(entry as UserInterestKey)) {
      const casted = entry as UserInterestKey;
      if (!normalized.includes(casted)) {
        normalized.push(casted);
      }
    }
  }

  for (const fallback of DEFAULT_USER_INTEREST_ORDER) {
    if (!normalized.includes(fallback)) {
      normalized.push(fallback);
    }
  }

  return normalized;
};

export const getOrderedPrimaryCategoryTabs = (
  order?: readonly string[] | null,
): PrimaryCategoryTab[] => {
  const normalizedOrder = normalizeUserInterestOrder(order);
  const priority = new Map(
    normalizedOrder.map((interestKey, index) => [interestKey, index]),
  );

  return [...PRIMARY_CATEGORY_TABS].sort((left, right) => {
    const leftPriority =
      priority.get(left.interestKey) ?? Number.MAX_SAFE_INTEGER;
    const rightPriority =
      priority.get(right.interestKey) ?? Number.MAX_SAFE_INTEGER;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return (
      PRIMARY_CATEGORY_TABS.findIndex((item) => item.key === left.key) -
      PRIMARY_CATEGORY_TABS.findIndex((item) => item.key === right.key)
    );
  });
};

export const getPrimaryCategoryFilters = (key: PrimaryCategoryKey) => {
  const tab = PRIMARY_CATEGORY_TABS.find((entry) => entry.key === key);

  if (!tab) {
    return {
      type: undefined,
      catName: "All",
    };
  }

  return {
    type: tab.type,
    catName: tab.catName,
  };
};

export const getPrimaryCategoryKey = (
  type?: $Enums.ItemType,
): PrimaryCategoryKey | null => {
  if (!type) {
    return null;
  }

  if (type === $Enums.ItemType.PROPERTY) {
    return "PROPERTY";
  }

  if (type === $Enums.ItemType.NEW_CAR) {
    return "NEW_CAR";
  }

  if (type === $Enums.ItemType.USED_CAR) {
    return "USED_CAR";
  }

  if (type === $Enums.ItemType.HOME_FURNITURE) {
    return "HOME_FURNITURE";
  }

  if (type === $Enums.ItemType.MEDICAL_DEVICE) {
    return "MEDICAL_DEVICES";
  }

  if (type === $Enums.ItemType.OTHER) {
    return "OTHER";
  }

  return null;
};
