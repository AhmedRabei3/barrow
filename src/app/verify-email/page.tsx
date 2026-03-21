import Link from "next/link";
import { verifyEmailToken } from "@/lib/emailVerification";
import type { Metadata } from "next";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "Verify Email",
  description: "Email verification status page",
  robots: {
    index: false,
    follow: false,
  },
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = params?.token;

  // جلب اللغة من الكوكيز
  const langCookie = (await cookies()).get("barrow-locale")?.value;
  const isArabic = langCookie === "ar";

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <section className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 p-5 text-center">
          <h1 className="text-lg font-semibold text-red-700">
            {isArabic ? "رابط غير صالح" : "Invalid Link"}
          </h1>
          <p className="mt-2 text-sm text-red-600">
            {isArabic ? "رمز التحقق مفقود." : "Verification token is missing."}
          </p>
        </section>
      </main>
    );
  }

  const result = await verifyEmailToken(token, isArabic);

  if (result.success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <section className="max-w-md w-full rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <h1 className="text-lg font-semibold text-emerald-700">
            {isArabic ? "تم تأكيد البريد الإلكتروني" : "Email Verified"}
          </h1>
          <p className="mt-2 text-sm text-emerald-700">{result.message}</p>
          <Link
            href="/"
            className="inline-block mt-4 px-4 py-2 rounded-md bg-emerald-600 text-white"
          >
            {isArabic ? "العودة للرئيسية" : "Back to Home"}
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <section className="max-w-md w-full rounded-xl border border-red-200 bg-red-50 p-5 text-center">
        <h1 className="text-lg font-semibold text-red-700">
          {isArabic ? "فشل التحقق" : "Verification Failed"}
        </h1>
        <p className="mt-2 text-sm text-red-700">{result.message}</p>
      </section>
    </main>
  );
}
