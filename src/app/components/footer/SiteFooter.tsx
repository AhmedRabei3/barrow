"use client";

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

const advantages = [
  {
    title: "هدفنا",
    description:
      "نهدف إلى تسهيل وصولكم لما ترغبون دون أن تضطروا لدفع عمولة مرتفعة.",
  },
  {
    title: "أنجز معاملاتك بسهولة",
    description:
      "أنجز معاملات البيع والإيجار بسهولة، واعثر على العقارات والسيارات والكثير من الأشياء الرائعة.",
  },
];

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

const footerSections = {
  ar: {
    categories: "الفئات",
    company: "المنصة",
    support: "الدعم",
    categoriesLinks: [
      "العقارات السكنية",
      "السيارات الجديدة",
      "السيارات المستعملة",
      "السلع والأجهزة",
      "الإعلانات المميزة",
    ],
    companyLinks: [
      "عن المنصة",
      "طريقة العمل",
      "العضوية المدفوعة",
      "سياسة الخصوصية",
      "شروط الاستخدام",
    ],
    supportLinks: [
      "مركز الدعم",
      "إرشادات الأمان",
      "الإبلاغ عن مشكلة",
      "مساعدة الدفع",
      "الأسئلة الشائعة",
    ],
    legalTerms: "شروط الخدمة",
    legalCookies: "سياسة ملفات الارتباط",
  },
  en: {
    categories: "Categories",
    company: "Company",
    support: "Support",
    categoriesLinks: [
      "Residential Properties",
      "New Cars",
      "Used Cars",
      "Goods & Devices",
      "Featured Listings",
    ],
    companyLinks: [
      "About Platform",
      "How It Works",
      "Paid Membership",
      "Privacy Policy",
      "Terms of Use",
    ],
    supportLinks: [
      "Help Center",
      "Safety Guide",
      "Report an Issue",
      "Payment Help",
      "FAQ",
    ],
    legalTerms: "Terms of Service",
    legalCookies: "Cookie Policy",
  },
};

const SiteFooter = () => {
  const { isArabic } = useAppPreferences();
  const { data: session } = useSession();
  const user = session?.user;
  const register = useRegisterModal();
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);
  const localizedAdvantages = isArabic
    ? advantages
    : [
        {
          title: "Our Mission",
          description:
            "We make it easier for you to reach what you want without paying high commissions.",
        },
        {
          title: "Close Deals with Ease",
          description:
            "Complete buying, selling, and renting faster while discovering real estate, cars, and many great listings.",
        },
        {
          title: "Paid Subscription Benefits",
          description:
            "With a paid subscription, you can generate more value from sales and rentals, invite others, and earn with tiered referral rates: 60% for the first 10 activated invites, then 40% for 11-20, 30% for 21-30, and 20% above that — provided the invited user has real listing activity (at least one non-deleted listing).",
        },
      ];

  const steps = localizedSteps.map((item) =>
    isArabic
      ? { title: item.arTitle, body: item.arBody }
      : { title: item.enTitle, body: item.enBody },
  );

  const footerContent = isArabic ? footerSections.ar : footerSections.en;

  return (
    <footer className="footer-shell mt-12">
      <Container>
        <div className="space-y-14 py-14 md:py-20">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <Logo
                width={50}
                height={30}
                arCustomTxt="حيث تلتقي الشهرة مع المال"
                enCustomTxt="Where Fame and Money Meet"
              />
            </div>
            <h2 className="footer-heading text-2xl font-black tracking-tight md:text-3xl">
              {isArabic
                ? " البيع والإيجار بأفضل الأسعار و بدون عمولة"
                : "Buy and Rent at the Best Prices Without Commission"}
            </h2>
            <p className="footer-text mt-4 max-w-2xl text-sm leading-7 md:text-base">
              {isArabic
                ? "نجمع العقارات والسيارات وكل ماتحتاجه في تجربة واحدة واضحة وسريعة ."
                : "We bring properties, vehicles, and other goods into one clear experience, with paid membership support, referrals, and a fully integrated in-app support center."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <button
                  onClick={() => setSupportModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-500"
                >
                  {isArabic ? "الدعم" : "Support"}
                </button>
              ) : (
                <button
                  onClick={() => register.onOpen()}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-500"
                >
                  {isArabic ? "التسجيل" : "Sign Up"}
                </button>
              )}
            </div>
          </div>
          <section className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <div className="border dark:border-slate-500 bg-blue-600 shadow-lg hover:translate-1.1 rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-white">
                {isArabic ? "لماذا تختارنا" : "Why you Choose Us"}
              </h3>
              <ul className="mt-5 space-y-3">
                {steps.map((step) => (
                  <li
                    key={step.title}
                    className="footer-text flex items-start gap-3 text-sm"
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary " />
                    <span className="leading-6">
                      <span className="font-extrabold text-white/80 ">
                        {step.title}
                      </span>
                      <span className="font-normal text-white/80">
                        : {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {localizedAdvantages.map((item) => (
              <article
                key={item.title}
                className="footer-card rounded-[20px] p-5"
              >
                <h3 className="footer-heading text-base font-bold md:text-lg">
                  {item.title}
                </h3>
                <p className="footer-text mt-3 text-sm leading-7">
                  {item.description}
                </p>
              </article>
            ))}
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] dark:text-white/75">
                  {isArabic ? "سجل الآن" : " Sign Up Now"}
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                  {isArabic
                    ? "أعثر على أفضل العروض"
                    : "Find the best deals now"}
                </h3>
                <p className="mt-3 text-sm leading-7 dark:text-blue-100 md:text-base">
                  {isArabic
                    ? "المال والشهرة في انتظارك، انضم إلينا وابدأ رحلتك اليوم!"
                    : "Fame and money await you, join us and start your journey today!"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] bg-blue-800 p-8 text-white shadow-[0_26px_60px_rgba(37,99,235,0.24)] md:p-10"></section>

          <div dir="ltr" className="footer-divider footer-text flex flex-col gap-3 border-t pt-6 text-xs md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} Mashhoor</span>
            <div className="flex gap-6">
              <Link
                href="/privacy-policy"
                className="transition hover:text-sky-600 dark:hover:text-sky-300"
              >
                {footerContent.legalTerms}
              </Link>
              <span>{footerContent.legalCookies}</span>
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
