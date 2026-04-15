"use client";

import Link from "next/link";
import { memo, useState } from "react";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import SupportContactModal from "../header/SupportContactModal";
import Logo from "../header/Logo";

const advantages = [
  {
    title: "هدف الموقع",
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
    ar: "بيئة نظيفة وموثوقة: نفرض معايير صارمة لضمان إعلانات حقيقية وخالية من أي محتوى مخالف.",
    en: "Clean & trusted: strict standards ensure authentic listings and a safe transaction environment.",
  },
  {
    ar: "بحث ذكي وسهل: ابحث بالاسم أو الفئة أو نطاق السعر أو عبر الخريطة التفاعلية.",
    en: "Smart search: find anything by name, category, price range, or interactive map.",
  },
  {
    ar: "تنوع واسع: عقارات، سيارات، دراجات، إلكترونيات وأكثر — كل شيء في مكان واحد.",
    en: "Broad selection: real estate, cars, bikes, electronics and more — all in one place.",
  },
  {
    ar: "وصول أوسع لإعلانك: خوارزميات ذكية ونظام إحالة يرفع ظهور إعلانك أمام الجمهور المناسب.",
    en: "Greater reach: smart algorithms and referrals put your listing in front of the right audience.",
  },
  {
    ar: "بدون عمولة: أتمّ بيعك أو إيجارك دون أي رسوم أو عمولات مخفية على الصفقة.",
    en: "Zero commission: complete every sale or rental without any hidden fees on the deal.",
  },
  {
    ar: "دخل شهري متكرر: ادعُ الآخرين واكسب من كل اشتراك يتم تفعيله شهرياً عبر شرائح مختلفة تصل إلى 60% من اشتراك أول 10 مستخدمين .",
    en: "Recurring monthly income: refer others and earn from every successful subscription via tiered rewards.",
  },
  {
    ar: "مزايا حصرية دورية: فعاليات، ميزات جديدة، ومكافآت خاصة لمستخدمينا النشطين.",
    en: "Exclusive perks: regular events, new features, and special rewards for active members.",
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
  const [isSupportModalOpen, setSupportModalOpen] = useState(false);
  const privacyLabels = isArabic
    ? new Set([
        "سياسة الخصوصية",
        "شروط الاستخدام",
        footerSections.ar.legalTerms,
      ])
    : new Set(["Privacy Policy", "Terms of Use", footerSections.en.legalTerms]);

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

  const steps = localizedSteps.map((item) => (isArabic ? item.ar : item.en));

  const footerContent = isArabic ? footerSections.ar : footerSections.en;

  return (
    <footer className="footer-shell mt-12">
      <Container>
        <div className="space-y-14 py-14 md:py-20">
          <section className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="
                flex items-center 
                justify-center rounded-xl 
                bg-primary text-white 
                shadow-lg shadow-primary/20"
                >
                  <Logo width={50} height={30} />
                </div>
              </div>
              <h2 className="footer-heading text-2xl font-black tracking-tight md:text-3xl">
                {isArabic
                  ? "منصة حديثة لبيع وإيجار واكتشاف أفضل العروض"
                  : "A modern marketplace for selling, renting, and discovering strong offers"}
              </h2>
              <p className="footer-text mt-4 max-w-2xl text-sm leading-7 md:text-base">
                {isArabic
                  ? "نجمع العقارات والسيارات والسلع الأخرى في تجربة واحدة واضحة وسريعة ."
                  : "We bring properties, vehicles, and other goods into one clear experience, with paid membership support, referrals, and a fully integrated in-app support center."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-blue-500"
                >
                  {isArabic ? "فتح مركز الدعم" : "Open Support Center"}
                </button>
              </div>
            </div>

            <div className="footer-panel rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-[0.22em] text-primary">
                {isArabic ? "لماذا تختارنا" : "Why you Choose Us"}
              </h3>
              <ul className="mt-5 space-y-3">
                {steps.map((step) => (
                  <li
                    key={step}
                    className="footer-text flex items-start gap-3 text-sm"
                  >
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
                    <span className="leading-6">{step}</span>
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
          </section>

          <section className="rounded-[28px] bg-blue-800 p-8 text-white shadow-[0_26px_60px_rgba(37,99,235,0.24)] md:p-10">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">
                  {isArabic ? "سجل الآن" : " Sign Up Now"}
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                  {isArabic
                    ? "أعثر على أفضل العروض"
                    : "Find the best deals now"}
                </h3>
                <p className="mt-3 text-sm leading-7 text-blue-100 md:text-base">
                  {isArabic
                    ? " البيع ،الإيجار، وإدارة الأرباح من مكان واحد بواجهة أوضح وأكثر احترافية."
                    : "Sell, rent, and earnings management from one place with a clearer and more premium interface."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="inline-flex items-center justify-center 
                rounded-2xl bg-blue-600 px-6 py-4 
                text-sm font-black text-primary 
                transition hover:scale-[1.02]"
              >
                {isArabic ? "تحدث مع الدعم" : "Talk to Support"}
              </button>
            </div>
          </section>

          <section className="footer-divider grid grid-cols-1 gap-10 border-t pt-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="footer-heading mb-5 text-xs font-black uppercase tracking-[0.22em]">
                {isArabic ? "نبذة" : "About"}
              </h4>
              <p className="footer-text text-sm leading-7">
                {isArabic
                  ? "منصة متعددة الفئات توازن بين سهولة العرض، وضوح المعاملات، وإدارة الأرباح للمستخدم."
                  : "A multi-category marketplace balancing simple listings, clear transactions, and earnings management for users."}
              </p>
              <div className="footer-text mt-5 flex gap-3">
                <span className="footer-social flex h-10 w-10 items-center justify-center rounded-full">
                  ⌁
                </span>
                <span className="footer-social flex h-10 w-10 items-center justify-center rounded-full">
                  ⌂
                </span>
                <span className="footer-social flex h-10 w-10 items-center justify-center rounded-full">
                  ✉
                </span>
              </div>
            </div>

            <div>
              <h4 className="footer-heading mb-5 text-xs font-black uppercase tracking-[0.22em]">
                {footerContent.categories}
              </h4>
              <ul className="footer-text space-y-3 text-sm">
                {footerContent.categoriesLinks.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="footer-heading mb-5 text-xs font-black uppercase tracking-[0.22em]">
                {footerContent.company}
              </h4>
              <ul className="footer-text space-y-3 text-sm">
                {footerContent.companyLinks.map((link) => (
                  <li key={link}>
                    {privacyLabels.has(link) ? (
                      <Link
                        href="/privacy-policy"
                        className="transition hover:text-sky-600 dark:hover:text-sky-300"
                      >
                        {link}
                      </Link>
                    ) : (
                      link
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="footer-heading mb-5 text-xs font-black uppercase tracking-[0.22em]">
                {footerContent.support}
              </h4>
              <ul className="footer-text space-y-3 text-sm">
                {footerContent.supportLinks.map((link) => (
                  <li key={link}>{link}</li>
                ))}
              </ul>
            </div>
          </section>

          <div className="footer-divider footer-text flex flex-col gap-3 border-t pt-6 text-xs md:flex-row md:items-center md:justify-between">
            <span>© {new Date().getFullYear()} Rent Anything</span>
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

      <SupportContactModal
        isOpen={isSupportModalOpen}
        onClose={() => setSupportModalOpen(false)}
      />
    </footer>
  );
};

export default memo(SiteFooter);
