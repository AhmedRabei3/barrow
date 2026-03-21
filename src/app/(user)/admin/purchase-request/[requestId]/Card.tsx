import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

export function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { isArabic } = useAppPreferences();
  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-4 space-y-3"
    >
      <h2 className="font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </h2>
      {children}
    </div>
  );
}

export function Info({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  const { isArabic } = useAppPreferences();
  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="flex justify-between text-sm"
    >
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-100">
        {value}
      </span>
    </div>
  );
}
