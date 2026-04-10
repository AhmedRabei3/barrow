"use client";

import { useEffect, useMemo, useState } from "react";
import type { ItemType } from "@prisma/client";
import toast from "react-hot-toast";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import {
  OWNER_ACTION_OPTIONS,
  RENT_TYPE_OPTIONS,
  addPeriodsToDate,
  deriveOwnerAction,
  endpointByType,
  getStatusBadgeClass,
  getStatusLabel,
  normalizeManualRentalEndsAt,
  type OwnerActionKey,
  type RentTypeKey,
} from "./ownerListingState";

type ListingStatePayload = {
  status: string | null;
  sellOrRent: string | null;
  rentType: string | null;
  manualRentalEndsAt: string | null;
};

interface OwnerListingStateControlProps {
  itemId?: string;
  itemType?: ItemType;
  sellOrRent?: string | null;
  status?: string | null;
  rentType?: string | null;
  initialManualRentalEndsAt?: string | Date | null;
  isOwner?: boolean;
  onSaved?: (payload: ListingStatePayload) => Promise<void> | void;
  onMenuOpenChange?: (isOpen: boolean) => void;
  align?: "left" | "right";
  variant?: "compact" | "hero";
}

const formatEndDate = (value: Date, isArabic: boolean) =>
  new Intl.DateTimeFormat(isArabic ? "ar" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);

const resolveNextState = (
  selectedAction: OwnerActionKey,
  selectedRentType: RentTypeKey,
  currentSellOrRent?: string | null,
) => {
  if (selectedAction === "SELL") {
    return {
      status: "AVAILABLE",
      sellOrRent: "SELL",
      rentType: null,
    };
  }

  if (selectedAction === "RENT") {
    return {
      status: "AVAILABLE",
      sellOrRent: "RENT",
      rentType: selectedRentType,
    };
  }

  if (selectedAction === "RENTED") {
    return {
      status: "RENTED",
      sellOrRent: "RENT",
      rentType: selectedRentType,
    };
  }

  if (selectedAction === "SOLD") {
    return {
      status: "SOLD",
      sellOrRent: "SELL",
      rentType: null,
    };
  }

  return {
    status: "MAINTENANCE",
    sellOrRent: currentSellOrRent === "RENT" ? "RENT" : "SELL",
    rentType: currentSellOrRent === "RENT" ? selectedRentType : null,
  };
};

