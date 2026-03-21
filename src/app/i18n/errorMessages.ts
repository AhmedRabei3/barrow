export const ERROR_MESSAGES_AR: Record<string, string> = {
  Unauthorized: "غير مصرح",
  Forbidden: "غير مسموح",
  "User not found": "المستخدم غير موجود",
  "Item not found": "العنصر غير موجود",
  "Your account is not active": "حسابك غير مفعل",
  "Access denied": "تم رفض الوصول",
  "Account must be active": "يجب أن يكون الحساب مفعلًا",
  "Subscription must be active to withdraw earnings according to program rules":
    "يجب أن يكون الاشتراك فعالًا لسحب الأرباح وفق سياسة البرنامج",
  "Insufficient ready balance for withdrawal":
    "الرصيد الجاهز غير كافٍ لإتمام السحب",
  "Withdrawal amount must be greater than 0":
    "قيمة السحب يجب أن تكون أكبر من 0",
  "Valid PayPal email is required": "يلزم إدخال بريد PayPal صالح",
  "Capture failed": "تعذر تأكيد عملية الدفع",
  "Payment confirmation failed": "تعذر التحقق من عملية الدفع",
  "Payment not found": "لم يتم العثور على عملية الدفع",
  "orderId is required": "رقم الطلب مطلوب",
  "paymentId is required": "معرّف عملية الدفع مطلوب",
  "Pending payment not found": "لم يتم العثور على عملية الدفع المعلقة",
  "Invalid captured amount": "قيمة الدفع الملتقطة غير صالحة",
  "PayPal order is not approved yet":
    "طلب PayPal غير مُعتمد بعد، يرجى إكمال الموافقة أولاً",
  "Failed to create PayPal approval link": "تعذر إنشاء رابط موافقة PayPal",
  "NEXT_PUBLIC_APP_URL is not configured": "إعداد رابط التطبيق غير مكتمل",
  "Too many payment requests. Please try again shortly.":
    "عدد كبير من محاولات الدفع، يرجى المحاولة بعد قليل",
  "Too many confirmation checks. Please slow down.":
    "عدد كبير من محاولات التحقق، يرجى التمهل قليلًا",
  "Too many capture attempts. Please wait and retry.":
    "عدد كبير من محاولات تأكيد الدفع، يرجى الانتظار ثم إعادة المحاولة",
  "Invalid signature": "توقيع غير صالح",
  "Invalid webhook payload": "بيانات webhook غير صالحة",
  "Renewal is only allowed during the grace period":
    "التجديد متاح فقط خلال فترة السماح",
  "lat & lon required": "إحداثيات الموقع مطلوبة",
  "Failed to fetch nominatim": "تعذر جلب بيانات الموقع",
  "Server Error": "خطأ في الخادم",
  "Please login": "يرجى تسجيل الدخول",
  "Property not found or unauthorized":
    "العقار غير موجود أو لا تملك صلاحية تعديله",
  "Bad request": "طلب غير صالح",
  "Network Error": "خطأ في الشبكة",
  "Request failed with status code 401": "غير مصرح",
  "Request failed with status code 403": "غير مسموح",
  "Request failed with status code 404": "المورد غير موجود",
  "Request failed with status code 429":
    "تم تجاوز عدد الطلبات المسموح، حاول لاحقًا",
  "Request failed with status code 500": "حدث خطأ داخلي في الخادم",
  "Unexpected error occurred": "حدث خطأ غير متوقع",
  "Failed to start payment": "فشل بدء عملية الدفع",
  "Withdrawal failed": "تعذر تنفيذ السحب",
  "Invalid payload": "البيانات المرسلة غير صالحة",
  "Subject is required": "عنوان الرسالة مطلوب",
  "Message is required": "نص الرسالة مطلوب",
  "Subject exceeds maximum length": "عنوان الرسالة أطول من الحد المسموح",
  "Message exceeds maximum length": "نص الرسالة أطول من الحد المسموح",
  "Failed to send support message": "تعذر إرسال رسالة الدعم",
  "Failed to load support messages": "تعذر تحميل رسائل الدعم",
  "Failed to send support reply": "تعذر إرسال رد خدمة العملاء",
  "Failed to load support tickets": "تعذر تحميل تذاكر الدعم",
  "Failed to load support ticket": "تعذر تحميل تفاصيل تذكرة الدعم",
  "Failed to load tickets": "تعذر تحميل التذاكر",
  "Failed to load ticket details": "تعذر تحميل تفاصيل التذكرة",
  "Failed to send ticket reply": "تعذر إرسال الرد على التذكرة",
  "Your message has been sent": "تم إرسال رسالتك",
  "notificationId is required": "معرّف الإشعار مطلوب",
  "ticketId is required": "معرّف تذكرة الدعم مطلوب",
  "Support ticket not found": "تذكرة الدعم غير موجودة",
  "Too many support requests. Please try again shortly.":
    "عدد كبير من محاولات الإرسال، يرجى المحاولة بعد قليل",
  "User ID is required": "معرّف المستخدم مطلوب",
  "Insufficient balance for withdrawal": "الرصيد غير كافٍ للسحب",
  "Invalid action": "إجراء غير صالح",
  "No categories found": "لا توجد فئات متاحة",
  "Invalid category type": "نوع الفئة غير صالح",
  "Failed to fetch categories": "تعذر جلب الفئات",
  "Failed to load profile": "فشل تحميل الملف الشخصي",
  "Failed to fetch profile by ID": "فشل جلب الملف الشخصي بواسطة المعرّف",
  "Failed to fetch profile or profile not found":
    "فشل جلب الملف الشخصي أو أن الملف غير موجود",
  "Please enter a 6-digit code": "الرجاء إدخال رمز مكون من 6 أرقام",
  "No valid verification code found, request a new one":
    "لا يوجد رمز تحقق صالح، أعد طلب رمز جديد",
  "Verification code has expired": "انتهت صلاحية رمز التحقق",
  "Too many attempts, request a new code":
    "تم تجاوز عدد المحاولات المسموح، اطلب رمزًا جديدًا",
  "Invalid verification code": "رمز التحقق غير صحيح",
  "Please wait a minute before requesting a new code":
    "يرجى الانتظار دقيقة قبل طلب رمز جديد",
  "Activation code is required": "كود التفعيل مطلوب",
  "Activation code is invalid or expired": "كود التفعيل غير صالح أو منتهي",
  "No update data provided": "لا توجد بيانات للتحديث",
  "Name is too short": "الاسم قصير جدًا",
  "Invalid email format": "صيغة البريد الإلكتروني غير صحيحة",
  "Email is already in use": "البريد الإلكتروني مستخدم بالفعل",
  "Images are required": "الصور مطلوبة",
  "No file uploaded": "لم يتم رفع ملف",
  "Failed to upload image to Cloudinary": "فشل رفع الصورة إلى Cloudinary",
  "Error occurred while uploading image": "حدث خطأ أثناء رفع الصورة",
  "Operation failed": "فشل العملية",
  "Transaction not found": "المعاملة غير موجودة",
  "No payment record found": "لا يوجد سجل دفع",
  "Error while processing request": "حدث خطأ أثناء تنفيذ العملية",
  "Invalid input": "المدخلات غير صحيحة",
  "Verification token is missing": "رمز التحقق مفقود",
  "Invalid item data": "بيانات العنصر غير صالحة",
  "Rating must be between 1 and 5": "التقييم يجب أن يكون من 1 إلى 5",
  "Please login first": "يجب تسجيل الدخول أولاً",
  "Owner not found": "المالك غير موجود",
  "Tenant not found": "المستأجر غير موجود",
  "Internal server error": "حدث خطأ داخلي في الخادم",
  "Invalid input data.": "بيانات الإدخال غير صحيحة.",
};

