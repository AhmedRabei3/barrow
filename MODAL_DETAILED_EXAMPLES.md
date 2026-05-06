# Modal Titles and Opening Methods - تفاصيل شاملة

## جدول العناوين المستخدمة في المودالات

### طلبات الشراء والإيجار - Purchase & Rental Requests ⭐

| الملف               | الحالة | العنوان العربي | العنوان الإنجليزي | الطريقة       | الحقول                |
| ------------------- | ------ | -------------- | ----------------- | ------------- | --------------------- |
| ContactElement.tsx  | شراء   | طلب شراء       | Purchase request  | setOpen(true) | الاسم، الهاتف، ملاحظة |
| ContactElement.tsx  | إيجار  | طلب إيجار      | Rental request    | setOpen(true) | الاسم، الهاتف، ملاحظة |
| PurchaseElement.tsx | شراء   | طلب شراء       | Purchase request  | setOpen(true) | الهاتف، السعر، ملاحظة |

### إضافة العناصر - Add Items

| الملف                  | نوع العنصر            | العنوان العربي    | العنوان الإنجليزي | الـ Hook         | الطريقة              |
| ---------------------- | --------------------- | ----------------- | ----------------- | ---------------- | -------------------- |
| AddUsedCarModal.tsx    | سيارة مستعملة         | إضافة سيارة جديدة | Add Car           | useUsedCarModal  | onOpen("create")     |
| AddUsedCarModal.tsx    | سيارة مستعملة (تعديل) | تعديل السيارة     | Edit Car          | useUsedCarModal  | onOpen("edit", data) |
| AddRealEstateModal.tsx | عقار                  | إضافة عقار جديد   | Add Property      | usePropertyModal | onOpen()             |
| AddOther.tsx           | عنصر آخر              | إضافة عنصر جديد   | Add new item      | useAddOther      | onOpen()             |

### المودالات الأخرى - Other Modals

| الملف                    | الغرض           | العنوان العربي          | العنوان الإنجليزي         | الـ Hook                |
| ------------------------ | --------------- | ----------------------- | ------------------------- | ----------------------- |
| LoginModal.tsx           | تسجيل الدخول    | تسجيل الدخول            | Login                     | useLoginModal           |
| RegisterModal.tsx        | التسجيل الجديد  | إنشاء حساب              | Register                  | useRegisterModal        |
| SearchModal.tsx          | البحث المتقدم   | بحث متقدم               | Advanced Search           | useSearchModal          |
| ActivationModal.tsx      | تفعيل الحساب    | تفعيل الحساب            | Activate Account          | useActivationModal      |
| PaymentPasswordModal.tsx | كلمة مرور الدفع | كلمة مرور إعدادات الدفع | Payment Settings Password | usePaymentPasswordModal |
| InviteModal.tsx          | الدعوات         | إرسال دعوة              | Send Invite               | useInviteModal          |
| ChatAssistantModal.tsx   | المساعد الذكي   | مساعد الذكاء الاصطناعي  | AI Assistant              | useChatAssistantModal   |

---

## أمثلة عملية - Practical Examples

### 1️⃣ طلب الشراء من ContactElement.tsx

**المسار:** `src/app/items/details/[id]/ContactElement.tsx`

```tsx
// 1. إنشاء state للتحكم بالمودال
const [open, setOpen] = useState(false);
const [fullName, setFullName] = useState(session?.user?.name || "");
const [phoneNumber, setPhoneNumber] = useState("");
const [note, setNote] = useState("");
const [loading, setLoading] = useState(false);

// 2. تحديد نوع الطلب (شراء أو إيجار)
const requestKind = sellOrRent === "RENT" ? "RENT" : "BUY";
const requestTitle =
  requestKind === "RENT"
    ? t("طلب إيجار", "Rental request")
    : t("طلب شراء", "Purchase request");

// 3. دالة الإرسال
const submitContact = async () => {
  try {
    setLoading(true);

    const res = await fetch("/api/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemId: id,
        itemType,
        fullName,
        requestKind, // "RENT" أو "BUY"
        phoneNumber,
        note,
      }),
    });

    if (!res.ok) throw new Error("Failed");

    toast.success("تم إرسال الطلب بنجاح");
    setOpen(false); // إغلاق المودال
  } finally {
    setLoading(false);
  }
};

// 4. الواجهة
<button onClick={() => setOpen(true)}>{t("التواصل", "Contact")}</button>;

{
  open && (
    <ContactModal
      fullName={fullName}
      setFullName={setFullName}
      phoneNumber={phoneNumber}
      setPhoneNumber={setPhoneNumber}
      note={note}
      setNote={setNote}
      submitContact={submitContact}
      loading={loading}
      setOpen={setOpen}
    />
  );
}
```

