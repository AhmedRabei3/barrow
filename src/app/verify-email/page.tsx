"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StatusCard from "@/app/components/ui/StatusCard";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    const verify = async () => {
      try {
        const res = await fetch("/api/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          success: boolean;
          message?: string;
        };
        if (data.success) {
          setState("success");
          setMessage(data.message ?? "تم تفعيل بريدك الإلكتروني بنجاح!");
          setTimeout(() => router.replace("/?login=true"), 2000);
        } else {
          setState("error");
          setMessage(data.message ?? "فشل التحقق. يرجى المحاولة مرة أخرى.");
        }
      } catch {
        setState("error");
        setMessage("حدث خطأ في الاتصال. يرجى المحاولة لاحقاً.");
      }
    };

    void verify();
  }, [token, router]);

  if (!token) {
    return (
      <StatusCard
        title="رابط غير صالح"
        message="رمز التحقق مفقود."
        tone="error"
      />
    );
  }

  if (state === "loading") {
    return (
      <StatusCard
        title="جارٍ التحقق..."
        message="يرجى الانتظار لحظة."
        tone="warning"
      />
    );
  }

  if (state === "success") {
    return (
      <StatusCard
        title="تم التفعيل بنجاح!"
        message={message}
        hint="سيتم توجيهك لتسجيل الدخول..."
        tone="success"
      />
    );
  }

  return (
    <StatusCard
      title="فشل التحقق"
      message={message}
      tone="error"
      actions={
        <button
          onClick={() => router.replace("/?login=true")}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm text-white transition-colors hover:bg-rose-700"
        >
          الذهاب لتسجيل الدخول
        </button>
      }
    />
  );
}
