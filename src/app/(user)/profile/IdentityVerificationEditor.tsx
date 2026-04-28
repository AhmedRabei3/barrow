"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type IdentityVerificationRequestSummary = {
  id: string;
  fullName: string;
  nationalId: string;
  frontImageUrl: string;
  backImageUrl: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  reviewedAt?: string | Date | null;
};

type IdentityVerificationEditorProps = {
  user: {
    name: string;
    isIdentityVerified?: boolean | null;
    identityVerificationRequest?: IdentityVerificationRequestSummary | null;
  };
  onSaved: () => Promise<void>;
};

const IdentityVerificationEditor = ({
  user,
  onSaved,
}: IdentityVerificationEditorProps) => {
  const { isArabic } = useAppPreferences();
  const existingRequest = user.identityVerificationRequest ?? null;
  const [fullName, setFullName] = useState(
    existingRequest?.fullName || user.name,
  );
  const [nationalId, setNationalId] = useState(
    existingRequest?.nationalId || "",
  );
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [backImage, setBackImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const statusMeta = useMemo(() => {
    if (user.isIdentityVerified || existingRequest?.status === "APPROVED") {
      return {
        label: isArabic ? "الحساب موثق" : "Account verified",
        className:
          "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300",
      };
    }

    if (existingRequest?.status === "PENDING") {
      return {
        label: isArabic ? "الطلب قيد المراجعة" : "Request under review",
        className:
          "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300",
      };
    }

    if (existingRequest?.status === "REJECTED") {
      return {
        label: isArabic
          ? "الطلب مرفوض - أعد الإرسال"
          : "Request rejected - resubmit",
        className:
          "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300",
      };
    }

    return {
      label: isArabic ? "لم يتم إرسال طلب بعد" : "No request submitted yet",
      className:
        "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200",
    };
  }, [existingRequest?.status, isArabic, user.isIdentityVerified]);

  const submitRequest = async () => {
    if (loading) return;

    if (!fullName.trim()) {
      toast.error(
        isArabic ? "الاسم الرسمي مطلوب" : "Official name is required",
      );
      return;
    }

    if (!nationalId.trim()) {
      toast.error(isArabic ? "الرقم الوطني مطلوب" : "National ID is required");
      return;
    }

    if (!frontImage || !backImage) {
      toast.error(
        isArabic
          ? "يجب رفع صورة الهوية من الأمام والخلف"
          : "Front and back ID images are required",
      );
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("fullName", fullName.trim());
      formData.append("nationalId", nationalId.trim());
      formData.append("frontImage", frontImage);
      formData.append("backImage", backImage);

      const response = await fetch("/api/profile/identity-verification", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(
          payload.message ||
            (isArabic
              ? "تعذر إرسال طلب التوثيق"
              : "Failed to submit verification request"),
        );
      }

      toast.success(
        payload.message ||
          (isArabic ? "تم إرسال الطلب إلى الإدارة" : "Request sent to admin"),
      );
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : isArabic
            ? "حدث خطأ غير متوقع"
            : "Unexpected error",
      );
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    !user.isIdentityVerified && existingRequest?.status !== "PENDING";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-slate-100">
            {isArabic ? "توثيق الحساب" : "Account verification"}
          </h3>
          <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
            {isArabic
              ? "ارفع بيانات الهوية الرسمية والرقم الوطني ليقوم المدير بمراجعة الطلب ووضع شارة التوثيق على حسابك."
              : "Upload your official identity documents and national ID for admin review and verified badge approval."}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusMeta.className}`}
        >
          {statusMeta.label}
        </span>
      </div>

      {existingRequest?.adminNote ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-7 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          {existingRequest.adminNote}
        </div>
      ) : null}

      {existingRequest ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {isArabic ? "صورة الهوية - الوجه الأمامي" : "ID front"}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingRequest.frontImageUrl}
              alt={isArabic ? "الوجه الأمامي للهوية" : "ID front"}
              className="mt-3 h-44 w-full rounded-2xl object-cover"
            />
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {isArabic ? "صورة الهوية - الوجه الخلفي" : "ID back"}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingRequest.backImageUrl}
              alt={isArabic ? "الوجه الخلفي للهوية" : "ID back"}
              className="mt-3 h-44 w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      ) : null}

      {canSubmit ? (
        <div className="mt-5 grid gap-4">
          <input
            name="identityFullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={
              isArabic ? "الاسم الرسمي الكامل" : "Official full name"
            }
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            name="identityNationalId"
            value={nationalId}
            onChange={(event) => setNationalId(event.target.value)}
            placeholder={isArabic ? "الرقم الوطني" : "National ID number"}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <span className="block font-medium">
                {isArabic ? "رفع صورة الهوية الأمامية" : "Upload ID front"}
              </span>
              <input
                type="file"
                name="identityFrontImage"
                accept="image/*"
                onChange={(event) =>
                  setFrontImage(event.target.files?.[0] || null)
                }
                className="mt-3 block w-full text-xs"
              />
            </label>
            <label className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <span className="block font-medium">
                {isArabic ? "رفع صورة الهوية الخلفية" : "Upload ID back"}
              </span>
              <input
                type="file"
                name="identityBackImage"
                accept="image/*"
                onChange={(event) =>
                  setBackImage(event.target.files?.[0] || null)
                }
                className="mt-3 block w-full text-xs"
              />
            </label>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submitRequest}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-sky-600 px-5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-60"
            >
              {loading
                ? isArabic
                  ? "جارٍ الإرسال..."
                  : "Submitting..."
                : existingRequest?.status === "REJECTED"
                  ? isArabic
                    ? "إعادة إرسال طلب التوثيق"
                    : "Resubmit verification request"
                  : isArabic
                    ? "إرسال طلب التوثيق"
                    : "Submit verification request"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default IdentityVerificationEditor;
