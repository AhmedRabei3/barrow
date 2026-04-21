"use client";

import { ChangeEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { request } from "@/app/utils/axios";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import ImageUpload from "@/app/components/imageUploader/ImageUpload";
import FormInput from "@/app/components/modals/body/FormInputs";

interface PaymentSettings {
  subscriptionMonthlyPrice: number;
  featuredAdMonthlyPrice: number;
  url: string | null;
  publicId: string | null;
  paymentResetEmail: string;
  ownerProfitWalletCode: string;
}

interface OwnerProfitSummary {
  subscriptionRevenueTotal: number;
  previousOwnerWithdrawalsTotal: number;
  readyUserProfitsTotal: number;
  pendingUserProfitsTotal: number;
  operatingReserve: number;
  availableToWithdraw: number;
}

interface OwnerProfitWithdrawalHistoryItem {
  id: string;
  amount: number;
  walletCode: string;
  note: string | null;
  status: string;
  createdAt: string;
}

interface OwnerProfitResponse {
  walletCode: string;
  summary: OwnerProfitSummary;
  history: OwnerProfitWithdrawalHistoryItem[];
}

const DEFAULT_SETTINGS: PaymentSettings = {
  subscriptionMonthlyPrice: 30,
  featuredAdMonthlyPrice: 10,
  url: null,
  publicId: null,
  paymentResetEmail: "",
  ownerProfitWalletCode: "",
};

const EMPTY_OWNER_DATA: OwnerProfitResponse = {
  walletCode: "",
  summary: {
    subscriptionRevenueTotal: 0,
    previousOwnerWithdrawalsTotal: 0,
    readyUserProfitsTotal: 0,
    pendingUserProfitsTotal: 0,
    operatingReserve: 0,
    availableToWithdraw: 0,
  },
  history: [],
};

const PaymentSettingsPanel = () => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_SETTINGS);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [ownerData, setOwnerData] =
    useState<OwnerProfitResponse>(EMPTY_OWNER_DATA);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNote, setWithdrawNote] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [settingsResponse, ownerResponse] = await Promise.all([
        request.get("/api/admin/payment-settings"),
        request.get("/api/admin/payment-settings/owner-withdrawals"),
      ]);

      const settingsData = settingsResponse.data?.data;
      const ownerPayload = ownerResponse.data;

      setSettings({
        subscriptionMonthlyPrice: Number(
          settingsData?.subscriptionMonthlyPrice ??
            DEFAULT_SETTINGS.subscriptionMonthlyPrice,
        ),
        featuredAdMonthlyPrice: Number(
          settingsData?.featuredAdMonthlyPrice ??
            DEFAULT_SETTINGS.featuredAdMonthlyPrice,
        ),
        url: typeof settingsData?.url === "string" ? settingsData.url : null,
        publicId:
          typeof settingsData?.publicId === "string"
            ? settingsData.publicId
            : null,
        paymentResetEmail:
          typeof settingsData?.paymentResetEmail === "string"
            ? settingsData.paymentResetEmail
            : DEFAULT_SETTINGS.paymentResetEmail,
        ownerProfitWalletCode:
          typeof settingsData?.ownerProfitWalletCode === "string"
            ? settingsData.ownerProfitWalletCode
            : typeof ownerPayload?.walletCode === "string"
              ? ownerPayload.walletCode
              : DEFAULT_SETTINGS.ownerProfitWalletCode,
      });

      setOwnerData({
        walletCode:
          typeof ownerPayload?.walletCode === "string"
            ? ownerPayload.walletCode
            : "",
        summary: ownerPayload?.summary || EMPTY_OWNER_DATA.summary,
        history: ownerPayload?.history || [],
      });
    } catch {
      toast.error(
        t("فشل في تحميل إعدادات الدفع", "Failed to load payment settings"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNumberChange =
    (key: "subscriptionMonthlyPrice" | "featuredAdMonthlyPrice") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = Number(event.target.value);
      setSettings((current) => ({
        ...current,
        [key]: Number.isFinite(nextValue) ? nextValue : 0,
      }));
    };

  const handleTextChange =
    (key: "paymentResetEmail" | "ownerProfitWalletCode") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setSettings((current) => ({
        ...current,
        [key]: event.target.value,
      }));
    };

  const formatMoney = (value: number) => `$${Number(value || 0).toFixed(2)}`;

  const handleSave = async () => {
    if (settings.subscriptionMonthlyPrice <= 0) {
      toast.error(
        t(
          "سعر الاشتراك الشهري يجب أن يكون أكبر من صفر",
          "Monthly subscription price must be greater than zero",
        ),
      );
      return;
    }

    if (settings.featuredAdMonthlyPrice <= 0) {
      toast.error(
        t(
          "سعر الإعلان المميز يجب أن يكون أكبر من صفر",
          "Featured ad price must be greater than zero",
        ),
      );
      return;
    }

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append(
        "subscriptionMonthlyPrice",
        String(settings.subscriptionMonthlyPrice),
      );
      formData.append(
        "featuredAdMonthlyPrice",
        String(settings.featuredAdMonthlyPrice),
      );
      formData.append("paymentResetEmail", settings.paymentResetEmail.trim());
      formData.append(
        "ownerProfitWalletCode",
        settings.ownerProfitWalletCode.trim(),
      );

      if (selectedImages[0]) {
        formData.append("images", selectedImages[0]);
      }

      const response = await request.put(
        "/api/admin/payment-settings",
        formData,
      );
      const data = response.data?.data;

      setSettings((current) => ({
        ...current,
        subscriptionMonthlyPrice: Number(
          data?.subscriptionMonthlyPrice ?? current.subscriptionMonthlyPrice,
        ),
        featuredAdMonthlyPrice: Number(
          data?.featuredAdMonthlyPrice ?? current.featuredAdMonthlyPrice,
        ),
        url: typeof data?.url === "string" ? data.url : current.url,
        publicId:
          typeof data?.publicId === "string" ? data.publicId : current.publicId,
        paymentResetEmail:
          typeof data?.paymentResetEmail === "string"
            ? data.paymentResetEmail
            : current.paymentResetEmail,
        ownerProfitWalletCode:
          typeof data?.ownerProfitWalletCode === "string"
            ? data.ownerProfitWalletCode
            : current.ownerProfitWalletCode,
      }));
      setSelectedImages([]);
      toast.success(t("تم حفظ الإعدادات بنجاح", "Settings saved successfully"));
    } catch {
      toast.error(t("فشل في حفظ الإعدادات", "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleOwnerWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t("أدخل مبلغ سحب صالح", "Enter a valid withdrawal amount"));
      return;
    }

    if (!settings.ownerProfitWalletCode.trim()) {
      toast.error(t("أدخل محفظة المالك أولاً", "Enter the owner wallet first"));
      return;
    }

    try {
      setWithdrawing(true);
      const response = await request.post(
        "/api/admin/payment-settings/owner-withdrawals",
        {
          amount,
          note: withdrawNote.trim(),
          walletCode: settings.ownerProfitWalletCode.trim(),
        },
      );

      setOwnerData({
        walletCode: response.data?.walletCode || settings.ownerProfitWalletCode,
        summary: response.data?.summary || ownerData.summary,
        history: response.data?.history || ownerData.history,
      });
      setWithdrawAmount("");
      setWithdrawNote("");
      toast.success(
        response.data?.message ||
          t("تم تسجيل السحب بنجاح", "Withdrawal recorded successfully"),
      );
    } catch (error: unknown) {
      const fallbackMessage = t(
        "تعذر تسجيل سحب أرباح المالك",
        "Failed to record owner withdrawal",
      );
      const message: string =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } })
          .response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || fallbackMessage
          : fallbackMessage;
      toast.error(message);
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 rounded-3xl sm:p-1">
      <div className="admin-card rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <span className="admin-kicker">
            {t("إدارة الدفع", "Payment operations")}
          </span>
          <h2 className="text-xl font-bold text-white">
            {t("إعدادات الدفع", "Payment Settings")}
          </h2>
          <p className="text-sm text-slate-400">
            {t(
              "تحديث أسعار الاشتراك وصورة الدفع وكلمة إعادة التعيين، مع إدارة سحب أرباح مالك التطبيق بشكل آمن.",
              "Update prices, payment image, password reset destination, and safely manage the app-owner profit withdrawals.",
            )}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            name={"subscriptionMonthlyPrice" as never}
            type="number"
            label={t("سعر الاشتراك الشهري", "Monthly subscription price")}
            value={settings.subscriptionMonthlyPrice}
            onChange={handleNumberChange("subscriptionMonthlyPrice")}
          />
          <FormInput
            name={"featuredAdMonthlyPrice" as never}
            type="number"
            label={t("سعر الإعلان المميز", "Featured ad price")}
            value={settings.featuredAdMonthlyPrice}
            onChange={handleNumberChange("featuredAdMonthlyPrice")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="admin-card-soft rounded-2xl p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-100">
                {t("بريد إعادة تعيين كلمة المرور", "Password reset email")}
              </h3>
              <p className="text-xs text-slate-400">
                {t(
                  "يُرسل إليه رابط إعادة تعيين كلمة مرور إعدادات الدفع. عند تركه فارغاً سيتم استخدام بريد حساب المدير الحالي.",
                  "This email receives the payment-settings password reset link. If left empty, the current admin account email is used.",
                )}
              </p>
            </div>

            <FormInput
              name={"paymentResetEmail" as never}
              type="email"
              label={t("البريد المخصص", "Dedicated email")}
              value={settings.paymentResetEmail}
              onChange={handleTextChange("paymentResetEmail")}
            />
          </div>

          <div className="admin-card-soft rounded-2xl p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-100">
                {t("محفظة مالك التطبيق", "App owner wallet")}
              </h3>
              <p className="text-xs text-slate-400">
                {t(
                  "هذه هي المحفظة التي تُسجل عليها سحوبات أرباح مالك التطبيق من الأرباح الجاهزة فقط.",
                  "This wallet is used to record owner-profit withdrawals from the safely available profit only.",
                )}
              </p>
            </div>

            <FormInput
              name={"ownerProfitWalletCode" as never}
              type="text"
              label={t("رمز المحفظة", "Wallet code")}
              value={settings.ownerProfitWalletCode}
              onChange={handleTextChange("ownerProfitWalletCode")}
            />
          </div>
        </div>

        <div className="admin-card-soft flex flex-col gap-3 rounded-2xl p-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">
              {t("صورة الدفع الحالية", "Current payment image")}
            </h3>
            <p className="text-xs text-slate-400">
              {t(
                "يمكنك استبدال الصورة الحالية برفع صورة جديدة واحدة.",
                "You can replace the current image by uploading one new image.",
              )}
            </p>
          </div>

          {selectedImages.length === 0 && settings.url ? (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={settings.url}
                alt={t("صورة الدفع", "Payment image")}
                className="h-56 w-full object-contain bg-slate-950 p-3"
              />
            </div>
          ) : null}

          <ImageUpload
            selectedImages={selectedImages}
            setSelectedImages={setSelectedImages}
          />
        </div>

        <div className="admin-card-soft rounded-2xl p-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-base font-semibold text-slate-100">
              {t("سحب أرباح مالك التطبيق", "App owner profit withdrawals")}
            </h3>
            <p className="text-xs text-slate-400">
              {t(
                "الرصيد القابل للسحب = إجمالي إيرادات الاشتراكات المدفوعة - سحوبات المالك السابقة - أرباح المستخدمين الجاهزة - أرباح المستخدمين المعلقة - 10% مصاريف تشغيلية.",
                "Withdrawable balance = total paid-subscription revenue - previous owner withdrawals - ready user profits - pending user profits - 10% operating reserve.",
              )}
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title={t("إيرادات الاشتراكات", "Subscription revenue")}
              value={formatMoney(ownerData.summary.subscriptionRevenueTotal)}
            />
            <SummaryCard
              title={t("سحوبات المالك السابقة", "Previous owner withdrawals")}
              value={formatMoney(
                ownerData.summary.previousOwnerWithdrawalsTotal,
              )}
            />
            <SummaryCard
              title={t("أرباح المستخدمين الجاهزة", "Ready user profits")}
              value={formatMoney(ownerData.summary.readyUserProfitsTotal)}
            />
            <SummaryCard
              title={t("أرباح المستخدمين المعلقة", "Pending user profits")}
              value={formatMoney(ownerData.summary.pendingUserProfitsTotal)}
            />
            <SummaryCard
              title={t("المصاريف التشغيلية 10%", "10% operating reserve")}
              value={formatMoney(ownerData.summary.operatingReserve)}
            />
            <SummaryCard
              title={t("الرصيد القابل للسحب", "Available to withdraw")}
              value={formatMoney(ownerData.summary.availableToWithdraw)}
              emphasized
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
            <div className="admin-card rounded-2xl p-4">
              <h4 className="text-sm font-semibold text-slate-100">
                {t("تسجيل سحب جديد", "Record new withdrawal")}
              </h4>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    {t("المبلغ", "Amount")}
                  </label>
                  <input
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="admin-input w-full rounded-xl px-3 py-2 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-300">
                    {t("ملاحظة", "Note")}
                  </label>
                  <textarea
                    value={withdrawNote}
                    onChange={(event) => setWithdrawNote(event.target.value)}
                    className="admin-textarea min-h-24 w-full rounded-xl px-3 py-2 text-sm outline-none transition"
                    placeholder={t(
                      "مثال: تم السحب إلى محفظة المالك الرئيسية",
                      "Example: withdrawn to the primary owner wallet",
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOwnerWithdraw}
                  disabled={loading || withdrawing}
                  className="admin-btn-success w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed"
                >
                  {withdrawing
                    ? t("جارٍ التسجيل...", "Recording...")
                    : t("تسجيل السحب", "Record withdrawal")}
                </button>
              </div>
            </div>

            <div className="admin-card rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-100">
                  {t("سجل سحوبات المالك", "Owner withdrawal history")}
                </h4>
                <span className="text-xs text-slate-500">
                  {settings.ownerProfitWalletCode ||
                    ownerData.walletCode ||
                    t("محفظة غير محددة", "Wallet not set")}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {ownerData.history.length === 0 ? (
                  <div className="admin-card-soft rounded-xl px-3 py-4 text-sm text-slate-400">
                    {t(
                      "لا توجد سحوبات مسجلة حتى الآن",
                      "No owner withdrawals recorded yet",
                    )}
                  </div>
                ) : (
                  ownerData.history.map((entry) => (
                    <div
                      key={entry.id}
                      className="admin-card-soft rounded-xl px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-100">
                          {formatMoney(entry.amount)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(entry.createdAt).toLocaleDateString(
                            isArabic ? "ar" : "en-US",
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {entry.walletCode}
                      </div>
                      {entry.note ? (
                        <div className="mt-2 text-sm text-slate-300">
                          {entry.note}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="admin-btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed"
          >
            {saving
              ? t("جارٍ الحفظ...", "Saving...")
              : t("حفظ الإعدادات", "Save settings")}
          </button>
        </div>
      </div>
    </section>
  );
};

const SummaryCard = ({
  title,
  value,
  emphasized = false,
}: {
  title: string;
  value: string;
  emphasized?: boolean;
}) => (
  <div
    className={`rounded-2xl p-4 ${
      emphasized
        ? "border border-emerald-500/25 bg-linear-to-br from-emerald-500 to-emerald-700/10 text-white shadow-[0_18px_36px_rgba(16,185,129,0.14)]"
        : "admin-card"
    }`}
  >
    <div
      className={`text-xs uppercase tracking-[0.14em] ${emphasized ? "text-emerald-200" : "text-slate-500"}`}
    >
      {title}
    </div>
    <div className="mt-2 text-xl font-bold text-slate-100">{value}</div>
  </div>
);

export default PaymentSettingsPanel;
