"use client";

import { Dispatch, memo, useState } from "react";
import { BsFillGearFill } from "react-icons/bs";
import {
  FaRegCheckCircle,
  FaRegEdit,
  FaRegStar,
  FaRegTrashAlt,
} from "react-icons/fa";
import { useRouter } from "next/navigation";
import { $Enums } from "@prisma/client";
import toast from "react-hot-toast";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface ToolBoxProps {
  setItemIdToEdit: Dispatch<React.SetStateAction<string | null>>;
  setItemIdToDelete: Dispatch<React.SetStateAction<string | null>>;
  itemId: string;
  itemType: $Enums.ItemType;
  currentStatus?: string | null;
  onStatusChanged?: () => Promise<void> | void;
}

const STATUS_OPTIONS = [
  "AVAILABLE",
  "SOLD",
  "RENTED",
  "MAINTENANCE",
] as const;

const endpointByType: Record<$Enums.ItemType, string> = {
  NEW_CAR: "/api/cars/new_car",
  USED_CAR: "/api/cars/used_car",
  PROPERTY: "/api/realestate",
  OTHER: "/api/otherItems",
};

function ToolBox({
  setItemIdToEdit,
  setItemIdToDelete,
  itemId,
  itemType,
  currentStatus,
  onStatusChanged,
}: ToolBoxProps) {
  const [checked, setChecked] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const router = useRouter();
  const { isArabic } = useAppPreferences();

  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const statusLabel: Record<(typeof STATUS_OPTIONS)[number], string> = {
    AVAILABLE: t("متاح", "Available"),
    SOLD: t("مباع", "Sold"),
    RENTED: t("مؤجّر", "Rented"),
    MAINTENANCE: t("صيانة", "Maintenance"),
  };

  const handleGearClick = () => {
    setChecked((prev) => {
      const nextChecked = !prev;
      if (!nextChecked) {
        setStatusMenuOpen(false);
      }
      return nextChecked;
    });
  };

  const handleDeleteClick = () => {
    setChecked(false);
    setStatusMenuOpen(false);
    setItemIdToDelete(itemId);
  };

  const handleEditClick = () => {
    setChecked(false);
    setStatusMenuOpen(false);
    setItemIdToEdit(itemId);
  };

  const handleFeatureClick = () => {
    setChecked(false);
    setStatusMenuOpen(false);
    const params = new URLSearchParams({
      service: "FEATURED_AD",
      itemId,
      itemType,
    });
    router.push(`/payment?${params.toString()}`);
  };

  const handleStatusClick = () => {
    setStatusMenuOpen((prev) => !prev);
  };

  const handleStatusUpdate = async (
    nextStatus: (typeof STATUS_OPTIONS)[number],
  ) => {
    if (isUpdatingStatus || nextStatus === currentStatus) {
      setStatusMenuOpen(false);
      return;
    }

    try {
      setIsUpdatingStatus(true);

      const formData = new FormData();
      formData.set("status", nextStatus);

      const response = await fetch(`${endpointByType[itemType]}/${itemId}`, {
        method: "PATCH",
        headers: {
          "x-lang": isArabic ? "ar" : "en",
        },
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            t("تعذر تحديث حالة الإعلان", "Failed to update listing status"),
        );
      }

      toast.success(
        payload?.message ||
          t("تم تحديث حالة الإعلان", "Listing status updated"),
      );
      setChecked(false);
      setStatusMenuOpen(false);
      await onStatusChanged?.();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("تعذر تحديث الحالة", "Failed to update status"),
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div dir="ltr" className="absolute top-2 left-2 p-0.5 z-30 w-fit">
      <div
        onClick={handleGearClick}
        className="relative flex items-center p-1 text-sm text-gray-800"
      >
        {/* أيقونة المسنن مع حركة */}
        <BsFillGearFill
          style={{
            transition: "transform 0.5s ease",
            color: "white",
            transform: checked
              ? "rotate(0deg) scale(1.5)"
              : "rotate(90deg) scale(1.5)",
          }}
          className="relative z-999 cursor-pointer rounded-full bg-slate-950/82 p-1 shadow-lg ring-1 ring-white/10 backdrop-blur-md"
        />

        {/* الأيقونات المنبثقة مع stagger effect */}
        <div className="relative ml-3 flex gap-3">
          <FaRegStar
            onClick={handleFeatureClick}
            style={{
              transition: "all 0.5s ease",
              transitionDelay: checked ? "0.45s" : "0s",
              transform: checked ? "translateX(0)" : "translateX(-20px)",
              opacity: checked ? 1 : 0,
            }}
            className={`
            text-white
            bg-amber-500/85
            hover:bg-amber-600
            text-xl
            p-1 rounded-lg
            cursor-pointer
            ${checked ? "pointer-events-auto" : "pointer-events-none"}
            `}
          />
          <FaRegCheckCircle
            onClick={handleStatusClick}
            style={{
              transition: "all 0.5s ease",
              transitionDelay: checked ? "0.35s" : "0s",
              transform: checked ? "translateX(0)" : "translateX(-20px)",
              opacity: checked ? 1 : 0,
            }}
            className={`
            text-white
            bg-sky-600/85
            hover:bg-sky-700
            text-xl
            p-1 rounded-lg
            cursor-pointer
            ${checked ? "pointer-events-auto" : "pointer-events-none"}
            ${isUpdatingStatus ? "opacity-60" : ""}
            `}
          />
          <FaRegTrashAlt
            onClick={handleDeleteClick}
            style={{
              transition: "all 0.5s ease",
              transitionDelay: checked ? "0.25s" : "0s",
              transform: checked ? "translateX(0)" : "translateX(-20px)",
              opacity: checked ? 1 : 0,
            }}
            className={`
            text-white
            hover:bg-red-700
            text-xl
            p-1 rounded-lg
            cursor-pointer
            bg-red-600/80
            ${checked ? "pointer-events-auto" : "pointer-events-none"}
            `}
          />
          <FaRegEdit
            onClick={handleEditClick}
            style={{
              transition: "all 0.5s ease",
              transitionDelay: checked ? "0.1s" : "0s",
              transform: checked ? "translateX(0)" : "translateX(-20px)",
              opacity: checked ? 1 : 0,
            }}
            className={`
            text-white
            bg-emerald-600/80
            hover:scale-105
            hover:bg-emerald-700
            p-1 rounded-lg
            cursor-pointer
            text-xl
            ${checked ? "pointer-events-auto" : "pointer-events-none"}
            `}
          />

          {checked && statusMenuOpen ? (
            <div className="absolute left-14 top-10 z-40 min-w-36 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {STATUS_OPTIONS.map((status) => {
                const isActive = currentStatus === status;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => void handleStatusUpdate(status)}
                    disabled={isUpdatingStatus}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{statusLabel[status]}</span>
                    {isActive ? (
                      <span className="text-[11px] font-semibold uppercase">
                        {t("الحالية", "Current")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default memo(ToolBox);
