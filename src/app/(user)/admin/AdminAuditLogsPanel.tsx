"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

type AuditRow = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actorAdmin: {
    id: string;
    name: string | null;
    email: string | null;
  };
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

const AdminAuditLogsPanel = () => {
  const { isArabic, theme } = useAppPreferences();
  const t = useCallback(
    (ar: string, en: string) => (isArabic ? ar : en),
    [isArabic],
  );

  const isLight = theme === "light";
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [actionFilter, setActionFilter] = useState("");

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ take: "80" });
      if (actionFilter.trim()) {
        params.set("action", actionFilter.trim());
      }

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const body = (await response.json()) as {
        rows?: AuditRow[];
        message?: string;
      };

      if (!response.ok) {
        throw new Error(
          body.message ||
            t("تعذر تحميل سجل التدقيق", "Failed to load audit logs"),
        );
      }

      setRows(body.rows ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("حدث خطأ غير متوقع", "Unexpected error"),
      );
    } finally {
      setLoading(false);
    }
  }, [actionFilter, t]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const emptyText = useMemo(
    () => t("لا توجد سجلات تدقيق حالياً", "No audit logs found"),
    [t],
  );

  return (
    <section
      className={`mt-4 rounded-3xl border p-4 sm:p-6 ${
        isLight
          ? "border-slate-200 bg-white text-slate-900"
          : "border-zinc-800 bg-zinc-950 text-zinc-100"
      }`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {t("سجل تدقيق الإدارة", "Admin Audit Log")}
          </h2>
          <p className={`mt-1 text-sm ${isLight ? "text-slate-500" : "text-zinc-400"}`}>
            {t(
              "توثيق الإجراءات الحساسة في لوحة الإدارة.",
              "Track sensitive actions across the admin panel.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            placeholder={t("فلتر الإجراء (مثال: BLOCK_USER)", "Filter action (e.g. BLOCK_USER)")}
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none sm:w-72 ${
              isLight
                ? "border-slate-300 bg-white"
                : "border-zinc-700 bg-zinc-900"
            }`}
          />
          <button
            type="button"
            onClick={() => void loadRows()}
            className="rounded-xl bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500"
          >
            {t("تحديث", "Refresh")}
          </button>
        </div>
      </div>

      <div
        className={`overflow-x-auto rounded-2xl border ${
          isLight ? "border-slate-200" : "border-zinc-800"
        }`}
      >
        <table className="min-w-full text-sm">
          <thead className={isLight ? "bg-slate-50" : "bg-zinc-900"}>
            <tr>
              <th className="px-3 py-2 text-start">{t("الوقت", "Time")}</th>
              <th className="px-3 py-2 text-start">{t("الإجراء", "Action")}</th>
              <th className="px-3 py-2 text-start">{t("المنفذ", "Actor")}</th>
              <th className="px-3 py-2 text-start">{t("المستهدف", "Target")}</th>
              <th className="px-3 py-2 text-start">{t("الكيان", "Entity")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center">
                  {t("جار التحميل...", "Loading...")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-5 text-center">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t ${
                    isLight ? "border-slate-100" : "border-zinc-800"
                  }`}
                >
                  <td className="px-3 py-2">{new Date(row.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 font-semibold">{row.action}</td>
                  <td className="px-3 py-2">
                    {row.actorAdmin.name || row.actorAdmin.email || row.actorAdmin.id}
                  </td>
                  <td className="px-3 py-2">
                    {row.targetUser
                      ? row.targetUser.name || row.targetUser.email || row.targetUser.id
                      : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {row.entityType}
                    {row.entityId ? `:${row.entityId}` : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default AdminAuditLogsPanel;
