"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type ModerationType = "ALL" | "PROPERTY" | "NEW_CAR" | "USED_CAR" | "OTHER";

type ModerationItem = {
  id: string;
  type: Exclude<ModerationType, "ALL">;
  title: string;
  status: string;
  createdAt: string;
  moderationAction: string | null;
  moderationNote: string | null;
  moderatedAt: string | null;
  moderatedByName: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  categoryName: string;
  locationLabel: string;
  imageUrls: string[];
};

type ModerationResponse = {
  filters: { type: ModerationType };
  summary: Array<{ type: Exclude<ModerationType, "ALL">; count: number }>;
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  items: ModerationItem[];
};

const ImageModerationPanel = () => {
  const { isArabic } = useAppPreferences();
  const searchParams = useSearchParams();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ModerationType>("ALL");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ModerationResponse>({
    filters: { type: "ALL" },
    summary: [],
    pagination: { page: 1, limit: 12, totalItems: 0, totalPages: 1 },
    items: [],
  });
  const [actionItemId, setActionItemId] = useState<string | null>(null);
  const [rejectItem, setRejectItem] = useState<ModerationItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const focusedItemId = String(searchParams.get("itemId") || "").trim();
  const focusedItemType = String(searchParams.get("itemType") || "").trim();

  useEffect(() => {
    if (
      focusedItemType === "PROPERTY" ||
      focusedItemType === "NEW_CAR" ||
      focusedItemType === "USED_CAR" ||
      focusedItemType === "OTHER"
    ) {
      setFilterType(focusedItemType as ModerationType);
      setPage(1);
    }
  }, [focusedItemType]);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: filterType,
        page: String(page),
        limit: "12",
      });
      if (focusedItemId) {
        params.set("itemId", focusedItemId);
      }
      const res = await fetch(
        `/api/admin/image-moderation?${params.toString()}`,
      );
      const body = (await res.json()) as ModerationResponse & {
        message?: string;
      };
      if (!res.ok) {
        throw new Error(
          body.message ||
            t("فشل تحميل طابور المراجعة", "Failed to load moderation queue"),
        );
      }
      setData(body);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("فشل تحميل طابور المراجعة", "Failed to load moderation queue"),
      );
    } finally {
      setLoading(false);
    }
  }, [filterType, focusedItemId, page, t]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const runAction = useCallback(
    async (
      item: ModerationItem,
      action: "APPROVE" | "REJECT",
      note?: string,
    ) => {
      try {
        setActionItemId(item.id);
        const res = await fetch("/api/admin/image-moderation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            itemId: item.id,
            itemType: item.type,
            note: note?.trim() || undefined,
          }),
        });
        const body = (await res.json()) as {
          success?: boolean;
          message?: string;
        };
        if (!res.ok) {
          throw new Error(
            body.message ||
              t(
                "فشل تنفيذ إجراء المراجعة",
                "Failed to process moderation action",
              ),
          );
        }
        toast.success(
          body.message || t("تم تنفيذ الإجراء", "Action completed"),
        );
        if (action === "REJECT") {
          setRejectItem(null);
          setRejectNote("");
        }
        await loadQueue();
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t(
                "فشل تنفيذ إجراء المراجعة",
                "Failed to process moderation action",
              ),
        );
      } finally {
        setActionItemId(null);
      }
    },
    [loadQueue, t],
  );

  if (loading) {
    return (
      <p className="text-slate-500 dark:text-slate-300">
        {t(
          "جاري تحميل طابور مراجعة الصور...",
          "Loading image moderation queue...",
        )}
      </p>
    );
  }

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard
          title={t("إجمالي المنتظر", "Total pending")}
          value={data.pagination.totalItems}
        />
        {data.summary.map((entry) => (
          <StatCard key={entry.type} title={entry.type} value={entry.count} />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("طابور مراجعة الصور", "Image moderation queue")}
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t(
                "العناصر الجديدة أو العناصر التي استبدلت صورها تبقى مخفية حتى تعتمدها الإدارة.",
                "New items or items with replaced images stay hidden until admin approval.",
              )}
            </p>
            {focusedItemId ? (
              <p className="mt-2 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                {t(
                  "تم فتح عنصر محدد من خلال الإشعارات لمراجعته مباشرة.",
                  "A specific item was opened from notifications for direct review.",
                )}
              </p>
            ) : null}
          </div>
          <select
            value={filterType}
            onChange={(event) => {
              setPage(1);
              setFilterType(event.target.value as ModerationType);
            }}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="ALL">{t("كل الأنواع", "All types")}</option>
            <option value="PROPERTY">{t("العقارات", "Properties")}</option>
            <option value="NEW_CAR">{t("السيارات الجديدة", "New cars")}</option>
            <option value="USED_CAR">
              {t("السيارات المستعملة", "Used cars")}
            </option>
            <option value="OTHER">{t("عناصر أخرى", "Other items")}</option>
          </select>
        </div>
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
          {t(
            "لا توجد عناصر بانتظار مراجعة الصور حالياً",
            "No items are currently waiting for image moderation",
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {data.items.map((item) => (
            <article
              key={item.id}
              className={`rounded-3xl border bg-white p-4 shadow-sm dark:bg-slate-900 ${
                focusedItemId && item.id === focusedItemId
                  ? "border-cyan-500 ring-2 ring-cyan-300/60 dark:border-cyan-400 dark:ring-cyan-900"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-sky-700 dark:text-sky-300">
                    {item.type}
                  </p>
                  <h4 className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.categoryName} · {item.locationLabel}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                  {t("بانتظار المراجعة", "Pending review")}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {item.imageUrls.slice(0, 6).map((imageUrl, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={`${item.title}-${index + 1}`}
                      className="h-32 w-full object-cover"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {t("المالك", "Owner")}
                  </p>
                  <p>{item.owner.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {item.owner.email}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-100">
                    {t("تاريخ الإرسال", "Submitted at")}
                  </p>
                  <p>
                    {new Date(item.createdAt).toLocaleString(
                      isArabic ? "ar" : "en-US",
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t("عدد الصور", "Image count")}: {item.imageUrls.length}
                  </p>
                </div>
              </div>

              {item.moderationAction ||
              item.moderationNote ||
              item.moderatedAt ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-sm dark:border-amber-900/70 dark:bg-amber-950/20">
                  <p className="font-medium text-amber-900 dark:text-amber-200">
                    {t("آخر قرار مراجعة", "Last moderation decision")}
                  </p>
                  <div className="mt-2 space-y-1 text-xs text-amber-800 dark:text-amber-100">
                    <p>
                      {t("الإجراء", "Action")}:{" "}
                      {item.moderationAction || t("غير متوفر", "Not available")}
                    </p>
                    <p>
                      {t("بواسطة", "By")}:{" "}
                      {item.moderatedByName || t("مشرف", "Admin")}
                    </p>
                    <p>
                      {t("التوقيت", "Time")}:{" "}
                      {item.moderatedAt
                        ? new Date(item.moderatedAt).toLocaleString(
                            isArabic ? "ar" : "en-US",
                          )
                        : t("غير متوفر", "Not available")}
                    </p>
                    {item.moderationNote ? (
                      <p>
                        {t("الملاحظة", "Note")}: {item.moderationNote}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runAction(item, "APPROVE")}
                  disabled={actionItemId === item.id}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {t("اعتماد ونشر", "Approve and publish")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectItem(item);
                    setRejectNote(
                      item.moderationNote ||
                        t(
                          "يرجى استبدال الصور غير الواضحة أو غير المطابقة للعنصر ثم إعادة الإرسال.",
                          "Please replace blurry or mismatched images and resubmit.",
                        ),
                    );
                  }}
                  disabled={actionItemId === item.id}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {t("رفض الصور", "Reject images")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {rejectItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("إغلاق", "Close")}
            onClick={() => {
              if (actionItemId === rejectItem.id) return;
              setRejectItem(null);
              setRejectNote("");
            }}
            className="absolute inset-0 bg-slate-950/60"
          />
          <div className="relative z-10 w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t("رفض الصور مع توضيح السبب", "Reject images with reason")}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {rejectItem.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (actionItemId === rejectItem.id) return;
                  setRejectItem(null);
                  setRejectNote("");
                }}
                className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                {t("إغلاق", "Close")}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                t(
                  "الصور غير واضحة وتحتاج إعادة رفع بجودة أفضل.",
                  "Images are unclear and need higher-quality replacements.",
                ),
                t(
                  "الصور لا تطابق العنصر المعلن عنه.",
                  "The images do not match the advertised item.",
                ),
                t(
                  "الصور تحتاج ترتيبًا أفضل وإظهار التفاصيل الأساسية للعنصر.",
                  "The images should be reordered to show the core item details more clearly.",
                ),
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setRejectNote(template)}
                  className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  {template}
                </button>
              ))}
            </div>

            <label className="mt-4 block text-sm font-medium text-slate-800 dark:text-slate-100">
              {t("ملاحظة المراجعة", "Moderation note")}
            </label>
            <textarea
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-0 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder={t(
                "اكتب سبب الرفض أو التعديل المطلوب لصاحب الإعلان",
                "Write the rejection reason or required change for the listing owner",
              )}
            />

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectItem(null);
                  setRejectNote("");
                }}
                disabled={actionItemId === rejectItem.id}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                {t("إلغاء", "Cancel")}
              </button>
              <button
                type="button"
                onClick={() => runAction(rejectItem, "REJECT", rejectNote)}
                disabled={actionItemId === rejectItem.id || !rejectNote.trim()}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {actionItemId === rejectItem.id
                  ? t("جاري الإرسال...", "Submitting...")
                  : t("تأكيد الرفض", "Confirm rejection")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <p className="text-slate-600 dark:text-slate-300">
          {t("الصفحة", "Page")} {data.pagination.page} {t("من", "of")}{" "}
          {data.pagination.totalPages}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={data.pagination.page <= 1}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            {t("السابق", "Previous")}
          </button>
          <button
            type="button"
            onClick={() =>
              setPage((current) =>
                Math.min(data.pagination.totalPages, current + 1),
              )
            }
            disabled={data.pagination.page >= data.pagination.totalPages}
            className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            {t("التالي", "Next")}
          </button>
        </div>
      </div>
    </section>
  );
};

const StatCard = ({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-linear-to-br from-white to-slate-50 p-4 shadow-sm dark:border-slate-700 dark:from-slate-900 dark:to-slate-900">
    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
      {title}
    </p>
    <p className="mt-2 text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
      {value}
    </p>
  </div>
);

export default ImageModerationPanel;
