"use client";

import { Dispatch, SetStateAction } from "react";
import { request } from "@/app/utils/axios";
import toast from "react-hot-toast";
import { MdOutlineRefresh } from "react-icons/md";
import { ActiveCode } from "./CodeCard";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

interface UpdateBtnProps {
  setCodes: Dispatch<SetStateAction<ActiveCode[]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setFilteredCodes: Dispatch<SetStateAction<ActiveCode[]>>;
}
const UpdateBtn = ({
  setCodes,
  setLoading,
  setFilteredCodes,
}: UpdateBtnProps) => {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  return (
    <div className="flex justify-end mb-4">
      <button
        onClick={() => {
          setLoading(true);
          request
            .get("/api/admin/active_code")
            .then(({ data }) => {
              setCodes(data);
              setFilteredCodes(data);
              toast.success(t("✅ تم تحديث الأكواد", "Codes refreshed ✅"));
            })
            .catch(() =>
              toast.error(t("فشل تحديث الأكواد", "Failed to refresh codes")),
            )
            .finally(() => setLoading(false));
        }}
        className="
        bg-sky-800 hover:bg-sky-900
        text-white font-extrabold p-3 
          rounded-lg shadow-md transition
          w-full justify-center items-center
          mx-auto text-center flex gap-2
          dark:bg-sky-700 dark:hover:bg-sky-600
        "
      >
        <MdOutlineRefresh className="justify-self-center font-extrabold text-2xl" />
        {t("تحديث", "Refresh")}
      </button>
    </div>
  );
};

export default UpdateBtn;
