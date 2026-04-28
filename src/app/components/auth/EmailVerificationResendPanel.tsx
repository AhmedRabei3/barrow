"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ResendResult = {
  success: boolean;
  message: string;
};

interface EmailVerificationResendPanelProps {
  isArabic: boolean;
  expectedEmail: string;
  onResend: (email: string) => Promise<ResendResult>;
  className?: string;
}

const COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_PREFIX = "email-verification-resend-cooldown:";

const buildCooldownStorageKey = (email: string) =>
  `${COOLDOWN_STORAGE_PREFIX}${email.trim().toLowerCase()}`;

type MailProviderId = "gmail" | "outlook" | "yahoo" | "icloud" | "generic";

type MailboxLink = {
  id: MailProviderId | "mail-app";
  label: string;
  href: string;
};

const detectMailProvider = (email: string): MailProviderId => {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";

  if (["gmail.com", "googlemail.com"].includes(domain)) {
    return "gmail";
  }

  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) {
    return "outlook";
  }

  if (["yahoo.com", "ymail.com"].includes(domain)) {
    return "yahoo";
  }

  if (["icloud.com", "me.com", "mac.com"].includes(domain)) {
    return "icloud";
  }

  return "generic";
};

export default function EmailVerificationResendPanel({
  isArabic,
  expectedEmail,
  onResend,
  className,
}: EmailVerificationResendPanelProps) {
  const [typedEmail, setTypedEmail] = useState("");
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const normalizedExpectedEmail = expectedEmail.trim().toLowerCase();
  const cooldownStorageKey = buildCooldownStorageKey(normalizedExpectedEmail);
  const suggestedProvider = detectMailProvider(normalizedExpectedEmail);

  const mailboxLinks = useMemo(() => {
    const links: MailboxLink[] = [
      {
        id: "gmail",
        label: isArabic ? "Gmail" : "Gmail",
        href: "https://mail.google.com/mail/u/0/#inbox",
      },
      {
        id: "outlook",
        label: isArabic ? "Outlook" : "Outlook",
        href: "https://outlook.live.com/mail/0/inbox",
      },
      {
        id: "yahoo",
        label: isArabic ? "Yahoo" : "Yahoo",
        href: "https://mail.yahoo.com/d/folders/1",
      },
      {
        id: "icloud",
        label: isArabic ? "iCloud Mail" : "iCloud Mail",
        href: "https://www.icloud.com/mail/",
      },
      {
        id: "mail-app",
        label: isArabic ? "تطبيق البريد" : "Mail app",
        href: "mailto:",
      },
    ];

    if (suggestedProvider === "generic") {
      return links;
    }

    return [...links].sort((left, right) => {
      if (left.id === suggestedProvider) return -1;
      if (right.id === suggestedProvider) return 1;
      return 0;
    });
  }, [isArabic, suggestedProvider]);

  const suggestedProviderLabel = useMemo(() => {
    const match = mailboxLinks.find((link) => link.id === suggestedProvider);
    return match?.label ?? (isArabic ? "صندوق بريدك" : "your inbox");
  }, [isArabic, mailboxLinks, suggestedProvider]);

  useEffect(() => {
    setTypedEmail("");
    setInfoMessage(null);
    setIsSubmitting(false);
    if (typeof window === "undefined") {
      setCooldownSeconds(0);
      return;
    }

    const rawExpiresAt = window.localStorage.getItem(cooldownStorageKey);
    if (!rawExpiresAt) {
      setCooldownSeconds(0);
      return;
    }

    const expiresAt = Number(rawExpiresAt);
    const remainingSeconds = Math.max(
      0,
      Math.ceil((expiresAt - Date.now()) / 1000),
    );

    if (remainingSeconds <= 0) {
      window.localStorage.removeItem(cooldownStorageKey);
      setCooldownSeconds(0);
      return;
    }

    setCooldownSeconds(remainingSeconds);
  }, [cooldownStorageKey, expectedEmail]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(cooldownStorageKey);
      }
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(cooldownStorageKey);
          }
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownSeconds, cooldownStorageKey]);

  const buttonLabel = useMemo(() => {
    if (isSubmitting) {
      return isArabic ? "جاري الإرسال..." : "Sending...";
    }

    if (cooldownSeconds > 0) {
      return isArabic
        ? `أعد المحاولة بعد ${cooldownSeconds} ثانية`
        : `Retry in ${cooldownSeconds}s`;
    }

    return isArabic ? "إعادة إرسال رسالة التأكيد" : "Resend verification email";
  }, [cooldownSeconds, isArabic, isSubmitting]);

  const handleResend = async () => {
    const normalizedTyped = typedEmail.trim().toLowerCase();

    if (!normalizedTyped) {
      toast.error(
        isArabic
          ? "أعد كتابة بريدك الإلكتروني أولاً"
          : "Re-enter your email first",
      );
      return;
    }

    if (normalizedTyped !== normalizedExpectedEmail) {
      toast.error(
        isArabic
          ? "البريد الإلكتروني الذي أدخلته لا يطابق البريد المستخدم في التسجيل"
          : "The email you entered does not match the email used during registration",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await onResend(normalizedTyped);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setInfoMessage(result.message);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          cooldownStorageKey,
          String(Date.now() + COOLDOWN_SECONDS * 1000),
        );
      }
      setCooldownSeconds(COOLDOWN_SECONDS);
      toast.success(result.message);
    } catch {
      toast.error(
        isArabic
          ? "تعذر إعادة إرسال رسالة التأكيد"
          : "Failed to resend verification email",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100 ${className ?? ""}`}
    >
      <p className="font-semibold">
        {isArabic
          ? "هذا الحساب مسجل بالفعل لكنه غير مؤكد بعد. تحقق من رسالة البريد الإلكتروني لتأكيد حسابك."
          : "This account already exists but has not been verified yet. Check your email to confirm your account."}
      </p>
      <p className="mt-2 text-sky-800 dark:text-sky-200">
        {isArabic
          ? "ألم تتلق رسالة بعد؟ أعد كتابة بريدك الإلكتروني ثم اطلب إرسال رسالة تأكيد جديدة."
          : "Didn’t receive the message yet? Re-enter your email and request a new verification email."}
      </p>
      <p className="mt-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
        {suggestedProvider === "generic"
          ? isArabic
            ? "بعد الإرسال افتح صندوق بريدك أو مجلد الرسائل غير المرغوبة."
            : "After sending, check your inbox or spam folder."
          : isArabic
            ? `يبدو أن بريدك على ${suggestedProviderLabel}. افتحه أولاً للعثور على رسالة التأكيد بسرعة.`
            : `Your email looks like ${suggestedProviderLabel}. Open it first to find the verification message faster.`}
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <input
          type="email"
          name="resendVerificationEmail"
          value={typedEmail}
          onChange={(event) => setTypedEmail(event.target.value)}
          placeholder={
            isArabic ? "أعد كتابة بريدك الإلكتروني" : "Re-enter your email"
          }
          dir="ltr"
          className="w-full rounded-xl border border-sky-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 dark:border-sky-500/30 dark:bg-slate-900 dark:text-slate-100"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={isSubmitting || cooldownSeconds > 0}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {buttonLabel}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {mailboxLinks.map((mailboxLink) => (
            <a
              key={mailboxLink.label}
              href={mailboxLink.href}
              target={
                mailboxLink.href.startsWith("http") ? "_blank" : undefined
              }
              rel={
                mailboxLink.href.startsWith("http") ? "noreferrer" : undefined
              }
              className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                mailboxLink.id === suggestedProvider
                  ? "border-sky-500 bg-sky-600 text-white hover:bg-sky-700 dark:border-sky-400 dark:bg-sky-500 dark:text-slate-950 dark:hover:bg-sky-400"
                  : "border-sky-200 bg-white text-sky-700 hover:border-sky-300 hover:bg-sky-100 dark:border-sky-500/30 dark:bg-slate-900 dark:text-sky-200 dark:hover:bg-slate-800"
              }`}
            >
              {mailboxLink.label}
              {mailboxLink.id === suggestedProvider ? (
                <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                  {isArabic ? "مقترح" : "Best"}
                </span>
              ) : null}
            </a>
          ))}
        </div>
      </div>
      {infoMessage ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
          {infoMessage}
        </p>
      ) : null}
    </div>
  );
}
