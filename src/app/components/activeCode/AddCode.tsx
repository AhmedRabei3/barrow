"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { MdOutlineQrCode2 } from "react-icons/md";
import { FaCoins } from "react-icons/fa";
import { request } from "@/app/utils/axios";
import toast from "react-hot-toast";
import CodeViewer from "./CodeViewer";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const AddCode = () => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  const { data: session } = useSession();
  const id = session?.user?.id;

  const [countOfCodes, setCountOfCodes] = useState<number>(1);
  const [balance, setBalance] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!id)
      return toast.error(
        t("المستخدم غير مسجل الدخول", "User not authenticated!"),
      );
    if (countOfCodes <= 0)
      return toast.error(
        t(
          "عدد الأكواد يجب أن يكون أكبر من صفر",
          "Count must be greater than 0",
        ),
      );

    try {
      setLoading(true);
      await request.post("/api/admin/active_code", {
        id,
        countOfCodes,
        balance,
      });
      toast.success(
        isArabic
          ? `✅ تم إنشاء ${countOfCodes} كود جديد`
          : `✅ ${countOfCodes} new codes generated`,
      );
    } catch {
      toast.error(t("فشل إنشاء الأكواد", "Failed while generating codes"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto mt-6 flex w-full max-w-6xl flex-col gap-6 px-1">
      <div className="admin-card overflow-hidden rounded-[28px] p-5 sm:p-6">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="admin-kicker">
              {t("إدارة الأكواد", "Activation code operations")}
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
              {t("إنشاء أكواد التفعيل", "Generate Activation Codes")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400">
              {t(
                "توليد دفعات جديدة من الأكواد مع قيمة ثابتة لكل كود ثم متابعتها ونسخها مباشرة من نفس الشاشة.",
                "Generate new code batches with a fixed value per code, then review and copy them from the same screen.",
              )}
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`admin-btn-primary w-full rounded-2xl px-6 py-3 text-sm font-semibold sm:w-auto ${
              loading ? "cursor-not-allowed opacity-60" : ""
            }`}
          >
            {loading
              ? t("جاري الإنشاء...", "Generating...")
              : t("إنشاء الأكواد", "Generate Codes")}
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="admin-card-soft rounded-3xl p-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full">
              <div className="flex flex-col w-full sm:w-1/2">
                <label
                  htmlFor="countOfCodes"
                  className="mb-1 text-sm font-medium text-zinc-300"
                >
                  {t("عدد الأكواد", "Number of Codes")}
                </label>
                <div className="relative">
                  <MdOutlineQrCode2 className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xl" />
                  <input
                    type="number"
                    id="countOfCodes"
                    min={1}
                    value={countOfCodes}
                    onChange={(e) => setCountOfCodes(Number(e.target.value))}
                    className="admin-input w-full rounded-2xl py-3 pl-10 pr-3 text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col w-full sm:w-1/2">
                <label
                  htmlFor="balance"
                  className="mb-1 text-sm font-medium text-zinc-300"
                >
                  {t("رصيد كل كود", "Balance per Code")}
                </label>
                <div className="relative">
                  <FaCoins className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg" />
                  <input
                    type="number"
                    id="balance"
                    min={1}
                    value={balance}
                    onChange={(e) => setBalance(Number(e.target.value))}
                    className="admin-input w-full rounded-2xl py-3 pl-10 pr-3 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="admin-card rounded-2xl p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                  {t("دفعة سريعة", "Quick batch")}
                </div>
                <div className="mt-2 text-lg font-black text-white">
                  {countOfCodes} {t("كود", "codes")}
                </div>
              </div>
              <div className="rounded-2xl bg-linear-to-br from-orange-600 to-orange-800 p-4 text-white shadow-[0_18px_36px_rgba(249,115,22,0.25)]">
                <div className="text-xs uppercase tracking-[0.16em] text-orange-100/70">
                  {t("القيمة لكل كود", "Value per code")}
                </div>
                <div className="mt-2 text-lg font-black">
                  ${Number(balance || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="admin-card-soft rounded-3xl p-4 text-sm text-zinc-300">
            <h2 className="text-base font-bold text-white">
              {t("ملاحظة تشغيلية", "Operational note")}
            </h2>
            <p className="mt-3 leading-7 text-zinc-400">
              {t(
                "كل كود يتم توليده يُعرض أدناه مباشرة مع حالة الاستخدام وإمكانية النسخ بضغطة واحدة، ما يسهّل إدارة البيع اليدوي والدعم.",
                "Every generated code appears below immediately with usage state and one-click copy, making manual sales and support handling easier.",
              )}
            </p>
          </div>
        </div>
      </div>

      <div>
        <CodeViewer />
      </div>
    </section>
  );
};

export default AddCode;
