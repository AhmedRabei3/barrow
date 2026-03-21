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
    <section className="w-full max-w-4xl mx-auto mt-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-slate-800 dark:text-slate-100 mb-8">
        {t("إنشاء أكواد التفعيل", "Generate Activation Codes")}
      </h1>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-md p-4 sm:p-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        {/* عدد الأكواد */}
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <div className="flex flex-col w-full sm:w-1/2">
            <label
              htmlFor="countOfCodes"
              className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-1"
            >
              {t("عدد الأكواد", "Number of Codes")}
            </label>
            <div className="relative">
              <MdOutlineQrCode2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl" />
              <input
                type="number"
                id="countOfCodes"
                min={1}
                value={countOfCodes}
                onChange={(e) => setCountOfCodes(Number(e.target.value))}
                className="pl-10 w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          {/* الرصيد */}
          <div className="flex flex-col w-full sm:w-1/2">
            <label
              htmlFor="balance"
              className="text-slate-700 dark:text-slate-200 text-sm font-medium mb-1"
            >
              {t("رصيد كل كود", "Balance per Code")}
            </label>
            <div className="relative">
              <FaCoins className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />
              <input
                type="number"
                id="balance"
                min={1}
                value={balance}
                onChange={(e) => setBalance(Number(e.target.value))}
                className="pl-10 w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full sm:w-auto px-6 py-2 rounded-lg font-semibold text-white transition shadow-md ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-sky-800 hover:bg-sky-900"
          }`}
        >
          {loading
            ? t("جاري الإنشاء...", "Generating...")
            : t("إنشاء الأكواد", "Generate Codes")}
        </button>
      </div>

      <div className="mt-10">
        <CodeViewer />
      </div>
    </section>
  );
};

export default AddCode;
