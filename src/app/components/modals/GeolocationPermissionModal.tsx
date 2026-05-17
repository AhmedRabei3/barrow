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
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [settingsHint, setSettingsHint] = useState<string | null>(null);
  const { isArabic } = useAppPreferences();
  const { setFilters } = useSearchFilters();

  const openBrowserLocationSettings = useCallback(() => {
    if (typeof window === "undefined") return false;

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isAndroid = /android/.test(userAgent);
    const isEdge = /edg\//.test(userAgent);
    const isFirefox = /firefox/.test(userAgent);
    const isOpera = /opr\//.test(userAgent);
    const isChrome = /chrome/.test(userAgent) && !isEdge && !isOpera;

    let settingsUrl = "";
    let guide = "";

    if (isIOS) {
      settingsUrl = "app-settings:";
      guide = isArabic
        ? "على iPhone: الإعدادات > Safari > الموقع الجغرافي > سماح"
        : "On iPhone: Settings > Safari > Location > Allow";
    } else if (isEdge) {
      settingsUrl = "edge://settings/content/location";
      guide = isArabic
        ? "في Edge: إعدادات الموقع > السماح للموقع لهذا الموقع"
        : "In Edge: Location settings > Allow location for this site";
    } else if (isFirefox) {
      settingsUrl = "about:preferences#privacy";
      guide = isArabic
        ? "في Firefox: الإعدادات > الخصوصية والأمان > الأذونات > الموقع"
        : "In Firefox: Settings > Privacy & Security > Permissions > Location";
    } else if (isOpera) {
      settingsUrl = "opera://settings/content/location";
      guide = isArabic
        ? "في Opera: إعدادات الموقع > السماح لهذا الموقع"
        : "In Opera: Location settings > Allow this site";
    } else if (isChrome || isAndroid) {
      settingsUrl = "chrome://settings/content/location";
      guide = isArabic
        ? "في Chrome: إعدادات الموقع > السماح للموقع الحالي"
        : "In Chrome: Site settings > Location > Allow";
    }

    setSettingsHint(guide || null);

    if (!settingsUrl) {
      return false;
    }

    try {
      const openedWindow = window.open(settingsUrl, "_blank");
      if (openedWindow) return true;
    } catch {
      // ignore
    }

    // Only attempt href navigation for http/https URLs — browser-protocol
    // URLs (edge://, chrome://, opera://) cannot be loaded via location.href
    // and will generate a "Not allowed to load local resource" console error.
    if (/^https?:\/\//i.test(settingsUrl)) {
      try {
        window.location.href = settingsUrl;
        return true;
      } catch {
        return false;
      }
    }

    return false;
  }, [isArabic]);

  const handleRequestLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPermissionDenied(false);

    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      const isLocalhost =
        host === "localhost" || host === "127.0.0.1" || host === "::1";

      // On mobile/LAN HTTP (e.g. 192.168.x.x), browser geolocation is blocked
      // even if the user enabled permission in browser settings.
      if (!window.isSecureContext && !isLocalhost) {
        setError(
          isArabic
            ? "تحديد الموقع يتطلب اتصالاً آمناً (HTTPS). على الهاتف استخدم رابط HTTPS بدلاً من عنوان IP المحلي."
            : "Location access requires a secure context (HTTPS). On mobile, use an HTTPS URL instead of a local network IP.",
        );
        setSettingsHint(
          isArabic
            ? "إذا كنت في التطوير المحلي، استخدم التحديد اليدوي على الخارطة أو شغّل نسخة HTTPS."
            : "If you are on local development, use manual map selection or run the app over HTTPS.",
        );
        setLoading(false);
        return;
      }
    }

    if (!navigator.geolocation) {
      setError(
        isArabic
          ? "الموقع الجغرافي غير مدعوم في متصفحك"
          : "Geolocation is not supported in your browser",
      );
      setLoading(false);
      return;
    }

    if ("permissions" in navigator && navigator.permissions?.query) {
      try {
        const status = await navigator.permissions.query({
          name: "geolocation",
        });

        if (status.state === "denied") {
          setPermissionDenied(true);
          setError(
            isArabic
              ? "إذن الموقع مرفوض. فعّل إذن الموقع لهذا الموقع من إعدادات المتصفح ثم أعد المحاولة."
              : "Location permission is denied. Enable location for this site in browser settings and try again.",
          );
          const opened = openBrowserLocationSettings();
          if (!opened) {
            setSettingsHint(
              isArabic
                ? "افتح إعدادات المتصفح ثم فعّل إذن الموقع لهذا الموقع"
                : "Open your browser settings and enable location permission for this site",
            );
          }
          setLoading(false);
          return;
        }
      } catch {
        // Some browsers throw on permissions.query; continue with getCurrentPosition.
      }
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
          setPermissionDenied(true);
          errorMessage = isArabic
            ? "تم رفض الوصول للموقع"
            : "Location permission was denied";

          // حاول فتح إعدادات المتصفح مباشرة بعد الرفض.
          const opened = openBrowserLocationSettings();
          if (!opened) {
            setSettingsHint(
              isArabic
                ? "افتح إعدادات المتصفح ثم فعّل إذن الموقع لهذا الموقع"
                : "Open your browser settings and enable location permission for this site",
            );
          }
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
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      },
    );
  }, [
    isArabic,
    setFilters,
    onPermissionGranted,
    onClose,
    openBrowserLocationSettings,
  ]);

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
            {permissionDenied && (
              <div className="mt-3 space-y-2">
                <button
                  type="button"
                  onClick={openBrowserLocationSettings}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-base">
                    settings
                  </span>
                  {isArabic ? "فتح إعدادات المتصفح" : "Open browser settings"}
                </button>

                {settingsHint && (
                  <p className="text-xs text-red-700/90 dark:text-red-200/90 leading-5">
                    {settingsHint}
                  </p>
                )}
              </div>
            )}
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
