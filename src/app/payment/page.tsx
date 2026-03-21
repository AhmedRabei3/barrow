"use client";
import { useCallback, useState } from "react";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import confetti from "canvas-confetti";

type PaymentType = "ACTIVATION" | "SUBSCRIPTION" | "FEATURED_AD";
type PaymentMethod = "PAYPAL" | "CARD" | "SHAMCASH";
type ItemType = "NEW_CAR" | "USED_CAR" | "PROPERTY" | "OTHER";

type PaymentSettings = {
  subscriptionMonthlyPrice: number;
  featuredAdMonthlyPrice: number;
  shamCashWalletCode: string;
  shamCashQrCodeUrl: string;
};

const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  subscriptionMonthlyPrice: 30,
  featuredAdMonthlyPrice: 10,
  shamCashWalletCode: "",
  shamCashQrCodeUrl: "",
};

const resolveIsArabic = () =>
  typeof window !== "undefined" &&
  (document?.documentElement?.lang || "").toLowerCase().startsWith("ar");

const formatUsd = (value: number) =>
  Number.isInteger(value) ? `${value}` : value.toFixed(2);

const getSuccessMessage = (type: PaymentType, isArabic: boolean) => {
  if (type === "FEATURED_AD") {
    return isArabic
      ? "✅ تم تأكيد الدفع وتفعيل الإعلان المميز بنجاح."
      : "✅ Payment confirmed and featured ad was activated successfully.";
  }

  if (type === "ACTIVATION") {
    return isArabic
      ? "✅ تم تأكيد عملية الدفع وتفعيل الحساب بنجاح."
      : "✅ Payment confirmed and account activation completed successfully.";
  }

  return isArabic
    ? "✅ تم تأكيد عملية الدفع وتفعيل الاشتراك بنجاح."
    : "✅ Payment confirmed and subscription activated successfully.";
};

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<PaymentSettings>(
    DEFAULT_PAYMENT_SETTINGS,
  );
  const [showShamCashQr, setShowShamCashQr] = useState(false);
  const [isShamCashSubmitting, setIsShamCashSubmitting] = useState(false);
  const [isShamCashChecking, setIsShamCashChecking] = useState(false);
  const [activeShamCashPaymentId, setActiveShamCashPaymentId] = useState("");
  const [shamCashStatusText, setShamCashStatusText] = useState("");
  const searchParams = useSearchParams();

  const serviceType =
    (searchParams.get("service") as PaymentType | null) || "SUBSCRIPTION";
  const featuredItemId = searchParams.get("itemId");
  const featuredItemType = searchParams.get("itemType") as ItemType | null;
  const isFeaturedFlow = serviceType === "FEATURED_AD";
  const shamCashQrCodeUrl = settings.shamCashQrCodeUrl.trim();
  const shamCashWalletCode = settings.shamCashWalletCode.trim();
  const shamCashAmount = isFeaturedFlow
    ? settings.featuredAdMonthlyPrice
    : settings.subscriptionMonthlyPrice;

  useEffect(() => {
    const isArabic = resolveIsArabic();

    const gateway = searchParams.get("gateway");
    const status = searchParams.get("status");
    const token = searchParams.get("token");
    const paymentId = searchParams.get("paymentId");
    const paymentType =
      (searchParams.get("type") as PaymentType | null) || "SUBSCRIPTION";

    if (gateway === "paypal" && status === "success" && token) {
      const capture = async () => {
        try {
          setLoading(true);
          const res = await fetch("/api/pay/paypal/capture", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-lang": isArabic ? "ar" : "en",
            },
            body: JSON.stringify({ orderId: token }),
          });

          const data = await res.json();

          if (res.status === 409) {
            setMessage(
              isArabic
                ? "⚠️ لازم توافق على الدفع داخل PayPal أولًا، ثم ترجع لهذه الصفحة لإكمال التفعيل."
                : "⚠️ You need to approve the payment in PayPal first, then return to this page to complete activation.",
            );
            return;
          }

          if (!res.ok) {
            throw new Error(data.message || "Capture failed");
          }

          const confirmedType =
            (data?.type as PaymentType | undefined) ?? paymentType;

          setMessage(getSuccessMessage(confirmedType, isArabic));
          dispatchEvent(new Event("activation-updated"));
        } catch (error) {
          const rawMessage =
            error instanceof Error
              ? error.message
              : isArabic
                ? "تعذر تأكيد عملية الدفع عبر PayPal."
                : "Failed to confirm PayPal payment.";
          setMessage(`❌ ${localizeErrorMessage(rawMessage, isArabic)}`);
        } finally {
          setLoading(false);
        }
      };

      capture();
      return;
    }

    if (gateway === "fatora") {
      if (status === "failed") {
        setMessage("❌ لم تكتمل عملية الدفع. يمكنك المحاولة مرة أخرى.");
        return;
      }

      if (status === "success" && paymentId) {
        const confirm = async () => {
          try {
            setLoading(true);
            const res = await fetch("/api/pay/fatora/confirm", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-lang": isArabic ? "ar" : "en",
              },
              body: JSON.stringify({ paymentId }),
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.message || "Payment confirmation failed");
            }

            if (data.success) {
              setMessage(getSuccessMessage(paymentType, isArabic));
              dispatchEvent(new Event("activation-updated"));
            } else {
              setMessage(
                "⏳ تم استلام عملية الدفع وهي قيد المعالجة. أعد فتح الصفحة بعد ثوانٍ قليلة.",
              );
            }
          } catch (error) {
            const rawMessage =
              error instanceof Error
                ? error.message
                : isArabic
                  ? "تعذر التحقق من عملية الدفع."
                  : "Failed to verify payment.";
            setMessage(`❌ ${localizeErrorMessage(rawMessage, isArabic)}`);
          } finally {
            setLoading(false);
          }
        };

        confirm();
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const isArabic = resolveIsArabic();
        const res = await fetch("/api/pay/settings", {
          headers: {
            "x-lang": isArabic ? "ar" : "en",
          },
        });

        if (!res.ok) {
          return;
        }

        const data = (await res.json()) as Partial<PaymentSettings>;
        setSettings((prev) => ({
          subscriptionMonthlyPrice:
            Number(data.subscriptionMonthlyPrice) > 0
              ? Number(data.subscriptionMonthlyPrice)
              : prev.subscriptionMonthlyPrice,
          featuredAdMonthlyPrice:
            Number(data.featuredAdMonthlyPrice) > 0
              ? Number(data.featuredAdMonthlyPrice)
              : prev.featuredAdMonthlyPrice,
          shamCashWalletCode:
            typeof data.shamCashWalletCode === "string"
              ? data.shamCashWalletCode
              : prev.shamCashWalletCode,
          shamCashQrCodeUrl:
            typeof data.shamCashQrCodeUrl === "string"
              ? data.shamCashQrCodeUrl
              : prev.shamCashQrCodeUrl,
        }));
      } catch {
        // keep defaults if loading settings fails
      }
    };

    loadSettings();
  }, []);

  useEffect(() => {
    const preferredMethod = searchParams.get("method");
    if (preferredMethod === "SHAMCASH") {
      setShowShamCashQr(true);
    }
  }, [searchParams]);

  const triggerPaymentCelebration = () => {
    confetti({
      particleCount: 140,
      spread: 80,
      origin: { y: 0.65 },
    });
  };

  const checkShamCashStatus = useCallback(
    async (paymentId: string): Promise<boolean> => {
      const normalizedPaymentId = String(paymentId || "").trim();
      if (!normalizedPaymentId) {
        return false;
      }

      const isArabic = resolveIsArabic();

      setIsShamCashChecking(true);
      try {
        const res = await fetch(
          `/api/pay/shamcash/status?paymentId=${encodeURIComponent(normalizedPaymentId)}`,
          {
            headers: {
              "x-lang": isArabic ? "ar" : "en",
            },
          },
        );

        const data = await res.json();
        if (!res.ok) {
          const rawMessage =
            data?.message ||
            (isArabic
              ? "تعذر التحقق من حالة الدفع"
              : "Failed to check payment status");
          setMessage(`❌ ${localizeErrorMessage(rawMessage, isArabic)}`);
          setShamCashStatusText("");
          return false;
        }

        const paymentStatus = String(data?.payment?.status || "").toUpperCase();
        const queueStatus = String(data?.queue?.status || "").toUpperCase();
        const pendingPosition = Number(data?.queue?.pendingPosition || 0);

        if (paymentStatus === "COMPLETED") {
          const successType: PaymentType = isFeaturedFlow
            ? "FEATURED_AD"
            : "SUBSCRIPTION";
          const successMessage = getSuccessMessage(successType, isArabic);
          setMessage(successMessage);
          setShamCashStatusText(successMessage);
          setActiveShamCashPaymentId("");
          triggerPaymentCelebration();
          dispatchEvent(new Event("activation-updated"));
          return true;
        }

        if (paymentStatus === "REFUNDED") {
          const refundedMessage = isArabic
            ? "⚠️ تعذر إتمام التفعيل وتمت إعادة الرصيد إلى محفظتك داخل المنصة."
            : "⚠️ Activation could not be completed and the amount was refunded to your in-app balance.";
          setMessage(refundedMessage);
          setShamCashStatusText(refundedMessage);
          setActiveShamCashPaymentId("");
          return true;
        }

        if (paymentStatus === "FAILED" || queueStatus === "FAILED") {
          const failedMessage = isArabic
            ? "❌ تعذر التحقق من العملية. تأكد من كتابة بريد حسابك في الملاحظة وبنفس القيمة المطلوبة ثم أعد المحاولة."
            : "❌ Verification failed. Ensure your account email is written in the note and the transferred amount matches, then try again.";
          setMessage(failedMessage);
          setShamCashStatusText(failedMessage);
          setActiveShamCashPaymentId("");
          return true;
        }

        const pendingMessage =
          pendingPosition > 0
            ? isArabic
              ? `⏳ طلبك قيد المراجعة. ترتيبك الحالي في الطابور: ${pendingPosition}`
              : `⏳ Your request is under review. Current queue position: ${pendingPosition}`
            : isArabic
              ? "⏳ طلبك قيد المراجعة الآن."
              : "⏳ Your request is under review now.";

        setMessage(pendingMessage);
        setShamCashStatusText(pendingMessage);
        return false;
      } catch (error) {
        const rawMessage =
          error instanceof Error
            ? error.message
            : isArabic
              ? "تعذر التحقق من حالة الدفع"
              : "Failed to check payment status";
        setMessage(`❌ ${localizeErrorMessage(rawMessage, isArabic)}`);
        setShamCashStatusText("");
        return false;
      } finally {
        setIsShamCashChecking(false);
      }
    },
    [isFeaturedFlow],
  );

  useEffect(() => {
    if (!activeShamCashPaymentId) {
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (cancelled) {
        return;
      }

      const finished = await checkShamCashStatus(activeShamCashPaymentId);
      if (cancelled || finished) {
        return;
      }

      timer = setTimeout(poll, 5000);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [activeShamCashPaymentId, checkShamCashStatus]);

  const submitShamCashRequest = async () => {
    const isArabic = resolveIsArabic();
    const requestType = isFeaturedFlow ? "FEATURED_AD" : "SUBSCRIPTION";

    if (activeShamCashPaymentId) {
      await checkShamCashStatus(activeShamCashPaymentId);
      return;
    }

    if (
      requestType === "FEATURED_AD" &&
      (!featuredItemId || !featuredItemType)
    ) {
      setMessage(
        isArabic
          ? "بيانات الإعلان غير مكتملة. الرجاء المحاولة من صفحة الإعلانات الخاصة بك."
          : "Featured ad data is incomplete. Please retry from your listing tools.",
      );
      return;
    }

    setIsShamCashSubmitting(true);
    try {
      const res = await fetch("/api/pay/shamcash/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          type: requestType,
          itemId: requestType === "FEATURED_AD" ? featuredItemId : undefined,
          itemType:
            requestType === "FEATURED_AD" ? featuredItemType : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        const rawMessage =
          data?.message ||
          (isArabic
            ? "تعذر إرسال طلب الدفع عبر ShamCash"
            : "Could not submit ShamCash payment request");
        setMessage(`❌ ${localizeErrorMessage(rawMessage, isArabic)}`);
        return;
      }

      const paymentId = String(data?.paymentId || "").trim();
      if (!paymentId) {
        throw new Error(
          isArabic
            ? "تعذر إنشاء مرجع الطلب"
            : "Could not create payment request reference",
        );
      }

      const pendingMessage =
        data?.message ||
        (isArabic
          ? "تم استلام طلبك وهو قيد المراجعة الآن."
          : "Your request has been received and is now under review.");

      setActiveShamCashPaymentId(paymentId);
      setShamCashStatusText(pendingMessage);
      setMessage(pendingMessage);
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر إرسال طلب الدفع عبر ShamCash"
            : "Could not submit ShamCash payment request";
      setMessage(`❌ ${localizeErrorMessage(rawMessage, isArabic)}`);
    } finally {
      setIsShamCashSubmitting(false);
    }
  };

  async function pay(
    type: PaymentType,
    method: PaymentMethod,
    itemId?: string | null,
    itemType?: ItemType | null,
  ) {
    const isArabic = resolveIsArabic();

    if (method === "SHAMCASH") {
      setShowShamCashQr(true);
      setActiveShamCashPaymentId("");
      setShamCashStatusText("");
      setMessage(
        isArabic
          ? "بعد التحويل، اكتب بريد حسابك في الملاحظة ثم انقر على زر (انقر هنا) لبدء التحقق."
          : "After transfer, write your account email in the note, then click (Click here) to start verification.",
      );
      return;
    }

    if (type === "FEATURED_AD" && (!itemId || !itemType)) {
      setMessage(
        isArabic
          ? "بيانات الإعلان غير مكتملة. الرجاء المحاولة من صفحة الإعلانات الخاصة بك."
          : "Featured ad data is incomplete. Please retry from your listing tools.",
      );
      return;
    }

    setLoading(true);
    const res = await fetch("/api/pay/fatora", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-lang": isArabic ? "ar" : "en",
      },
      body: JSON.stringify({
        amount:
          type === "ACTIVATION"
            ? 10
            : type === "FEATURED_AD"
              ? settings.featuredAdMonthlyPrice
              : settings.subscriptionMonthlyPrice,
        type,
        method,
        itemId,
        itemType,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const rawMessage =
        data.message ||
        (isArabic ? "فشل إنشاء عملية الدفع" : "Failed to start payment");
      setMessage(localizeErrorMessage(rawMessage, isArabic));
      setLoading(false);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-600 to-indigo-700">
      <div className="bg-white rounded-2xl p-8 shadow-xl w-full max-w-md text-center mx-4">
        <h1 className="text-2xl font-bold mb-4">
          {isFeaturedFlow ? "تثبيت إعلان مميز" : "اختر طريقة الدفع"}
        </h1>

        {isFeaturedFlow && (
          <p className="text-sm text-slate-600 mb-4">
            {`ادفع ${formatUsd(settings.featuredAdMonthlyPrice)}$ لتثبيت إعلانك لمدة 30 يومًا في بداية الصفحة الرئيسية.`}
          </p>
        )}

        <button
          onClick={() =>
            pay(
              isFeaturedFlow ? "FEATURED_AD" : "ACTIVATION",
              "PAYPAL",
              featuredItemId,
              featuredItemType,
            )
          }
          className="w-full mb-3 py-3 bg-green-600 text-white rounded-xl hover:opacity-90"
        >
          {isFeaturedFlow
            ? `تثبيت الإعلان عبر PayPal (${formatUsd(settings.featuredAdMonthlyPrice)}$)`
            : "تفعيل الحساب عبر PayPal (10$)"}
        </button>

        {!isFeaturedFlow && (
          <button
            onClick={() => pay("SUBSCRIPTION", "PAYPAL")}
            className="w-full py-3 bg-blue-600 text-white rounded-xl hover:opacity-90"
          >
            {`اشتراك شهري عبر PayPal (${formatUsd(settings.subscriptionMonthlyPrice)}$)`}
          </button>
        )}

        <button
          onClick={() =>
            pay(
              isFeaturedFlow ? "FEATURED_AD" : "SUBSCRIPTION",
              "CARD",
              featuredItemId,
              featuredItemType,
            )
          }
          className="w-full mt-3 py-3 bg-slate-700 text-white rounded-xl hover:opacity-90"
        >
          {isFeaturedFlow
            ? `تثبيت الإعلان عبر البطاقة (${formatUsd(settings.featuredAdMonthlyPrice)}$)`
            : "اشتراك عبر البطاقة (بوابة بديلة)"}
        </button>

        <button
          onClick={() =>
            pay(
              isFeaturedFlow ? "FEATURED_AD" : "SUBSCRIPTION",
              "SHAMCASH",
              featuredItemId,
              featuredItemType,
            )
          }
          className="w-full mt-3 py-3 bg-indigo-700 text-white rounded-xl hover:opacity-90"
        >
          {isFeaturedFlow
            ? `تثبيت الإعلان عبر ShamCash (${formatUsd(settings.featuredAdMonthlyPrice)}$)`
            : `اشتراك عبر ShamCash (${formatUsd(settings.subscriptionMonthlyPrice)}$)`}
        </button>

        {showShamCashQr && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-right">
            <p className="font-semibold text-slate-800 mb-2">
              تعليمات الدفع عبر ShamCash
            </p>
            <p className="text-xs text-slate-600 mb-2">
              {`1) امسح رمز QR وحوّل مبلغ ${formatUsd(shamCashAmount)} USD.`}
            </p>
            <p className="text-xs text-slate-600 mb-2">
              2) اكتب في الملاحظة البريد الإلكتروني المسجل في التطبيق تمامًا.
            </p>
            <p className="text-xs text-slate-600 mb-3">
              3) بعد إتمام التحويل انقر على الزر أدناه لبدء المراجعة.
            </p>

            {shamCashWalletCode && (
              <p className="text-xs text-slate-700 mb-3">
                <span className="font-semibold">محفظة التطبيق:</span>{" "}
                {shamCashWalletCode}
              </p>
            )}

            {shamCashQrCodeUrl ? (
              // Dynamic external QR URLs are admin-provided and not fixed for next/image allowlists.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shamCashQrCodeUrl}
                alt="ShamCash QR"
                className="mx-auto h-52 w-52 rounded-lg border border-slate-200 bg-white object-contain"
              />
            ) : (
              <div className="mx-auto h-52 w-52 rounded-lg border border-dashed border-slate-300 bg-white grid place-items-center text-xs text-slate-400 px-2 text-center">
                لم يتم ضبط صورة QR بعد من لوحة الأدمن
              </div>
            )}

            <button
              onClick={submitShamCashRequest}
              disabled={isShamCashSubmitting || isShamCashChecking}
              className="w-full mt-4 py-2.5 bg-emerald-700 text-white rounded-lg hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isShamCashSubmitting
                ? "جارٍ إرسال الطلب..."
                : "انقر هنا بعد التحويل لبدء المراجعة"}
            </button>

            {!!activeShamCashPaymentId && (
              <button
                onClick={() => checkShamCashStatus(activeShamCashPaymentId)}
                disabled={isShamCashChecking || isShamCashSubmitting}
                className="w-full mt-2 py-2.5 bg-slate-700 text-white rounded-lg hover:opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isShamCashChecking
                  ? "جارٍ التحقق..."
                  : "تحقق من حالة الطلب الآن"}
              </button>
            )}

            {!!shamCashStatusText && (
              <p className="mt-3 text-xs text-slate-700">
                {shamCashStatusText}
              </p>
            )}
          </div>
        )}

        {loading && <p className="mt-4 spinner">جارٍ تحويلك للدفع…</p>}
        {!!message && <p className="mt-4 text-sm text-slate-700">{message}</p>}
      </div>
    </div>
  );
}
