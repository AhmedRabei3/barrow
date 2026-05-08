import type { ReactNode } from "react";

type StatusTone = "neutral" | "success" | "warning" | "error";

type StatusCardProps = {
  title: string;
  message: string;
  tone?: StatusTone;
  hint?: string;
  actions?: ReactNode;
  centered?: boolean;
};

const toneClasses: Record<StatusTone, string> = {
  neutral:
    "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
  success:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-200",
  warning:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200",
  error:
    "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200",
};

export default function StatusCard({
  title,
  message,
  tone = "neutral",
  hint,
  actions,
  centered = true,
}: StatusCardProps) {
  const wrapperClass = centered
    ? "mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-12"
    : "w-full";

  return (
    <main className={wrapperClass}>
      <section
        className={`w-full rounded-2xl border p-6 text-center shadow-sm ${toneClasses[tone]}`}
      >
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-3 text-sm opacity-90">{message}</p>
        {hint ? <p className="mt-2 text-xs opacity-80">{hint}</p> : null}
        {actions ? <div className="mt-4">{actions}</div> : null}
      </section>
    </main>
  );
}
