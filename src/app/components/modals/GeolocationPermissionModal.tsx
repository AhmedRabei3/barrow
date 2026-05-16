"use client";

import { useCallback, useState } from "react";
import { useSearchFilters } from "@/app/hooks/useSearchFilters";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface GeolocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionGranted?: (lat: number, lng: number) => void;
}

/**
 * مودال يطلب إذن الوصول للموقع الجغرافي
 * يظهر عند محاولة المستخدم البحث حسب المسافة
 */
export default function GeolocationPermissionModal({
  isOpen,
  onClose,
  onPermissionGranted,
}: GeolocationPermissionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isArabic } = useAppPreferences();
  const { setFilters } = useSearchFilters();

  const handleRequestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError(
        isArabic
          ? "الموقع الجغرافي غير مدعوم في متصفحك"
          : "Geolocation is not supported in your browser",
      );
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // حفظ الموقع في الفلترة
        setFilters({
          userLat: latitude,
          userLng: longitude,
        });

        onPermissionGranted?.(latitude, longitude);
        setLoading(false);
        onClose();
      },
      (err) => {
        let errorMessage = isArabic
          ? "فشل الحصول على الموقع"
          : "Failed to get location";

        if (err.code === err.PERMISSION_DENIED) {
          errorMessage = isArabic
            ? "تم رفض الوصول للموقع. يرجى تفعيل الإذن في إعدادات المتصفح"
            : "Permission denied. Please enable location access in your browser settings";
        } else if (err.code === err.TIMEOUT) {
          errorMessage = isArabic
            ? "انتهت مهلة الانتظار. حاول مرة أخرى"
            : "Request timed out. Please try again";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMessage = isArabic
            ? "الموقع غير متاح حالياً"
            : "Position is currently unavailable";
        }

        setError(errorMessage);
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  }, [isArabic, setFilters, onPermissionGranted, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
        {/* الأيقونة */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">
              location_on
            </span>
          </div>
        </div>

        {/* العنوان */}
        <h2 className="text-center text-xl font-bold text-slate-900 dark:text-white">
          {isArabic ? "تفعيل الموقع الجغرافي" : "Enable Geolocation"}
        </h2>

        {/* الوصف */}
        <p className="text-center text-slate-600 dark:text-slate-300 text-sm">
          {isArabic
            ? "دع التطبيق يصل إلى موقعك الجغرافي للبحث عن العناصر بالقرب منك"
            : "Allow the app to access your location to find items near you"}
        </p>

        {/* رسالة الخطأ */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* الأزرار */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
          <button
            onClick={handleRequestLocation}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading && (
              <span className="material-symbols-outlined text-lg animate-spin">
                sync
              </span>
            )}
            {loading
              ? isArabic
                ? "جاري..."
                : "Loading..."
              : isArabic
                ? "السماح"
                : "Allow"}
          </button>
        </div>

        {/* ملاحظة */}
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {isArabic
            ? "لن نشارك موقعك مع أي شخص آخر"
            : "We won't share your location with anyone"}
        </p>
      </div>
    </div>
  );
}