---

### 2️⃣ طلب الشراء من PurchaseElement.tsx

**المسار:** `src/app/items/details/[id]/PurchaseElemet.tsx`

```tsx
// 1. State بسيط جداً
const [open, setOpen] = useState(false);
const [phoneNumber, setPhoneNumber] = useState("");
const [offeredPrice, setOfferedPrice] = useState<number | undefined>();
const [note, setNote] = useState("");
const [loading, setLoading] = useState(false);

// 2. دالة الإرسال
const submitPurchaseRequest = async () => {
  try {
    setLoading(true);

    const res = await fetch("/api/purchase", {
      method: "POST",
      body: JSON.stringify({
        itemId: id,
        itemType,
        phoneNumber,
        offeredPrice, // سعر مقترح اختياري
        buyerNote: note,
      }),
    });

    if (!res.ok) throw new Error("Failed");

    toast.success("تم إرسال طلب الشراء بنجاح، سيتم التواصل معك قريبًا");
    setOpen(false);
  } finally {
    setLoading(false);
  }
};

// 3. الواجهة - HTML مباشر
<button onClick={() => setOpen(true)}>طلب الشراء</button>;

{
  open && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <h4 className="text-lg font-semibold">طلب شراء</h4>

        <input
          type="tel"
          placeholder="رقم الهاتف"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />

        <input
          type="number"
          placeholder="سعر مقترح (اختياري)"
          onChange={(e) => setOfferedPrice(Number(e.target.value))}
        />

        <textarea
          placeholder="ملاحظة (اختياري)"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="flex gap-2">
          <button onClick={submitPurchaseRequest} disabled={loading}>
            {loading ? "جاري الإرسال..." : "إرسال الطلب"}
          </button>
          <button onClick={() => setOpen(false)}>إلغاء</button>
        </div>
      </div>
    </div>
  );
}
```

---

### 3️⃣ إضافة سيارة من AddUsedCarModal.tsx

**المسار:** `src/app/components/modals/usedCar/AddUsedCarModal.tsx`

```tsx
// 1. استخدام Hook من Zustand
const addCar = h.useUsedCarModal();
const { isArabic } = useAppPreferences();
const [isLoading, setIsLoading] = useState(false);

// 2. فتح المودال
const handleAddNew = () => {
  addCar.onOpen("create"); // إنشاء جديد
};

const handleEdit = (data) => {
  addCar.onOpen("edit", data); // تعديل موجود
};

const handleClose = () => {
  addCar.onClose();
};

// 3. الواجهة
<Modal
  disabled={isLoading}
  isOpen={addCar.isOpen}
  title={
    addCar.mode === "edit"
      ? isArabic
        ? "تعديل السيارة"
        : "Edit Car"
      : isArabic
        ? "إضافة سيارة جديدة"
        : "Add Car"
  }
  actionLabel={isArabic ? "حفظ" : "Save"}
  onClose={addCar.onClose}
  onSubmit={handleSubmit(onSubmit)}
  body={<FormUsedCar register={register} watch={watch} />}
/>;
```

---

### 4️⃣ البحث المتقدم من SearchModal.tsx

**المسار:** `src/app/components/modals/searchModal/SearchModal.tsx`

```tsx
// 1. استخدام Hook
const searchModal = useSearchModal();
const { isArabic } = useAppPreferences();

// 2. الواجهة
<Modal
  title={isArabic ? "بحث متقدم" : "Advanced Search"}
  isOpen={searchModal.isOpen}
  onClose={searchModal.onClose}
  actionLabel={isArabic ? "بحث" : "Search"}
  disabled={false}
  body={<SearchWizard onFinish={searchModal.onClose} />}
/>;

// 3. فتح المودال
const openSearch = () => {
  searchModal.onOpen();
};

// 4. إغلاق المودال
const closeSearch = () => {
  searchModal.onClose();
};
```

