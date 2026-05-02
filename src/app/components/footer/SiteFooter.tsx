"use client";

import "./footer.css";
import Link from "next/link";
import { lazy, memo, Suspense, type ComponentType, useState } from "react";
import { useSession } from "next-auth/react";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import Logo from "../header/Logo";

const SupportContactModal = lazy(async () => {
  const importedModule = await import("../header/SupportContactModal.lazy.js");

  return {
    default: importedModule.default as unknown as ComponentType<{
      isOpen: boolean;
      onClose: () => void;
      onOpenCountChange?: (count: number) => void;
    }>,
  };
});

const localizedSteps = [
  {
    arTitle: "بيئة نظيفة وموثوقة",
    arBody: "نفرض معايير صارمة لضمان الخلو من أي محتوى مخالف أو جنسي.",
    enTitle: "Clean & trusted",
    enBody:
      "Strict standards ensure authentic listings and a safe transaction environment.",
  },
  {
    arTitle: "بحث ذكي وسهل",
    arBody: "ابحث بالاسم أو الفئة أو نطاق السعر أو عبر الخريطة التفاعلية.",
    enTitle: "Smart search",
    enBody: "Find anything by name, category, price range, or interactive map.",
  },
  {
    arTitle: "تنوع واسع",
    arBody:
      "عقارات، سيارات، دراجات، أدوات منزلية وإلكترونية وأكثر، كل شيء في مكان واحد.",
    enTitle: "Broad selection",
    enBody:
      "Real estate, cars, bikes, home appliances, electronics and more, all in one place.",
  },
  {
    arTitle: "تواصل مباشر",
    arBody:
      "تواصل مع صاحب الإعلان مباشرة بدون وسطاء، لتسريع الصفقات وتجنب الرسوم الإضافية.",
    enTitle: "Direct communication",
    enBody:
      "Communicate directly with the listing owner without intermediaries, speeding up transactions and avoiding extra fees.",
  },
  {
    arTitle: "وصول أوسع لإعلانك",
    arBody: "خوارزميات ذكية ونظام إحالة يرفع ظهور إعلانك أمام الجمهور المناسب.",
    enTitle: "Greater reach",
    enBody:
      "Smart algorithms and referrals put your listing in front of the right audience.",
  },
  {
    arTitle: "بدون عمولة",
    arBody: "أتمّ بيعك أو إيجارك دون أي رسوم أو عمولات مخفية على الصفقة.",
    enTitle: "Zero commission",
    enBody:
      "Complete every sale or rental without any hidden fees on the deal.",
  },
  {
    arTitle: "دخل شهري متكرر",
    arBody:
      "ادعُ الآخرين واكسب من كل اشتراك يتم تفعيله شهرياً عبر شرائح مختلفة تصل إلى 60% من اشتراك أول 10 مستخدمين.",
    enTitle: "Recurring monthly income",
    enBody:
      "Refer others and earn from every successful subscription via tiered rewards.",
  },
  {
    arTitle: "مزايا حصرية دورية",
    arBody: "فعاليات، ميزات جديدة، ومكافآت خاصة لمستخدمينا النشطين.",
    enTitle: "Exclusive perks",
    enBody:
      "Regular events, new features, and special rewards for active members.",
  },
];

const footerLabels = {
  ar: {
    spotlight: "منصة واحدة لكل ما تحتاجه",
    quickAccess: "وصول سريع",
    supportTitle: "دعم مباشر عند الحاجة",
    supportBody:
      "إذا احتجت مساعدة في النشر أو التفعيل أو الدفع، لا تتردد في التحدث مع فريق الدعم.",
    startNow: "ابدأ الآن",
    browseNow: "اكتشف أفضل العروض اليوم",
    browseBody:
      "اعثر على العقارات والسيارات والسلع في تجربة أكثر وضوحاً وسرعة وبدون عمولات على الصفقات.",
    supportAction: "الدعم",
    signupAction: "التسجيل",
    privacy: "سياسة الخصوصية",
    terms: "شروط الخدمة",
  },
  en: {
    spotlight: "One platform for what matters",
    quickAccess: "Quick access",
    supportTitle: "Direct support when needed",
    supportBody:
      "If you need help with listing, activation, or payments, you can reach the support center directly inside the platform.",
    startNow: "Start now",
    browseNow: "Explore the best deals today",
    browseBody:
      "Find properties, vehicles, and goods in a clearer, faster experience with zero commission on deals.",
    supportAction: "Support",
    signupAction: "Sign Up",
    privacy: "Privacy Policy",
    terms: "Terms of Service",
  },
};

