import { Card } from "./Card";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface PurchaseRequestAction {
  status: "PENDING_OWNER" | "OWNER_ACCEPTED" | string;
}

export function Actions({ request }: { request: PurchaseRequestAction }) {
  const { isArabic } = useAppPreferences();
  const t = (ar: string, en: string) => (isArabic ? ar : en);

  if (request.status === "PENDING_OWNER") {
    return (
      <Card title={t("الإجراءات", "Actions")}>
        <button className="btn-primary">
          {t("التواصل مع المالك", "Contact owner")}
        </button>
      </Card>
    );
  }

  if (request.status === "OWNER_ACCEPTED") {
    return (
      <Card title={t("الإجراءات", "Actions")}>
        <button className="btn-success">
          {t("تحويل إلى عملية بيع", "Convert to sale transaction")}
        </button>
      </Card>
    );
  }

  return (
    <Card title={t("الإجراءات", "Actions")}>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t(
          "لا توجد إجراءات متاحة في هذه المرحلة",
          "No actions available at this stage",
        )}
      </p>
    </Card>
  );
}
