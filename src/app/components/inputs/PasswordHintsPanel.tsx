"use client";

import { buildPasswordHints } from "@/lib/passwordHints";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface PasswordHintsPanelProps {
  value: string;
  className?: string;
}

export default function PasswordHintsPanel({
  value,
  className,
}: PasswordHintsPanelProps) {
  const { isArabic } = useAppPreferences();
  const hints = buildPasswordHints(value);

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/60 ${className ?? ""}`}
    >
      <div className="space-y-1.5">
        {hints.map((hint) => (
          <div
            key={hint.en}
            className={`flex items-center gap-2 ${
              hint.ok
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            <span className="text-[10px]">{hint.ok ? "●" : "○"}</span>
            <span>{isArabic ? hint.ar : hint.en}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