const OwnerListingStateControl = ({
  itemId,
  itemType,
  sellOrRent,
  status,
  rentType,
  initialManualRentalEndsAt,
  isOwner = false,
  onSaved,
  onMenuOpenChange,
  align = "left",
  variant = "compact",
}: OwnerListingStateControlProps) => {
  const { isArabic } = useAppPreferences();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSellOrRent, setCurrentSellOrRent] = useState(
    sellOrRent ?? null,
  );
  const [currentStatus, setCurrentStatus] = useState(status ?? null);
  const [manualRentalEndsAt, setManualRentalEndsAt] = useState<Date | null>(
    normalizeManualRentalEndsAt(initialManualRentalEndsAt),
  );
  const [selectedAction, setSelectedAction] = useState<OwnerActionKey>(() =>
    deriveOwnerAction(sellOrRent, status),
  );
  const [selectedRentType, setSelectedRentType] = useState<RentTypeKey>(
    () => (rentType as RentTypeKey | null) || "DAILY",
  );
  const [manualRentalPeriods, setManualRentalPeriods] = useState("1");

  useEffect(() => {
    setCurrentSellOrRent(sellOrRent ?? null);
    setCurrentStatus(status ?? null);
    setSelectedAction(deriveOwnerAction(sellOrRent, status));
    setSelectedRentType((rentType as RentTypeKey | null) || "DAILY");
    setManualRentalEndsAt(
      normalizeManualRentalEndsAt(initialManualRentalEndsAt),
    );
  }, [initialManualRentalEndsAt, rentType, sellOrRent, status]);

  useEffect(() => {
    onMenuOpenChange?.(menuOpen);

    return () => {
      onMenuOpenChange?.(false);
    };
  }, [menuOpen, onMenuOpenChange]);

  const rentalPreviewDate = useMemo(() => {
    const parsedPeriods = Number(manualRentalPeriods);
    if (
      selectedAction !== "RENTED" ||
      !Number.isFinite(parsedPeriods) ||
      parsedPeriods < 1
    ) {
      return null;
    }

    return addPeriodsToDate(new Date(), selectedRentType, parsedPeriods);
  }, [manualRentalPeriods, selectedAction, selectedRentType]);

  const badgeClass = getStatusBadgeClass(currentSellOrRent, currentStatus);
  const badgeLabel = getStatusLabel(isArabic, currentSellOrRent, currentStatus);
  const endDateText =
    currentStatus === "RENTED" && manualRentalEndsAt
      ? `${isArabic ? "ينتهي الإيجار في" : "Rental ends on"} ${formatEndDate(manualRentalEndsAt, isArabic)}`
      : null;
  const isHero = variant === "hero";
  const menuPositionClass = align === "right" ? "right-0" : "left-0";
  const badgeSizeClass = isHero
    ? "px-3.5 py-1.5 text-xs sm:text-sm"
    : "px-2.5 py-1 text-[10px]";

  const toggleMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isOwner || !itemId || !itemType) {
      return;
    }

    setMenuOpen((previous) => !previous);
  };

  const saveOwnerAction = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!itemId || !itemType || isSaving) {
      return;
    }

    const formData = new FormData();

    if (selectedAction === "SELL") {
      formData.set("sellOrRent", "SELL");
      formData.set("status", "AVAILABLE");
      formData.set("rentType", "");
    }

    if (selectedAction === "RENT") {
      formData.set("sellOrRent", "RENT");
      formData.set("status", "AVAILABLE");
      formData.set("rentType", selectedRentType);
    }

    if (selectedAction === "RENTED") {
      const parsedPeriods = Number(manualRentalPeriods);
      if (!Number.isFinite(parsedPeriods) || parsedPeriods < 1) {
        toast.error(
          isArabic
            ? "أدخل مدة إيجار صحيحة أكبر من صفر"
            : "Enter a valid rental duration greater than zero",
        );
        return;
      }

      formData.set("sellOrRent", "RENT");
      formData.set("status", "RENTED");
      formData.set("rentType", selectedRentType);
      formData.set("manualRentalPeriods", String(Math.floor(parsedPeriods)));
    }

    if (selectedAction === "SOLD") {
      formData.set("sellOrRent", "SELL");
      formData.set("status", "SOLD");
      formData.set("rentType", "");
    }

    if (selectedAction === "UNAVAILABLE") {
      formData.set("status", "MAINTENANCE");
      formData.set(
        "sellOrRent",
        currentSellOrRent === "RENT" ? "RENT" : "SELL",
      );
      formData.set(
        "rentType",
        currentSellOrRent === "RENT" ? selectedRentType : "",
      );
    }

    try {
      setIsSaving(true);
      const response = await fetch(`${endpointByType[itemType]}/${itemId}`, {
        method: "PATCH",
        headers: {
          "x-lang": isArabic ? "ar" : "en",
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as {
        message?: string;
        listingState?: Partial<ListingStatePayload>;
      } | null;

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            (isArabic
              ? "تعذر تحديث حالة العنصر"
              : "Failed to update listing state"),
        );
      }

      const fallbackState = resolveNextState(
        selectedAction,
        selectedRentType,
        currentSellOrRent,
      );
      const nextManualRentalEndsAt = normalizeManualRentalEndsAt(
        payload?.listingState?.manualRentalEndsAt ??
          (selectedAction === "RENTED" ? rentalPreviewDate : null),
      );

      setCurrentStatus(payload?.listingState?.status ?? fallbackState.status);
      setCurrentSellOrRent(
        payload?.listingState?.sellOrRent ?? fallbackState.sellOrRent,
      );
      setManualRentalEndsAt(nextManualRentalEndsAt);

      toast.success(
        payload?.message ||
          (isArabic ? "تم تحديث حالة العنصر" : "Listing state updated"),
      );

      setMenuOpen(false);

      await onSaved?.({
        status: payload?.listingState?.status ?? fallbackState.status,
        sellOrRent:
          payload?.listingState?.sellOrRent ?? fallbackState.sellOrRent,
        rentType: payload?.listingState?.rentType ?? fallbackState.rentType,
        manualRentalEndsAt: nextManualRentalEndsAt?.toISOString() ?? null,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isArabic
            ? "فشل حفظ التعديلات"
            : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleMenu}
        className={`inline-flex items-center justify-between rounded-md font-bold uppercase tracking-[0.16em] ${badgeClass} ${badgeSizeClass} ${isOwner ? "cursor-pointer hover:opacity-90" : "cursor-default"}`}
      >
        {badgeLabel}
      </button>

      {endDateText ? (
        <p
          className={`mt-1 text-slate-500 dark:text-slate-400 ${
            isHero ? "text-xs sm:text-sm" : "text-[11px]"
          }`}
        >
          {endDateText}
        </p>
      ) : null}

      {isOwner && menuOpen ? (
        <div
          className={`absolute bottom-full z-40 mb-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-2xl dark:border-slate-700 dark:bg-slate-900 ${menuPositionClass}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {isArabic ? "حالة العنصر" : "Listing state"}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {OWNER_ACTION_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSelectedAction(option.key)}
                className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  selectedAction === option.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-slate-200 text-slate-600 hover:border-primary/30 hover:text-primary dark:border-slate-700 dark:text-slate-300"
                }`}
              >
                {isArabic ? option.labelAr : option.labelEn}
              </button>
            ))}
          </div>

          {(selectedAction === "RENT" || selectedAction === "RENTED") && (
            <div className="mt-3 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-300">
                  {isArabic ? "نوع الإيجار" : "Rent type"}
                </label>
                <select
                  value={selectedRentType}
                  onChange={(event) =>
                    setSelectedRentType(event.target.value as RentTypeKey)
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {RENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {isArabic ? option.labelAr : option.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              {selectedAction === "RENTED" ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-300">
                    {isArabic ? "مدة الإيجار" : "Rental duration"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={manualRentalPeriods}
                    onChange={(event) =>
                      setManualRentalPeriods(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder={isArabic ? "مثال: 3" : "e.g. 3"}
                  />
                  {rentalPreviewDate ? (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {isArabic ? "ينتهي الإيجار في" : "Rental will end on"}{" "}
                      {formatEndDate(rentalPreviewDate, isArabic)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {isArabic ? "إلغاء" : "Cancel"}
            </button>
            <button
              type="button"
              onClick={saveOwnerAction}
              disabled={isSaving}
              className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSaving
                ? isArabic
                  ? "جارٍ الحفظ..."
                  : "Saving..."
                : isArabic
                  ? "حفظ"
                  : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default OwnerListingStateControl;