const normalizeMessage = (message: string) => message.trim();

const ERROR_MESSAGES_EN: Record<string, string> = Object.fromEntries(
  Object.entries(ERROR_MESSAGES_AR).map(([en, ar]) => [
    normalizeMessage(ar),
    en,
  ]),
);

export const localizeErrorMessage = (message: string, isArabic: boolean) => {
  const normalized = normalizeMessage(message);

  if (!isArabic) {
    if (ERROR_MESSAGES_EN[normalized]) {
      return ERROR_MESSAGES_EN[normalized];
    }

    for (const [arMessage, enMessage] of Object.entries(ERROR_MESSAGES_EN)) {
      if (normalized.includes(arMessage)) {
        return enMessage;
      }
    }

    // Never leak Arabic text in English UI if no exact mapping exists.
    if (/[\u0600-\u06FF]/.test(normalized)) {
      return "Unexpected error occurred";
    }

    return message;
  }

  if (ERROR_MESSAGES_AR[normalized]) {
    return ERROR_MESSAGES_AR[normalized];
  }

  if (normalized.startsWith("Request failed with status code")) {
    return "تعذر تنفيذ الطلب، يرجى المحاولة مرة أخرى";
  }

  if (normalized.toLowerCase().includes("timeout")) {
    return "انتهت مهلة الاتصال، حاول مرة أخرى";
  }

  return message;
};

export const resolveIsArabicFromRequest = (request: {
  headers: { get: (key: string) => string | null };
}) => {
  const explicitLang = request.headers.get("x-lang") || "";
  if (explicitLang) {
    return explicitLang.toLowerCase().startsWith("ar");
  }

  const cookieHeader = request.headers.get("cookie") || "";
  const localeMatch = cookieHeader.match(/(?:^|;\s*)barrow-locale=([^;]+)/i);
  const cookieLocale = localeMatch?.[1]
    ? decodeURIComponent(localeMatch[1]).toLowerCase()
    : "";
  if (cookieLocale) {
    return cookieLocale.startsWith("ar");
  }

  const acceptLanguage = request.headers.get("accept-language") || "";
  return acceptLanguage.toLowerCase().startsWith("ar");
};

export const detectUiLocale = (): "ar" | "en" => {
  if (typeof window === "undefined") return "en";

  const storedLocale = (window.localStorage.getItem("barrow-locale") || "")
    .toLowerCase()
    .trim();
  if (storedLocale === "ar" || storedLocale === "en") {
    return storedLocale;
  }

  const htmlLang = (document?.documentElement?.lang || "").toLowerCase().trim();
  if (htmlLang.startsWith("ar")) return "ar";
  if (htmlLang.startsWith("en")) return "en";

  const navLang = (navigator?.language || "").toLowerCase();
  return navLang.startsWith("ar") ? "ar" : "en";
};

export const detectArabicUi = () => {
  return detectUiLocale() === "ar";
};
