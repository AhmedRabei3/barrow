"use client";

import { memo, useState } from "react";
import Container from "../Container";
import { useAppPreferences } from "../providers/AppPreferencesProvider";
import SupportContactModal from "../header/SupportContactModal";

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

  const supportTitle = isArabic
    ? "التواصل مع خدمة العملاء"
    : "Contact Customer Service";

  const supportDescription = isArabic
    ? "إذا واجهت أي مشكلة في الدفع، التفعيل، أو السحب، تواصل عبر مركز الدعم فقط من داخل المنصة."
    : "If you face any issue with payments, activation, or withdrawals, contact support only through the in-app support center.";

  return (
    <footer className="mt-10 md:mt-14 border-t border-slate-200 bg-white/80 dark:bg-slate-950/90 dark:border-slate-800">
      <Container>
        <div className="py-8 md:py-10 space-y-8">
          <section>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {isArabic
                ? "لماذا يختار المستخدمون منصتنا؟"
                : "Why Choose Our Platform?"}
            </h2>
            <p className="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-300">
              {isArabic
                ? "منصة واحدة تساعدك على الوصول لما تريد بسرعة، وإنجاز معاملات البيع والإيجار بوضوح وبتكلفة عادلة."
                : "One platform to help you find what you need quickly and complete sale and rental transactions with clarity and fair cost."}
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {localizedAdvantages.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 dark:bg-slate-900 dark:border-slate-700"
              >
                <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base md:text-lg">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-6">
                  {item.description}
                </p>
              </article>
            ))}
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-6 dark:bg-slate-900 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base md:text-lg">
              {isArabic ? "كيف تستفيد أكثر؟" : "How to Get More Value"}
            </h3>
            <ul className="mt-3 space-y-2 text-sm md:text-base text-slate-700 dark:text-slate-300">
              {localizedSteps.map((step) => (
                <li key={step} className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-sky-500" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-xl border border-sky-100 bg-sky-50 p-4 md:p-5 dark:bg-slate-900 dark:border-slate-700">
            <p className="text-sm md:text-base text-slate-700 dark:text-slate-300">
              {isArabic
                ? "ابدأ الآن: بيع، إيجار، واكتشاف أفضل الخيارات لك في مكان واحد."
                : "Start now: buy, sell, rent, and discover the best options in one place."}
            </p>
            <span className="text-xs md:text-sm font-medium text-sky-700">
              {isArabic
                ? "وصول أسهل • معاملات أسرع • أرباح أكبر"
                : "Easier access • Faster deals • Higher earnings"}
            </span>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-6 dark:bg-slate-900 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-base md:text-lg">
              {supportTitle}
            </h3>
            <p className="mt-2 text-sm md:text-base text-slate-600 dark:text-slate-300">
              {supportDescription}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setSupportModalOpen(true)}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
              >
                {isArabic
                  ? "فتح مركز الدعم"
                  : "Open Support Center"}
              </button>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                {isArabic
                  ? "التواصل متاح عبر مركز الدعم فقط من داخل المنصة."
                  : "Contact is available only through the in-app support center."}
              </p>
            </div>
          </section>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs md:text-sm text-slate-500 dark:text-slate-400 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <span>© {new Date().getFullYear()} Rent Anything</span>
            <span>
              {isArabic
                ? "منصة عرض وتأجير وبيع عناصر متعددة بسهولة"
                : "A marketplace for listing, renting, and selling different items with ease"}
            </span>
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
