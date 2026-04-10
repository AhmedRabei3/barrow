"use client";

import { useCallback, useState } from "react";
import { useEffect } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useActivationModal from "@/app/hooks/useActivationModal";
import useLoginModal from "@/app/hooks/useLoginModal";
import Modal from "../Modal";
import Heading from "../../Heading";
import Input from "../../inputs/Input";
import toast from "react-hot-toast";
import { request } from "@/app/utils/axios";
import confetti from "canvas-confetti";
import { useSession } from "next-auth/react";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";
import PaymentsBtn from "./PaymentsBtn";
import ShamCashModal from "./ShamCashModal";

const SUCCESS_SOUND =
  "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3";
const DEFAULT_SUBSCRIPTION_AMOUNT = 30;

type PaymentMethod = "PAYPAL" | "CARD" | "SHAMCASH";
type RedirectPaymentMethod = Exclude<PaymentMethod, "SHAMCASH">;


const ActivationModal = () => {
  const { update, data } = useSession();
  const activationModal = useActivationModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);
  const [requestingSupportCode, setRequestingSupportCode] = useState(false);
  const [subscriptionAmount, setSubscriptionAmount] = useState(
    DEFAULT_SUBSCRIPTION_AMOUNT,
  );
  const [redirectingMethod, setRedirectingMethod] =
    useState<RedirectPaymentMethod | null>(null);
  const { isArabic } = useAppPreferences();
  const [showShamCashModal, setShowShamCashModal] = useState(false);
  const [shamCashQrUrl, setShamCashQrUrl] = useState<string>("");
  const [shamCashWalletCode, setShamCashWalletCode] = useState<string>("");
  const [isShamCashSubmitting, setIsShamCashSubmitting] = useState(false);
  const userId = data?.user?.id;

  useEffect(() => {
    const loadPaymentSettings = async () => {
      try {
        const res = await request.get("/api/pay/settings");
        const nextAmount = Number(res?.data?.subscriptionMonthlyPrice);
        if (Number.isFinite(nextAmount) && nextAmount > 0) {
          setSubscriptionAmount(Number(nextAmount.toFixed(2)));
        }
        // جلب رابط صورة QR لمحفظة شام كاش
        const nextQrUrl =
          typeof res?.data?.url === "string"
            ? res.data.url
            : typeof res?.data?.shamCashQrCodeUrl === "string"
              ? res.data.shamCashQrCodeUrl
              : "";
        const nextWalletCode =
          typeof res?.data?.shamCashWalletCode === "string"
            ? res.data.shamCashWalletCode
            : "";
        if (nextQrUrl) {
          setShamCashQrUrl(nextQrUrl);
        }
        if (nextWalletCode) {
          setShamCashWalletCode(nextWalletCode);
        }
      } catch {
        // Keep defaults if settings endpoint fails.
      }
    };
    loadPaymentSettings();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      activationCode: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      setIsLoading(true);
      const result = await request.put("/api/activate", data);

      if (result.data.success) {
        toast.success(
          isArabic ? "تم تفعيل الحساب بنجاح" : "Account activated successfully",
        );

        // 🎉 الكونفتي
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 },
        });

        // 🔈 صوت النجاح
        new Audio(SUCCESS_SOUND).play();

        // 🔁 تحديث الجلسة
        await update();

        // 🔔 إبلاغ العداد ليعيد الحساب ويهتز
        dispatchEvent(new Event("activation-updated"));

        activationModal.onClose();
      } else {
        const rawMessage =
          result.data.message ||
          (isArabic ? "فشل التفعيل" : "Activation failed");
        toast.error(localizeErrorMessage(rawMessage, isArabic));
      }
    } catch (error) {
      console.error(error);
      toast.error(isArabic ? "حدث خطأ غير متوقع" : "Unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const requestActivationCodeViaSupport = async () => {
    try {
      setRequestingSupportCode(true);
      const response = await request.post(
        "/api/support/activation-code-request",
        {
          contactEmail: data?.user?.email || "",
        },
      );

      toast.success(
        response?.data?.message ||
          (isArabic
            ? "تم إرسال طلب كود التفعيل إلى مركز المساعدة"
            : "Activation-code request sent to support center"),
      );

      activationModal.onClose();
    } catch (error) {
      const rawMessage =
        error instanceof Error
          ? error.message
          : isArabic
            ? "تعذر إرسال طلب كود التفعيل"
            : "Failed to send activation-code request";
      toast.error(localizeErrorMessage(rawMessage, isArabic));
    } finally {
      setRequestingSupportCode(false);
    }
  };

  const toggle = useCallback(() => {
    activationModal.onClose();
    loginModal.onOpen();
  }, [loginModal, activationModal]);

  const bodyContent = (
    <div className="flex flex-col gap-3">
      <Heading
        title={isArabic ? "تفعيل الحساب" : "Activate"}
        subtitle={
          isArabic
            ? "فعّل حسابك واستفد من كامل الميزات"
            : "Activate your account & enjoy the great features"
        }
      />
      <Input
        id="activationCode"
        label={isArabic ? "رمز التفعيل" : "Your Activation Code"}
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />

      <div className="mt-2 border-t pt-3">
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
          {isArabic
            ? "أو فعّل اشتراكك مباشرة عبر إحدى وسائل الدفع"
            : "Or activate your subscription directly with a payment method"}
        </p>
            <PaymentsBtn 
              isLoading={isLoading}
              redirectingMethod={redirectingMethod}
              requestingSupportCode={requestingSupportCode}
              subscriptionAmount={subscriptionAmount}
              isArabic={isArabic}
              setRequestingSupportCode={setRequestingSupportCode}
              isShamCashSubmitting={isShamCashSubmitting}
              setShowShamCashModal={setShowShamCashModal}
              requestActivationCodeViaSupport={requestActivationCodeViaSupport}
              setRedirectingMethod={setRedirectingMethod}
            />
      </div>
    </div>
  );

  const footerContent = !userId ? (
    <div className="flex flex-col gap-2 mt-3">
      <hr />
      <div className="text-slate-600 dark:text-slate-300 text-center mt-1 font-light">
        <div className="justify-center flex flex-row items-center gap-2">
          <span>{isArabic ? "تسجيل الدخول" : "Login"}</span>
          <div
            onClick={toggle}
            className="hover:underline cursor-pointer text-sky-700 dark:text-sky-300"
          >
            {isArabic ? "من هنا" : "from here"}
          </div>
        </div>
      </div>
    </div>
  ) : undefined;

  return (
    <>
      <Modal
        disabled={isLoading}
        isOpen={activationModal.isOpen}
        title={isArabic ? "تفعيل الحساب" : "Activate Account"}
        actionLabel={isArabic ? "تفعيل" : "Activate"}
        onClose={activationModal.onClose}
        onSubmit={handleSubmit(onSubmit)}
        body={bodyContent}
        footer={footerContent}
      />
      {/* مودال شام كاش */}
      <ShamCashModal
        isOpen={showShamCashModal}
        onClose={() => setShowShamCashModal(false)}
        qrUrl={shamCashQrUrl}
        walletCode={shamCashWalletCode}
        isSubmitting={isShamCashSubmitting}
        amount={subscriptionAmount}
        onSubmitTransaction={async (txNumber) => {
          try {
            setIsShamCashSubmitting(true);

            const response = await request.post("/api/pay/shamcash-verify", {
              txNumber,
            });

            if (response.data?.activated) {
              toast.success(
                response.data?.message ||
                  (isArabic
                    ? "تم تفعيل الحساب بنجاح عبر شام كاش"
                    : "Account activated successfully via ShamCash"),
              );

              confetti({
                particleCount: 140,
                spread: 80,
                origin: { y: 0.6 },
              });

              new Audio(SUCCESS_SOUND).play();
              await update();
              dispatchEvent(new Event("activation-updated"));
              setShowShamCashModal(false);
              return;
            }

            if (response.data?.pending || response.data?.adminReview) {
              toast.success(
                response.data?.message ||
                  (isArabic
                    ? "تم استلام طلبك وهو الآن قيد المعالجة"
                    : "Your request was received and is now processing"),
              );
              await update();
              dispatchEvent(new Event("activation-updated"));
              setShowShamCashModal(false);
              return;
            }

            toast(
              response.data?.message ||
                (isArabic
                  ? "تم إرسال الطلب بنجاح"
                  : "Request submitted successfully"),
            );
            setShowShamCashModal(false);
          } catch (error) {
            console.error(error);
            const rawMessage =
              error instanceof Error
                ? error.message
                : isArabic
                  ? "تعذر التحقق من عملية شام كاش"
                  : "Failed to verify ShamCash payment";
            toast.error(localizeErrorMessage(rawMessage, isArabic));
          } finally {
            setIsShamCashSubmitting(false);
          }
        }}
      />
    </>
  );
};

export default ActivationModal;