---

## دليل الاستخدام السريع - Quick Reference

### 🟢 لإضافة طلب شراء جديد:

**الملفات المتورطة:**

1. `ContactElement.tsx` أو `PurchaseElement.tsx` - في صفحة تفاصيل العنصر
2. `ContactModal.tsx` - مكون المودال

**الخطوات:**

```
صفحة التفاصيل
    ↓
أنقر على "التواصل" أو "طلب الشراء"
    ↓
يفتح Modal يطلب: اسم + هاتف + ملاحظة
    ↓
أدخل البيانات وأنقر "إرسال"
    ↓
يتم إرسال طلب إلى /api/purchase
    ↓
يظهر رسالة نجاح ويغلق المودال
```

---

### 🟠 لإضافة سيارة جديدة:

**الملفات المتورطة:**

1. `AddUsedCarModal.tsx` - المودال الرئيسي
2. `FormUsedCar.tsx` - نموذج البيانات
3. `useUsedCarModal.ts` - Hook التحكم

**الخطوات:**

```
أنقر على "إضافة سيارة"
    ↓
يفتح Modal مع نموذج متعدد الخطوات
    ↓
ملأ البيانات الأساسية
    ↓
اختر الصور
    ↓
اختر الموقع
    ↓
أنقر "حفظ"
    ↓
يتم إرسال البيانات إلى /api/cars/used_car
    ↓
يغلق المودال ويعيد التوجيه
```

---

### 🔵 لعمل بحث متقدم:

**الملفات المتورطة:**

1. `SearchModal.tsx` - المودال الرئيسي
2. `SearchWizard.tsx` - نموذج البحث
3. `useSearchModal.ts` - Hook التحكم

**الخطوات:**

```
أنقر على أيقونة البحث
    ↓
يفتح Modal بحث متقدم
    ↓
اختر معايير البحث
    ↓
أنقر "بحث"
    ↓
يتم فلترة النتائج
    ↓
يغلق المودال
```

---

## ملخص العناوين المعترف بها

يوجد في `Modal.tsx` مجموعة من العناوين المعترف بها والتي يتم عرض الأزرار لها تلقائياً:

```typescript
const ACTION_TITLES = new Set([
  // تسجيل الدخول والحسابات
  "Login",
  "تسجيل الدخول",
  "Register",
  "إنشاء حساب",
  "Activate Account",
  "تفعيل الحساب",

  // إضافة وتعديل العناصر
  "Add Car",
  "إضافة سيارة جديدة",
  "تعديل السيارة",

  // كلمات المرور
  "Payment Settings Password",
  "كلمة مرور إعدادات الدفع",
  "Create Payment Settings Password",
  "إنشاء كلمة مرور إعدادات الدفع",

  // ⭐ طلبات الشراء والإيجار
  "Purchase Request",
  "طلب شراء",
  "Rental Request",
  "طلب إيجار",
]);
```

**ملاحظة:** هذه العناوين تؤدي إلى عرض أزرار "حفظ" أو "إرسال" تلقائياً.

---

## نصائح مهمة

### ✅ الأفضليات:

- ✅ استخدم `Zustand` hooks للمودالات الكبيرة والمعقدة
- ✅ استخدم `useState` للمودالات البسيطة والصغيرة
- ✅ اجعل العناوين متسقة بين العربية والإنجليزية
- ✅ أضف تحقق من البيانات قبل الإرسال
- ✅ اعرض رسائل نجاح/خطأ واضحة

### ❌ تجنب:

- ❌ لا تترك مودالات مفتوحة بدون زر إغلاق
- ❌ لا تستخدم عناوين غير معترف بها بدون إضافتها إلى `ACTION_TITLES`
- ❌ لا تنسى تنظيف حالة التحميل بعد الإرسال
- ❌ لا تترك المستخدم يرى خطأ بدون رسالة واضحة

---

**آخر تحديث:** مايو 2026
