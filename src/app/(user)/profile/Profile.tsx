"use client";

import { useProfile } from "@/app/hooks/useProfile";
import ProfileHeader from "./ProfileHeader";
import TabbedView from "./TabsProfilePage";

import { formatDate, formatCurrency } from "@/app/api/utils/generalHelper";
import ProfileSkeleton from "@/app/components/ProfileSkeleton";
import { useEffect, useRef, useState } from "react";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import toast from "react-hot-toast";
import { handleConfirmDelete } from "./profileHelper";
import { buildEditDataByType } from "./setItemToEdit";
import GoBackBtn from "@/app/components/GoBackBtn";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import ProfileAccountEditor from "./ProfileAccountEditor";
import { localizeErrorMessage } from "@/app/i18n/errorMessages";

const SMART_CHAT_EDIT_PAYLOAD_KEY = "smart-chat-edit-payload";

const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read QR file"));
    reader.readAsDataURL(file);
  });

const Profile = () => {
  const [itemIdToEdit, setItemIdToEdit] = useState<string | null>(null);
  const [itemIdToDelete, setItemIdToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [withdrawingPaypal, setWithdrawingPaypal] = useState(false);
  const [withdrawingShamCash, setWithdrawingShamCash] = useState(false);
  const [paypalWithdrawModalOpen, setPaypalWithdrawModalOpen] = useState(false);
  const [shamCashWithdrawModalOpen, setShamCashWithdrawModalOpen] =
    useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [paypalEmail, setPaypalEmail] = useState("");
  const [paypalWithdrawAmount, setPaypalWithdrawAmount] = useState("");
  const [shamCashWithdrawAmount, setShamCashWithdrawAmount] = useState("");
  const [shamCashQrFile, setShamCashQrFile] = useState<File | null>(null);
  const [shamCashQrPreviewUrl, setShamCashQrPreviewUrl] = useState<
    string | null
  >(null);
  const shamCashQrInputRef = useRef<HTMLInputElement | null>(null);
  const { user, items, favorites, totalItems, loading, error, refetch } =
    useProfile();
  const { isArabic } = useAppPreferences();
  const availableToWithdraw = Number(user?.balance ?? 0);

  const deleteItem = async () => {
    await handleConfirmDelete(
      itemIdToDelete!,
      setDeleting,
      refetch,
      setItemIdToDelete,
    );
  };

  const handleOpenPaypalWithdrawModal = () => {
    if (!user) return;
    setPaypalEmail(String(user.email || ""));
    setPaypalWithdrawAmount("");
    setPaypalWithdrawModalOpen(true);
  };

  const handleOpenShamCashWithdrawModal = () => {
    if (!user) return;
    setShamCashQrFile(null);
    if (shamCashQrInputRef.current) {
      shamCashQrInputRef.current.value = "";
    }
    setShamCashWithdrawAmount("");
    setShamCashWithdrawModalOpen(true);
  };

  const handleClearShamCashQrFile = () => {
    setShamCashQrFile(null);
    if (shamCashQrInputRef.current) {
      shamCashQrInputRef.current.value = "";
    }
  };

  const handleReplaceShamCashQrFile = () => {
    shamCashQrInputRef.current?.click();
  };

  useEffect(() => {
    if (!shamCashQrFile) {
      setShamCashQrPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(shamCashQrFile);
    setShamCashQrPreviewUrl(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [shamCashQrFile]);

  const handlePaypalWithdraw = async () => {
    if (!user) return;

    const trimmedEmail = paypalEmail.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      toast.error(
        isArabic ? "يرجى إدخال بريد PayPal صالح" : "Enter a valid PayPal email",
      );
      return;
    }

    const amount = Number(paypalWithdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(isArabic ? "قيمة السحب غير صحيحة" : "Invalid amount");
      return;
    }

    if (amount > availableToWithdraw) {
      toast.error(
        isArabic
          ? "المبلغ أكبر من الرصيد المتاح للسحب"
          : "Amount exceeds available withdrawable balance",
      );
      return;
    }

    try {
      setWithdrawingPaypal(true);
      const response = await fetch("/api/pay/paypal/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          paypalEmail: trimmedEmail,
          amount,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        payoutBatchId?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Withdrawal failed");
      }

      toast.success(
        isArabic
          ? `تم إرسال طلب السحب عبر PayPal بنجاح${data.payoutBatchId ? ` (${data.payoutBatchId})` : ""}`
          : `PayPal withdrawal request submitted successfully${data.payoutBatchId ? ` (${data.payoutBatchId})` : ""}`,
      );

      await refetch();
      setPaypalWithdrawModalOpen(false);
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Withdrawal failed";
      toast.error(
        isArabic
          ? localizeErrorMessage(rawMessage, true)
          : rawMessage || "Failed to withdraw",
      );
    } finally {
      setWithdrawingPaypal(false);
    }
  };

  const handleShamCashWithdraw = async () => {
    if (!user) return;

    if (!shamCashQrFile) {
      toast.error(
        isArabic
          ? "يرجى رفع صورة كود QR الخاص بمحفظة شام كاش"
          : "Please upload your ShamCash QR image",
      );
      return;
    }

    if (!shamCashQrFile.type.startsWith("image/")) {
      toast.error(
        isArabic ? "يجب أن يكون ملف QR صورة" : "QR file must be an image",
      );
      return;
    }

    if (shamCashQrFile.size > 2 * 1024 * 1024) {
      toast.error(
        isArabic
          ? "حجم صورة QR يجب أن يكون أقل من 2MB"
          : "QR image must be smaller than 2MB",
      );
      return;
    }

    const amount = Number(shamCashWithdrawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(isArabic ? "قيمة السحب غير صحيحة" : "Invalid amount");
      return;
    }

    if (amount > availableToWithdraw) {
      toast.error(
        isArabic
          ? "المبلغ أكبر من الرصيد المتاح للسحب"
          : "Amount exceeds available withdrawable balance",
      );
      return;
    }

    try {
      setWithdrawingShamCash(true);
      const qrCode = await fileToDataUrl(shamCashQrFile);

      const response = await fetch("/api/pay/shamcash/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-lang": isArabic ? "ar" : "en",
        },
        body: JSON.stringify({
          qrCode,
          amount,
          note: isArabic
            ? "طلب سحب من واجهة البروفايل"
            : "Withdrawal request from profile",
        }),
      });

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message || "Withdrawal request failed");
      }

      toast.success(
        data.message ||
          (isArabic
            ? "تم إرسال السحب عبر ShamCash بنجاح"
            : "ShamCash withdrawal submitted successfully"),
      );

      await refetch();
      setShamCashWithdrawModalOpen(false);
      handleClearShamCashQrFile();
      setShamCashWithdrawAmount("");
    } catch (error) {
      const rawMessage =
        error instanceof Error ? error.message : "Withdrawal request failed";
      toast.error(
        isArabic
          ? localizeErrorMessage(rawMessage, true)
          : rawMessage || "Failed to request withdrawal",
      );
    } finally {
      setWithdrawingShamCash(false);
    }
  };

  // عند اختيار عنصر للتعديل عبر المساعد الذكي
  useEffect(() => {
    if (!itemIdToEdit) return;

    // البحث عن العنصر المراد تعديله
    const itemToEdit = items.find((it) => it.item?.id === itemIdToEdit);
    if (!itemToEdit) {
      toast.error(isArabic ? "لم يتم العثور على العنصر" : "Item not found");
      setItemIdToEdit(null);
      return;
    }

    try {
      const { data, itemType } = buildEditDataByType(
        itemToEdit as Parameters<typeof buildEditDataByType>[0],
      );

      if (typeof window !== "undefined") {
        const payload = {
          mode: "edit",
          itemType,
          itemId: data.id,
          data,
        };

        window.localStorage.setItem(
          SMART_CHAT_EDIT_PAYLOAD_KEY,
          JSON.stringify(payload),
        );
        window.dispatchEvent(new Event("open-smart-chat"));
      }
    } catch {
      toast.error(
        isArabic
          ? "هذا النوع غير مدعوم للتعديل عبر المساعد حالياً"
          : "This item type is not supported for assistant edit yet",
      );
    }

    setItemIdToEdit(null);
  }, [itemIdToEdit, items, isArabic]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refreshFavorites = () => {
      refetch();
    };

    window.addEventListener("favorites-updated", refreshFavorites);
    return () => {
      window.removeEventListener("favorites-updated", refreshFavorites);
    };
  }, [refetch]);

  // Move loading and error checks AFTER all hooks
  if (loading) {
    return <ProfileSkeleton />;
  }
  if (error || !user) {
    return (
      <div className="text-center py-10 text-red-500">
        {isArabic ? "فشل تحميل الصفحة الشخصية" : "Failed to load profile page"}
      </div>
    );
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="space-y-5 max-w-6xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
        {isArabic ? "الملف الشخصي" : "Profile"}
      </h1>
      <ProfileHeader
        user={user}
        totalItems={totalItems}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        onPaypalWithdraw={handleOpenPaypalWithdrawModal}
        isWithdrawingPaypal={withdrawingPaypal}
        onShamCashWithdraw={handleOpenShamCashWithdrawModal}
        isWithdrawingShamCash={withdrawingShamCash}
        onEditProfile={() => setEditProfileModalOpen(true)}
      />
      <TabbedView
        items={items}
        favorites={favorites}
        setItemIdToEdit={setItemIdToEdit}
        setItemIdToDelete={setItemIdToDelete}
        availableToWithdraw={availableToWithdraw}
        onOpenShamCashWithdraw={handleOpenShamCashWithdrawModal}
        isWithdrawingShamCash={withdrawingShamCash}
      />
      <GoBackBtn />

      {editProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditProfileModalOpen(false)}
          />
          <div className="relative z-10 w-11/12 max-w-2xl max-h-[85vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setEditProfileModalOpen(false)}
              className="absolute top-3 left-3 z-20 px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs"
            >
              {isArabic ? "إغلاق" : "Close"}
            </button>
            <ProfileAccountEditor
              user={user}
              onSaved={async () => {
                await refetch();
                setEditProfileModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {paypalWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!withdrawingPaypal) setPaypalWithdrawModalOpen(false);
            }}
          />
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-5 z-10 w-11/12 max-w-md space-y-3 shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {isArabic ? "سحب الأرباح عبر PayPal" : "PayPal withdrawal"}
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {isArabic
                ? "أدخل بريد PayPal والمبلغ بالدولار الأمريكي."
                : "Enter your PayPal email and USD amount."}
            </p>
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {isArabic
                ? `الرصيد المتاح للسحب: ${availableToWithdraw.toFixed(2)}$`
                : `Available to withdraw: $${availableToWithdraw.toFixed(2)}`}
            </p>

            <input
              type="email"
              value={paypalEmail}
              onChange={(event) => setPaypalEmail(event.target.value)}
              placeholder={isArabic ? "بريد PayPal" : "PayPal email"}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/60"
              disabled={withdrawingPaypal}
            />

            <input
              type="number"
              min={0.01}
              max={Math.max(0, availableToWithdraw)}
              step="0.01"
              value={paypalWithdrawAmount}
              onChange={(event) => setPaypalWithdrawAmount(event.target.value)}
              placeholder={isArabic ? "المبلغ بالدولار" : "Amount in USD"}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/60"
              disabled={withdrawingPaypal}
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setPaypalWithdrawModalOpen(false)}
                disabled={withdrawingPaypal}
                className="px-3 py-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm disabled:opacity-50"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handlePaypalWithdraw}
                disabled={withdrawingPaypal}
                className="px-3 py-2 rounded bg-indigo-600 text-white text-sm disabled:opacity-50"
              >
                {withdrawingPaypal
                  ? isArabic
                    ? "جارٍ الإرسال..."
                    : "Submitting..."
                  : isArabic
                    ? "تأكيد سحب PayPal"
                    : "Confirm PayPal withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shamCashWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              if (!withdrawingShamCash) {
                handleClearShamCashQrFile();
                setShamCashWithdrawModalOpen(false);
              }
            }}
          />
          <div className="bg-white dark:bg-slate-900 border border-cyan-200 dark:border-cyan-800 rounded-xl p-5 z-10 w-11/12 max-w-md space-y-3 shadow-xl">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {isArabic ? "سحب شام كاش" : "ShamCash withdrawal"}
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              {isArabic
                ? "ارفع صورة كود QR والمبلغ بالدولار الأمريكي."
                : "Upload QR image and enter USD amount."}
            </p>
            <p className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">
              {isArabic
                ? `الرصيد المتاح للسحب: ${availableToWithdraw.toFixed(2)} USD`
                : `Available to withdraw: ${availableToWithdraw.toFixed(2)} USD`}
            </p>

            <input
              ref={shamCashQrInputRef}
              type="file"
              accept="image/*"
              onChange={(event) =>
                setShamCashQrFile(event.target.files?.[0] || null)
              }
              placeholder={
                isArabic
                  ? "صورة كود QR الخاص بمحفظة شام كاش"
                  : "ShamCash wallet QR image"
              }
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/60"
              disabled={withdrawingShamCash}
            />

            {shamCashQrFile ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isArabic ? "الملف المحدد" : "Selected file"}:{" "}
                  {shamCashQrFile.name}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReplaceShamCashQrFile}
                    disabled={withdrawingShamCash}
                    className="px-2 py-1 rounded border border-cyan-300 dark:border-cyan-700 text-[11px] text-cyan-700 dark:text-cyan-300 disabled:opacity-50"
                  >
                    {isArabic ? "تغيير الصورة" : "Change image"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClearShamCashQrFile}
                    disabled={withdrawingShamCash}
                    className="px-2 py-1 rounded border border-rose-300 dark:border-rose-700 text-[11px] text-rose-700 dark:text-rose-300 disabled:opacity-50"
                  >
                    {isArabic ? "حذف الصورة" : "Remove image"}
                  </button>
                </div>
              </div>
            ) : null}

            {shamCashQrPreviewUrl ? (
              <div className="rounded-lg border border-cyan-200 dark:border-cyan-800 bg-slate-50 dark:bg-slate-950/40 p-2">
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-2">
                  {isArabic ? "معاينة QR" : "QR preview"}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={shamCashQrPreviewUrl}
                  alt={isArabic ? "معاينة صورة QR" : "QR image preview"}
                  className="mx-auto max-h-44 w-auto rounded-md border border-slate-200 dark:border-slate-700"
                />
              </div>
            ) : null}

            <input
              type="number"
              min={0.01}
              max={Math.max(0, availableToWithdraw)}
              step="0.01"
              value={shamCashWithdrawAmount}
              onChange={(event) =>
                setShamCashWithdrawAmount(event.target.value)
              }
              placeholder={
                isArabic ? "المبلغ بالدولار الأمريكي (USD)" : "Amount in USD"
              }
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900/60"
              disabled={withdrawingShamCash}
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  handleClearShamCashQrFile();
                  setShamCashWithdrawModalOpen(false);
                }}
                disabled={withdrawingShamCash}
                className="px-3 py-2 rounded bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm disabled:opacity-50"
              >
                {isArabic ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleShamCashWithdraw}
                disabled={withdrawingShamCash}
                className="px-3 py-2 rounded bg-cyan-600 text-white text-sm disabled:opacity-50"
              >
                {withdrawingShamCash
                  ? isArabic
                    ? "جارٍ الإرسال..."
                    : "Submitting..."
                  : isArabic
                    ? "تأكيد سحب شام كاش"
                    : "Confirm ShamCash withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm delete modal */}
      {itemIdToDelete && (
        <ConfirmModal
          title={isArabic ? "حذف العنصر" : "Delete item"}
          description={
            isArabic
              ? "هل تريد حذف هذا العنصر نهائياً؟"
              : "Do you want to permanently delete this item?"
          }
          onCancel={() => setItemIdToDelete(null)}
          onConfirm={deleteItem}
          loading={deleting}
        />
      )}
    </div>
  );
};

export default Profile;
