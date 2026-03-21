"use client";

import { useCallback, useEffect, useState } from "react";
import UpdateBtn from "./UpdateBtn";
import Tabs from "./Tabs";
import codeFetch from "./codeFetch";
import CodeCard, { ActiveCode } from "./CodeCard";
import { useAppPreferences } from "../providers/AppPreferencesProvider";

const CodeViewer = () => {
  const { isArabic } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<ActiveCode[]>([]);
  const [filteredCodes, setFilteredCodes] = useState<ActiveCode[]>([]);
  const [activeTab, setActiveTab] = useState<number | null>(null);

  // 🔹 جلب جميع الأكواد عند تحميل الصفحة
  useEffect(() => {
    codeFetch({
      setLoading,
      setCodes,
      setFilteredCodes,
      messages: {
        noCodes: t("لا توجد أكواد متاحة", "No codes found"),
        fetchError: t("خطأ أثناء جلب الأكواد", "Error fetching codes"),
      },
    });
  }, [t]);

  // 🔹 الأكواد المعروضة حاليًا
  const displayedCodes =
    activeTab === null
      ? filteredCodes
      : filteredCodes.filter((c) => c.balance === activeTab);

  return (
    <section className="w-full max-w-6xl mx-auto relative">
      {/* 🔹 زر تحديث الأكواد */}
      <UpdateBtn
        setCodes={setCodes}
        setLoading={setLoading}
        setFilteredCodes={setFilteredCodes}
      />
      {/* 🔸 التبويبات حسب الفئات السعرية */}
      <Tabs codes={codes} activeTab={activeTab} setActiveTab={setActiveTab} />
      {/* 🔸 عرض الأكواد */}
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <span className="loader"></span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedCodes.map((code) => (
            <div key={code.code}>
              <CodeCard code={code} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default CodeViewer;
