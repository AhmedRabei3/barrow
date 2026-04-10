"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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
      <main className="min-h-screen flex items-center justify-center px-4">
        <section className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <h1 className="text-lg font-semibold text-red-700">رابط غير صالح</h1>
          <p className="mt-2 text-sm text-red-600">رمز التحقق مفقود.</p>
        </section>
      </main>
    );
  }

  if (state === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <section className="max-w-md w-full rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-center">
          <h1 className="text-lg font-semibold text-yellow-700">
            جارٍ التحقق...
          </h1>
          <p className="mt-2 text-sm text-yellow-700">يرجى الانتظار لحظة.</p>
        </section>
      </main>
    );
  }

  if (state === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <section className="max-w-md w-full rounded-xl border border-green-200 bg-green-50 p-5 text-center">
          <h1 className="text-lg font-semibold text-green-700">
            تم التفعيل بنجاح!
          </h1>
          <p className="mt-2 text-sm text-green-700">{message}</p>
          <p className="mt-1 text-xs text-green-600">
            سيتم توجيهك لتسجيل الدخول...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <section className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 p-5 text-center">
        <h1 className="text-lg font-semibold text-red-700">فشل التحقق</h1>
        <p className="mt-2 text-sm text-red-600">{message}</p>
        <button
          onClick={() => router.replace("/?login=true")}
          className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          الذهاب لتسجيل الدخول
        </button>
      </section>
    </main>
  );
}
