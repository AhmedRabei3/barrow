"use client";

import { memo, useState } from "react";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import SupportContactModal from "../header/SupportContactModal";
import Logo from "../header/Logo";

const advantages = [
  {
    title: "هدف المنصة",
    description:
      "نهدف إلى تسهيل وصولكم لما ترغبون دون أن تضطروا لدفع عمولة مرتفعة.",
  },
  {
    title: "أنجز معاملاتك بسهولة",
    description:
      "أنجز معاملات البيع والإيجار بسهولة، واعثر على العقارات والسيارات والكثير من الأشياء الرائعة.",
  },
  {
    title: "مزايا الاشتراك المدفوع",
    description:
      "الاشتراك المدفوع يمنحك ميزة دعوة الآخرين بنسبة تصل إلى 60% من قيمة اشتراك أول 10 مستخدمين مفعّلين، مع استمرار مزايا البرنامج وفق نظام الشرائح المعتمد.",
  },
];

const usageSteps = [
  "حدّد نوع العنصر الذي تبحث عنه بسرعة.",
  "أكمل البيع أو الإيجار بخطوات أوضح وأسهل.",
  "استفد من الاشتراك المدفوع وبرنامج الدعوات لزيادة أرباحك.",
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

  const localizedSteps = isArabic
    ? usageSteps
    : [
        "Choose the listing type you need in seconds.",
        "Complete sale and rental transactions through clear, simple steps.",
        "Use paid subscription and referrals to grow your earnings.",
      ];

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
              <p className="footer-text mt-3 text-sm leading-7">
                {isArabic
                  ? "لأنن منصتنا الوحيدة التي تتيج لك أفضل العروض وأرحص الأسعار وتجعلك شريكاً حقيقياً في الربح أيضاً"
                  : "Because we are the only platform that gives you the best offers, the cheapest prices, and makes you a real partner in profit as well."}
              </p>
              <ul className="mt-5 space-y-3">
                {localizedSteps.map((step) => (
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
                  {isArabic ? "انطلق الآن" : "Start Now"}
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
                  {isArabic
                    ? "أعثر على أفضل العروض"
                    : "Find the best deals now"}
                </h3>
                <p className="mt-3 text-sm leading-7 text-blue-100 md:text-base">
                  {isArabic
                    ? "استخدم المنصة للإعلانات، الإيجار، وإدارة الأرباح من مكان واحد بواجهة أوضح وأكثر احترافية."
                    : "Use the platform for listings, rentals, and earnings management from one place with a clearer and more premium interface."}
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
                  <li key={link}>{link}</li>
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
              <span>{footerContent.legalTerms}</span>
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
