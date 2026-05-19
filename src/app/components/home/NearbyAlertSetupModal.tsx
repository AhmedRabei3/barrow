"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { $Enums } from "@prisma/client";
import { useSession } from "next-auth/react";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import { DynamicIcon } from "../addCategory/IconSetter";

type NearbyAlertsMapComponentProps = {
  alerts: ListingAlert[];
  selectedAlertId: string | null;
  draftPosition: [number, number] | null;
  isArabic: boolean;
  onPickDraftPosition: (lat: number, lng: number) => void;
  onSelectAlert: (alert: ListingAlert) => void;
  getAlertLabel: (alert: ListingAlert) => string;
};

const NearbyAlertsMap = dynamic<NearbyAlertsMapComponentProps>(
  // @ts-expect-error Next resolves the client-only module with the source extension here.
  () => import("./NearbyAlertsMap.tsx"),
  {
    ssr: false,
    loading: () => (
      <div className="h-80 w-full animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800" />
    ),
  },
);

const ALERT_RADIUS_OPTIONS_KM = [1, 5, 10, 25, 50];

const ALERT_ITEM_TYPE_OPTIONS = [
  { value: "", ar: "كل العناصر", en: "All items" },
  { value: "PROPERTY", ar: "منزل / عقار", en: "Home / Property" },
  { value: "NEW_CAR", ar: "سيارة جديدة", en: "New car" },
  { value: "USED_CAR", ar: "سيارة مستعملة", en: "Used car" },
  { value: "OTHER", ar: "دراجة نارية / أخرى", en: "Motorcycle / Other" },
];

type ListingAlert = {
  id: string;
  itemType: $Enums.ItemType | null;
  sellOrRent: $Enums.TransactionType | null;
  radiusKm: number;
  centerLat: number;
  centerLng: number;
  isEnabled: boolean;
  category?: {
    name?: string | null;
    nameAr?: string | null;
    nameEn?: string | null;
  } | null;
};

