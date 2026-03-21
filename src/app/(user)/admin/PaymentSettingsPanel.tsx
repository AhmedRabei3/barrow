"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { request } from "@/app/utils/axios";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type PaymentSettings = {
  subscriptionMonthlyPrice: number;
  featuredAdMonthlyPrice: number;
  shamCashWalletCode: string;
  shamCashQrCodeUrl: string;
};

const DEFAULT_SETTINGS: PaymentSettings = {
  subscriptionMonthlyPrice: 30,
  featuredAdMonthlyPrice: 10,
  shamCashWalletCode: "",
  shamCashQrCodeUrl: "",
};

const PaymentSettingsPanel = () => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PaymentSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await request.get("/api/admin/payment-settings");
        const data = res?.data as Partial<PaymentSettings>;

        setForm({
          subscriptionMonthlyPrice:
            Number(data.subscriptionMonthlyPrice) > 0
              ? Number(data.subscriptionMonthlyPrice)
              : DEFAULT_SETTINGS.subscriptionMonthlyPrice,
          featuredAdMonthlyPrice:
            Number(data.featuredAdMonthlyPrice) > 0
              ? Number(data.featuredAdMonthlyPrice)
              : DEFAULT_SETTINGS.featuredAdMonthlyPrice,
          shamCashWalletCode:
            typeof data.shamCashWalletCode === "string"
              ? data.shamCashWalletCode
              : "",
          shamCashQrCodeUrl:
            typeof data.shamCashQrCodeUrl === "string"
              ? data.shamCashQrCodeUrl
              : "",
        });
      } catch {
        toast.error(
          t("تعذر تحميل إعدادات الدفع", "Failed to load payment settings"),
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [t]);

  const handleSave = async () => {
    if (
      form.subscriptionMonthlyPrice <= 0 ||
      form.featuredAdMonthlyPrice <= 0
    ) {
      toast.error(
        t(
          "يرجى إدخال قيم موجبة لأسعار الاشتراك والإعلان المميز",
          "Please enter positive prices for subscription and featured ad",
        ),
      );
      return;
    }

    try {
      setSaving(true);
      const res = await request.put("/api/admin/payment-settings", form);
      const data = res?.data as PaymentSettings;
      setForm(data);
      toast.success(t("تم حفظ الإعدادات بنجاح", "Settings saved successfully"));
    } catch {
      toast.error(t("فشل حفظ الإعدادات", "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="w-full max-w-4xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-8">
        {t("إعدادات الدفع", "Payment Settings")}
      </h1>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
            <span>
              {t(
                "سعر الاشتراك الشهري (USD)",
                "Monthly subscription price (USD)",
              )}
            </span>
            <input
              type="number"
              min={1}
              step={0.01}
              value={form.subscriptionMonthlyPrice}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  subscriptionMonthlyPrice: Number(event.target.value),
                }))
              }
              disabled={loading || saving}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
            <span>
              {t("سعر الإعلان المميز (USD)", "Featured ad price (USD)")}
            </span>
            <input
              type="number"
              min={1}
              step={0.01}
              value={form.featuredAdMonthlyPrice}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  featuredAdMonthlyPrice: Number(event.target.value),
                }))
              }
              disabled={loading || saving}
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
          <span>{t("معرف/رقم محفظة ShamCash", "ShamCash wallet code")}</span>
          <input
            type="text"
            value={form.shamCashWalletCode}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                shamCashWalletCode: event.target.value,
              }))
            }
            disabled={loading || saving}
            placeholder={t("مثال: 987654321", "Example: 987654321")}
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
          <span>{t("رابط صورة QR لـ ShamCash", "ShamCash QR image URL")}</span>
          <input
            type="url"
            value={form.shamCashQrCodeUrl}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                shamCashQrCodeUrl: event.target.value,
              }))
            }
            disabled={loading || saving}
            placeholder="https://.../shamcash-qr.png"
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </label>

        <button
          type="button"
          onClick={handleSave}
          disabled={loading || saving}
          className={`w-full sm:w-auto px-6 py-2 rounded-lg font-semibold text-white transition shadow-md ${
            loading || saving
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-indigo-700 hover:bg-indigo-800"
          }`}
        >
          {saving
            ? t("جاري الحفظ...", "Saving...")
            : t("حفظ إعدادات الدفع", "Save Payment Settings")}
        </button>
      </div>
    </section>
  );
};

export default PaymentSettingsPanel;