const SiteFooter = () => {
  const { isArabic } = useAppPreferences();
  const { data: session } = useSession();
  const user = session?.user;
  const register = useRegisterModal();
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);

  const steps = localizedSteps.map((item) =>
    isArabic
      ? { title: item.arTitle, body: item.arBody }
      : { title: item.enTitle, body: item.enBody },
  );

  const footerContent = isArabic ? footerLabels.ar : footerLabels.en;

  return (
    <footer className="footer-shell mt-12" style={{ contain: "paint" }}>
      <Container>
        <div
          className="space-y-8 py-12 md:space-y-10 md:py-16"
          style={{ contain: "content" }}
        >
          <section
            className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-stretch"
            style={{ minHeight: "auto" }}
          >
            <div
              className="footer-panel rounded-[28px] p-6 md:p-8"
              style={{ contain: "layout" }}
            >
              <div className="mb-5 flex items-center gap-3">
                <Logo
                  width={50}
                  arCustomTxt="حيث تلتقي الشهرة مع المال"
                  enCustomTxt="Where Fame and Money Meet"
                />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">
                {footerContent.spotlight}
              </p>
              <h2 className="footer-heading mt-3 text-2xl font-black tracking-tight md:text-3xl">
                {isArabic
                  ? "البيع والإيجار بأفضل الأسعار ودون عمولة"
                  : "Buy and rent at the best prices without commission"}
              </h2>
              <p className="footer-text mt-4 max-w-2xl text-sm leading-7 md:text-base">
                {isArabic
                  ? "نجمع العقارات والسيارات والسلع في تجربة واحدة واضحة وسريعة، مع دعم مباشر داخل المنصة وأدوات تساعدك على الوصول إلى الصفقة المناسبة أسرع."
                  : "Properties, vehicles, and goods come together in one clear experience with built-in support and practical tools that help you reach the right deal faster."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {user ? (
                  <button
                    onClick={() => setSupportModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-500"
                  >
                    {footerContent.supportAction}
                  </button>
                ) : (
                  <button
                    onClick={() => register.onOpen()}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-500"
                  >
                    {footerContent.signupAction}
                  </button>
                )}
                <Link
                  href="/privacy-policy"
                  className="footer-pill inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition hover:text-sky-600 dark:hover:text-sky-300"
                >
                  {footerContent.privacy}
                </Link>
              </div>
            </div>
          </section>

          <section className="grid gap-6 w-full" style={{ minHeight: "auto" }}>
            <div
              className="rounded-3xl border border-blue-300/50 bg-blue-700 p-6 shadow-lg md:p-7"
              style={{ contain: "layout" }}
            >
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-white">
                {isArabic ? "لماذا تختارنا" : "Why choose us"}
              </h3>
              <ul className="mt-5 grid gap-3 md:grid-cols-2">
                {steps.map((step) => (
                  <li
                    key={step.title}
                    className="flex items-start gap-3 rounded-2xl bg-white/14 px-4 py-3 text-sm"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-white" />
                    <span className="leading-6 text-white">
                      <span className="font-extrabold text-white">
                        {step.title}
                      </span>
                      <span className="font-normal">: {step.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <div
            dir="ltr"
            className="footer-divider footer-text flex flex-col gap-3 border-t pt-6 text-xs md:flex-row md:items-center md:justify-between"
          >
            <span>© {new Date().getFullYear()} Mashhoor</span>
            <div className="flex gap-6">
              <Link
                href="/privacy-policy"
                className="transition hover:text-sky-600 dark:hover:text-sky-300"
              >
                {footerContent.terms}
              </Link>
            </div>
          </div>
        </div>
      </Container>

      {isSupportModalOpen ? (
        <Suspense fallback={null}>
          <SupportContactModal
            isOpen={isSupportModalOpen}
            onClose={() => setSupportModalOpen(false)}
          />
        </Suspense>
      ) : null}
    </footer>
  );
};

export default memo(SiteFooter);
