export type PrivacyPolicySection = {
  title: string;
  body: string;
};

export const privacyPolicyContent = {
  ar: {
    pageTitle: "شروط التسجيل وسياسة الخصوصية",
    pageDescription: "يجب الموافقة على هذه الشروط قبل إكمال التسجيل في المنصة.",
    agreementLabel:
      "أوافق على شروط التسجيل وسياسة الخصوصية، وأدرك أنه في حال عدم الموافقة لا يتم إكمال عملية التسجيل.",
    agreementError:
      "يجب الموافقة على شروط التسجيل وسياسة الخصوصية لإكمال التسجيل",
    openPolicyLabel: "قراءة الشروط والسياسة كاملة",
    intro:
      "مرحبًا بك في منصتنا. باستخدامك لخدمات الموقع والتسجيل فيه، فإنك توافق على الالتزام بالشروط والأحكام التالية:",
    sections: [
      {
        title: "1. مراجعة المحتوى",
        body: "يخضع جميع المحتوى الذي يقوم المستخدمون بنشره، بما في ذلك النصوص والصور، لعملية مراجعة واعتماد من قبل إدارة الموقع قبل نشره، وذلك لضمان جودة المحتوى وملاءمته لمعايير المنصة.",
      },
      {
        title: "2. سياسة المحتوى غير اللائق",
        body: "تعتمد المنصة سياسة صارمة تجاه نشر أي محتوى أو صور غير لائقة أو مخالفة للآداب العامة. ويحق للإدارة حذف هذا المحتوى واتخاذ الإجراءات المناسبة بحق المستخدم المخالف دون إشعار مسبق.",
      },
      {
        title: "3. مكافحة الاحتيال والتلاعب",
        body: "يُحظر القيام بأي محاولات للتلاعب أو الاحتيال أو استغلال النظام. وفي حال اكتشاف أي نشاط مخالف، تحتفظ إدارة الموقع بحق إيقاف الحساب بشكل فوري، واتخاذ الإجراءات القانونية اللازمة وفقًا للقوانين المعمول بها.",
      },
      {
        title: "4. ضمان الحقوق المالية",
        body: "تلتزم المنصة بضمان حصول المستخدمين على مستحقاتهم المالية الناتجة عن استخدامهم للخدمة، وذلك وفق الأنظمة والإجراءات المعتمدة داخل الموقع.",
      },
      {
        title: "5. توثيق الحساب وحماية البيانات",
        body: "يلتزم المستخدم بتقديم البيانات الشخصية اللازمة لتوثيق الحساب عند الطلب، وذلك لضمان حماية الحساب وتأمين العمليات المالية. ويتم التعامل مع هذه البيانات بسرية تامة وفق سياسة الخصوصية المعتمدة، ولن يتم مشاركتها مع أي طرف ثالث إلا في الحالات التي يفرضها القانون أو لحماية حقوق المستخدم والمنصة.",
      },
    ] satisfies PrivacyPolicySection[],
  },
  en: {
    pageTitle: "Registration Terms and Privacy Policy",
    pageDescription:
      "You must accept these terms before completing account registration.",
    agreementLabel:
      "I agree to the registration terms and privacy policy, and I understand that registration cannot be completed without this consent.",
    agreementError:
      "You must accept the registration terms and privacy policy to continue",
    openPolicyLabel: "Read the full policy",
    intro:
      "Welcome to our platform. By registering and using the site services, you agree to comply with the following terms and conditions:",
    sections: [
      {
        title: "1. Content review",
        body: "All content published by users, including text and images, is subject to review and approval by the site administration before publication to ensure quality and compliance with platform standards.",
      },
      {
        title: "2. Inappropriate content policy",
        body: "The platform applies a strict policy against publishing inappropriate content or images or anything that violates public decency. Management may remove such content and take appropriate action against the violating user without prior notice.",
      },
      {
        title: "3. Fraud and manipulation prevention",
        body: "Any attempt to manipulate, defraud, or exploit the system is prohibited. If a violation is detected, the platform reserves the right to suspend the account immediately and take any legal action permitted by applicable law.",
      },
      {
        title: "4. Protection of financial rights",
        body: "The platform is committed to safeguarding users' financial entitlements resulting from their use of the service, according to the systems and procedures adopted within the site.",
      },
      {
        title: "5. Account verification and data protection",
        body: "The user agrees to provide the personal data required for account verification when requested, in order to protect the account and secure financial operations. This data is handled confidentially under the platform privacy policy and will not be shared with any third party except where required by law or necessary to protect the rights of the user and the platform.",
      },
    ] satisfies PrivacyPolicySection[],
  },
};
