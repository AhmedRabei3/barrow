"use client";

import { signIn } from "next-auth/react";
import toast from "react-hot-toast";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { tText } from "@/app/i18n/t";

interface GoogleSignInButtonProps {
  disabled?: boolean;
  callbackUrl?: string;
  showDivider?: boolean;
  beforeContinue?: () => boolean | Promise<boolean>;
  label?: string;
}

export default function GoogleSignInButton({
  disabled = false,
  callbackUrl = "/",
  showDivider = true,
  beforeContinue,
  label,
}: GoogleSignInButtonProps) {
  const { isArabic } = useAppPreferences();

  const handleGoogleContinue = async () => {
    try {
      if (beforeContinue) {
        const shouldContinue = await beforeContinue();
        if (!shouldContinue) {
          return;
        }
      }

      const result = await signIn("google", {
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        toast.error(
          tText(
            isArabic,
            "تكامل غوغل غير مكتمل بعد. أضف AUTH_GOOGLE_ID و AUTH_GOOGLE_SECRET ثم أعد المحاولة.",
            "Google auth is not configured yet. Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET, then try again.",
          ),
        );
        return;
      }

      if (result?.url) {
        window.location.assign(result.url);
        return;
      }

      toast.error(
        tText(
          isArabic,
          "تعذر بدء تسجيل الدخول عبر غوغل",
          "Could not start Google sign-in",
        ),
      );
    } catch {
      toast.error(
        tText(
          isArabic,
          "تعذر المتابعة عبر غوغل",
          "Could not continue with Google",
        ),
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleContinue}
        disabled={disabled}
        className="w-full rounded-xl 
        border border-slate-300 bg-white 
        px-4 py-3 text-sm font-semibold 
        text-slate-700 shadow-sm 
        transition hover:-translate-y-0.5
         hover:bg-slate-50 hover:shadow 
        dark:border-slate-600 dark:bg-slate-800 
        dark:text-slate-100 dark:hover:bg-slate-700 
        disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex items-center justify-center gap-2">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
            <path
              fill="#EA4335"
              d="M9 7.364v3.273h4.545c-.2 1.05-.8 1.94-1.7 2.536l2.745 2.127C16.191 13.818 17 11.61 17 9c0-.545-.055-1.09-.145-1.636H9z"
            />
            <path
              fill="#34A853"
              d="M9 17c2.436 0 4.49-.8 5.99-2.173l-2.745-2.127c-.764.518-1.736.818-3.245.818-2.49 0-4.6-1.682-5.355-3.946H.818v2.2A8.997 8.997 0 0 0 9 17z"
            />
            <path
              fill="#4A90E2"
              d="M3.645 9.572A5.407 5.407 0 0 1 3.345 8c0-.545.1-1.073.3-1.572v-2.2H.818A8.997 8.997 0 0 0 0 8c0 1.445.345 2.818.818 3.772l2.827-2.2z"
            />
            <path
              fill="#FBBC05"
              d="M9 3.482c1.327 0 2.518.455 3.455 1.345l2.59-2.59C13.49.8 11.436 0 9 0A8.997 8.997 0 0 0 .818 4.228l2.827 2.2C4.4 5.164 6.51 3.482 9 3.482z"
            />
          </svg>
          <span>
            {label ??
              tText(isArabic, "التسجيل عبر غوغل", "Continue with Google")}
          </span>
        </span>
      </button>
      {showDivider ? (
        <div className="my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {tText(isArabic, "أو المتابعة عبر", "or continue with")}
          </span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
      ) : null}
    </>
  );
}