interface NearbyAlertSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NearbyAlertSetupModal({
  isOpen,
  onClose,
}: NearbyAlertSetupModalProps) {
  const { isArabic } = useAppPreferences();
  const { data: session, status: sessionStatus } = useSession();

  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [savedAlerts, setSavedAlerts] = useState<ListingAlert[]>([]);
  const [loadingSavedAlerts, setLoadingSavedAlerts] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [draftPosition, setDraftPosition] = useState<[number, number] | null>(
    null,
  );

  const [alertItemType, setAlertItemType] = useState<$Enums.ItemType | "">("");
  const [alertCategoryName, setAlertCategoryName] = useState("");
  const [alertAction, setAlertAction] = useState<$Enums.TransactionType | "">(
    "",
  );
  const [alertRadiusKm, setAlertRadiusKm] = useState<number>(5);

  const [alertFeedback, setAlertFeedback] = useState<{
    type: "success" | "warning" | "error";
    text: string;
  } | null>(null);

  const [creatingAlert, setCreatingAlert] = useState(false);
  const [updatingAlert, setUpdatingAlert] = useState(false);
  const [deletingAlert, setDeletingAlert] = useState(false);

  const selectedAlert = useMemo(
    () => savedAlerts.find((alert) => alert.id === selectedAlertId) ?? null,
    [savedAlerts, selectedAlertId],
  );

  const resetFormForNewAlert = useCallback(() => {
    setSelectedAlertId(null);
    setAlertItemType("");
    setAlertCategoryName("");
    setAlertAction("");
    setAlertRadiusKm(5);
    setDraftPosition(null);
  }, []);

  const loadSavedAlerts = useCallback(async () => {
    setLoadingSavedAlerts(true);
    try {
      const res = await fetch("/api/listing-alerts", {
        headers: { Accept: "application/json" },
      });
      const data = (await res.json().catch(() => ({}))) as {
        data?: ListingAlert[];
      };

      if (!res.ok) {
        throw new Error(
          t("تعذر تحميل التنبيهات المحفوظة", "Failed to load saved alerts"),
        );
      }

      setSavedAlerts(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setAlertFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error occurred"),
      });
    } finally {
      setLoadingSavedAlerts(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isOpen) return;

    setAlertFeedback(null);
    resetFormForNewAlert();
    void loadSavedAlerts();
  }, [isOpen, loadSavedAlerts, resetFormForNewAlert]);

  const selectSavedAlert = useCallback((alert: ListingAlert) => {
    setSelectedAlertId(alert.id);
    setAlertItemType(alert.itemType ?? "");
    setAlertAction(alert.sellOrRent ?? "");
    setAlertCategoryName(
      alert.category?.nameAr ||
        alert.category?.nameEn ||
        alert.category?.name ||
        "",
    );
    setAlertRadiusKm(alert.radiusKm);
    setDraftPosition([alert.centerLat, alert.centerLng]);
    setAlertFeedback(null);
  }, []);

  const handlePickDraftPosition = useCallback((lat: number, lng: number) => {
    setDraftPosition([lat, lng]);
    setAlertFeedback(null);
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setAlertFeedback({
        type: "warning",
        text: t(
          "الموقع الجغرافي غير مدعوم في هذا المتصفح",
          "Geolocation is not supported in this browser",
        ),
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setDraftPosition([coords.latitude, coords.longitude]);
      },
      () => {
        setAlertFeedback({
          type: "error",
          text: t("فشل تحديد الموقع", "Failed to locate your position"),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [t]);

  const handleCreateAlert = useCallback(async () => {
    if (sessionStatus === "loading") return;

    if (!session?.user?.id) {
      setAlertFeedback({
        type: "warning",
        text: t(
          "يرجى تسجيل الدخول أولاً لتفعيل التنبيه",
          "Please sign in first to enable this alert",
        ),
      });
      return;
    }

    if (!draftPosition) {
      setAlertFeedback({
        type: "warning",
        text: t(
          "حدد موقعًا جديدًا على الخارطة أولاً",
          "Pick a new location on the map first",
        ),
      });
      return;
    }

    setCreatingAlert(true);
    setAlertFeedback(null);

    try {
      const res = await fetch("/api/listing-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: draftPosition[0],
          lng: draftPosition[1],
          radiusKm: alertRadiusKm,
          itemType: alertItemType || null,
          action: alertAction || null,
          catName: alertCategoryName.trim() || null,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(
          data.message ||
            t("تعذر حفظ التنبيه حالياً", "Failed to save alert right now"),
        );
      }

      setAlertFeedback({
        type: "success",
        text: t(
          "تمت إضافة مكان جديد للتنبيه مع الحفاظ على الأماكن السابقة.",
          "A new alert location was added while keeping your previous locations.",
        ),
      });

      await loadSavedAlerts();
      resetFormForNewAlert();
    } catch (error) {
      setAlertFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error occurred"),
      });
    } finally {
      setCreatingAlert(false);
    }
  }, [
    alertAction,
    alertCategoryName,
    alertItemType,
    alertRadiusKm,
    draftPosition,
    loadSavedAlerts,
    resetFormForNewAlert,
    session?.user?.id,
    sessionStatus,
    t,
  ]);

  const handleUpdateSelectedAlert = useCallback(async () => {
    if (!selectedAlert || !draftPosition) {
      setAlertFeedback({
        type: "warning",
        text: t(
          "اختر دبوسًا محفوظًا وحدد موقعه على الخارطة أولاً",
          "Select a saved pin and set its location on the map first",
        ),
      });
      return;
    }

    setUpdatingAlert(true);
    setAlertFeedback(null);

    try {
      const res = await fetch("/api/listing-alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedAlert.id,
          lat: draftPosition[0],
          lng: draftPosition[1],
          radiusKm: alertRadiusKm,
          itemType: alertItemType || null,
          action: alertAction || null,
          catName: alertCategoryName.trim() || null,
          isEnabled: true,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        throw new Error(
          data.message ||
            t("تعذر تحديث التنبيه حالياً", "Failed to update alert right now"),
        );
      }

      setAlertFeedback({
        type: "success",
        text:
          data.message ||
          t("تم تعديل التنبيه بنجاح", "Alert updated successfully"),
      });

      await loadSavedAlerts();
    } catch (error) {
      setAlertFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error occurred"),
      });
    } finally {
      setUpdatingAlert(false);
    }
  }, [
    alertAction,
    alertCategoryName,
    alertItemType,
    alertRadiusKm,
    draftPosition,
    loadSavedAlerts,
    selectedAlert,
    t,
  ]);

  const handleDeleteSelectedAlert = useCallback(async () => {
    if (!selectedAlert) {
      setAlertFeedback({
        type: "warning",
        text: t("حدد دبوسًا محفوظًا للحذف", "Select a saved pin to delete"),
      });
      return;
    }

    const confirmed = window.confirm(
      t(
        "هل أنت متأكد من حذف هذا الطلب؟",
        "Are you sure you want to delete this request?",
      ),
    );

    if (!confirmed) return;

    setDeletingAlert(true);
    setAlertFeedback(null);

    try {
      const res = await fetch(
        `/api/listing-alerts?id=${encodeURIComponent(selectedAlert.id)}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        throw new Error(t("تعذر حذف التنبيه", "Failed to delete alert"));
      }

      setAlertFeedback({
        type: "success",
        text: t(
          "تم حذف الطلب من هذا الموقع",
          "Selected request has been deleted from this site",
        ),
      });

      await loadSavedAlerts();
      resetFormForNewAlert();
    } catch (error) {
      setAlertFeedback({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : t("حدث خطأ غير متوقع", "Unexpected error occurred"),
      });
    } finally {
      setDeletingAlert(false);
    }
  }, [loadSavedAlerts, resetFormForNewAlert, selectedAlert, t]);

  const getAlertLabel = useCallback(
    (alert: ListingAlert) => {
      const categoryName = isArabic
        ? alert.category?.nameAr || alert.category?.name
        : alert.category?.nameEn || alert.category?.name;

      const typeOption = ALERT_ITEM_TYPE_OPTIONS.find(
        (option) => option.value === (alert.itemType ?? ""),
      );

      const label =
        categoryName ||
        (isArabic ? typeOption?.ar : typeOption?.en) ||
        (isArabic ? "عنصر" : "item");

      return isArabic
        ? `مطلوب ${label} بالقرب من هنا`
        : `Wanted ${label} near here`;
    },
    [isArabic],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-1200 flex items-center justify-center bg-slate-950/55 p-3">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t(
              "حدد مكان لنعلمك بالجديد قربه",
              "Availability alerts by locations",
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="x"
          >
            <DynamicIcon size={16} iconName="FaWindowClose" />
          </button>
        </div>

        <div className="grid max-h-[85vh] gap-4 overflow-y-auto p-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-700 dark:border-blue-700/40 dark:bg-blue-900/20 dark:text-blue-200">
              {t(
                "حدد موقعاً من الخريطة لنعلمك عند توفر شيء جديد فيه",
                "Set a new location from map to notifing you if update",
              )}
            </div>

            <NearbyAlertsMap
              alerts={savedAlerts}
              selectedAlertId={selectedAlertId}
              draftPosition={draftPosition}
              isArabic={isArabic}
              onPickDraftPosition={handlePickDraftPosition}
              onSelectAlert={selectSavedAlert}
              getAlertLabel={getAlertLabel}
            />

            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                title={t("موقعي الحالي", "My location")}
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300"
              >
                <DynamicIcon iconName="RiUserLocationLine" size={24} />
              </button>

              <button
                type="button"
                onClick={resetFormForNewAlert}
                title={t("إضافة مكان جديد", "Add new place")}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200"
              >
                <DynamicIcon iconName="MdAddLocationAlt" size={24} />
              </button>

              <button
                type="button"
                onClick={handleUpdateSelectedAlert}
                disabled={!selectedAlertId || updatingAlert}
                title={
                  updatingAlert
                    ? t("جاري التعديل...", "Updating...")
                    : t("تعديل المحدد", "Update selected")
                }
                className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-700 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
              >
                <DynamicIcon iconName="MdEditLocationAlt" size={24} />
              </button>

              <button
                type="button"
                onClick={handleDeleteSelectedAlert}
                disabled={!selectedAlertId || deletingAlert}
                title={
                  deletingAlert
                    ? t("جاري الحذف...", "Deleting...")
                    : t("حذف المحدد", "Delete selected")
                }
                className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2.5 text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-300"
              >
                <DynamicIcon iconName="RiDeleteBin6Line" size={24} />
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-emerald-200/80 bg-white p-3 dark:border-emerald-700/40 dark:bg-slate-900/80">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {selectedAlertId
                ? t("تعديل الدبوس المحدد", "Edit selected pin")
                : t("إعدادات المكان الجديد", "New place settings")}
            </h4>

            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t("اختر العنصر", "Choose item")}
              <select
                value={alertItemType}
                onChange={(event) =>
                  setAlertItemType(event.target.value as $Enums.ItemType | "")
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                {ALERT_ITEM_TYPE_OPTIONS.map((option) => (
                  <option key={option.value || "all"} value={option.value}>
                    {isArabic ? option.ar : option.en}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t("وصف إضافي (اختياري)", "Extra description (optional)")}
              <input
                value={alertCategoryName}
                onChange={(event) => setAlertCategoryName(event.target.value)}
                placeholder={t("مثال: غسالة", "Example: washer")}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>

            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t("نوع العملية (اختياري)", "Action type (optional)")}
              <select
                value={alertAction}
                onChange={(event) =>
                  setAlertAction(
                    event.target.value as $Enums.TransactionType | "",
                  )
                }
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">{t("الكل", "Any")}</option>
                <option value="SELL">{t("بيع", "Sell")}</option>
                <option value="RENT">{t("إيجار", "Rent")}</option>
              </select>
            </label>

            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("حدد نطاق البحث", "Select radius")}
              </h5>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALERT_RADIUS_OPTIONS_KM.map((radius) => {
                  const isSelected = alertRadiusKm === radius;
                  return (
                    <button
                      key={radius}
                      type="button"
                      onClick={() => setAlertRadiusKm(radius)}
                      className={`inline-flex min-w-16 items-center justify-center rounded-full border px-3 py-2 text-sm font-semibold transition-colors ${
                        isSelected
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:text-blue-300"
                      }`}
                      aria-pressed={isSelected}
                    >
                      {radius} {t("كم", "km")}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateAlert}
              disabled={creatingAlert}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300"
            >
              <DynamicIcon iconName="MdNotificationAdd" size={24} />
              <span>
                {creatingAlert
                  ? t("جاري الإضافة...", "Adding...")
                  : t("تفعيل التنبيه", "Add alert")}
              </span>
            </button>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300">
              {loadingSavedAlerts
                ? t("جاري تحميل الأماكن المحفوظة...", "Loading saved places...")
                : t(
                    `الأماكن المحفوظة حالياً: ${savedAlerts.length}`,
                    `Saved places right now: ${savedAlerts.length}`,
                  )}
            </div>

            {alertFeedback && (
              <div
                className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                  alertFeedback.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/50 dark:bg-emerald-900/20 dark:text-emerald-300"
                    : alertFeedback.type === "warning"
                      ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
                      : "border-red-200 bg-red-50 text-red-700 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-300"
                }`}
              >
                {alertFeedback.text}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
