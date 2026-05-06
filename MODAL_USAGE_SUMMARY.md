# Modal Component Usage Summary

## نظرة عامة

هذا الملف يحتوي على ملخص شامل لجميع الملفات التي تستخدم Modal component، خاصة تلك المتعلقة بطلبات الشراء والإيجار.

---

## 1. طلبات الشراء والإيجار الرئيسية

### 📄 [ContactElement.tsx](src/app/items/details/[id]/ContactElement.tsx)

**الموقع:** `src/app/items/details/[id]/`

**الوصف:** يوفر عنصر التواصل مع مالك العنصر، يدعم طلبات الشراء والإيجار

**العناوين المستخدمة:**

- **العربية:**
  - `طلب إيجار` (للإيجار)
  - `طلب شراء` (للشراء)
- **الإنجليزية:**
  - `Rental request` (للإيجار)
  - `Purchase request` (للشراء)

**كيفية الفتح:**

```tsx
const [open, setOpen] = useState(false);
// يتم فتح Modal من خلال: setOpen(true)
// والمودال يعرض: ContactModal
```

**المكونات الداخلية:**

- `ContactModal` - مكون منفصل يحتوي على نموذج التواصل
- يحتوي على حقول: الاسم الكامل، رقم الهاتف، ملاحظة
- زر إرسال، زر إلغاء

**البيانات المرسلة:**

```json
{
  "itemId": "string",
  "itemType": "ItemType",
  "fullName": "string",
  "requestKind": "RENT" | "BUY",
  "phoneNumber": "string",
  "note": "string (optional)"
}
```

---

### 📄 [ContactModal.tsx](src/app/items/details/[id]/ContactModal.tsx)

**الموقع:** `src/app/items/details/[id]/`

**الوصف:** مكون Modal مخصص لعرض نموذج التواصل مع مالك العنصر

**المتغيرات المستقبلة:**

- `fullName` - الاسم الكامل
- `phoneNumber` - رقم الهاتف
- `note` - ملاحظة اختيارية
- `loading` - حالة التحميل
- `submitContact` - دالة الإرسال

**العنوان:**

- `التواصل مع المالك` (AR) / `Contact owner` (EN)

---

### 📄 [PurchaseElement.tsx](src/app/items/details/[id]/PurchaseElemet.tsx)

**الموقع:** `src/app/items/details/[id]/`

**الوصف:** عنصر منفصل خصيصاً لطلبات الشراء فقط

**العنوان المستخدم:**

- `طلب شراء` (AR)

**كيفية الفتح:**

```tsx
const [open, setOpen] = useState(false);
// Modal يتم إنشاؤه مباشرة في الـ JSX بشكل شرطي
{
  open && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      {/* Modal content */}
    </div>
  );
}
```

**حقول النموذج:**

- `purchaseRequestPhone` - رقم الهاتف
- `purchaseRequestOfferedPrice` - السعر المقترح (اختياري)
- `purchaseRequestNote` - ملاحظة (اختياري)

**البيانات المرسلة:**

```json
{
  "itemId": "string",
  "itemType": "ItemType",
  "phoneNumber": "string",
  "offeredPrice": "number (optional)",
  "buyerNote": "string (optional)"
}
```

---

## 2. Modal الرئيسي (Base Component)

### 📄 [Modal.tsx](src/app/components/modals/Modal.tsx)

**الموقع:** `src/app/components/modals/`

**الوصف:** المكون الأساسي للمودال الذي يستخدمه جميع المودالات الأخرى

**Props Interface:**

```typescript
interface ModalProps {
  isOpen: boolean;
  disabled: boolean;
  onClose: () => void;
  onSubmit?: () => void;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
  title?: string;
  actionLabel?: string;
  body?: React.ReactNode;
  footer?: React.ReactElement;
  reset?: UseFormReset<FieldValues>;
}
```

**العناوين المعرّفة المدعومة:**

```typescript
const ACTION_TITLES = new Set([
  "Login",
  "تسجيل الدخول",
  "Register",
  "إنشاء حساب",
  "Activate Account",
  "تفعيل الحساب",
  "Add Car",
  "إضافة سيارة جديدة",
  "تعديل السيارة",
  "Payment Settings Password",
  "كلمة مرور إعدادات الدفع",
  "Create Payment Settings Password",
  "إنشاء كلمة مرور إعدادات الدفع",
  "Purchase Request", // ⭐ طلب الشراء
  "طلب شراء", // ⭐ طلب الشراء
  "Rental Request", // ⭐ طلب الإيجار
  "طلب إيجار", // ⭐ طلب الإيجار
]);
```

**الميزات:**

- دعم الاتجاهات (RTL/LTR)
- رسوم متحركة سلسة
- زر إغلاق في الزاوية العلوية
- عرض الإجراءات بناءً على العنوان
- دعم العديد من اللغات

---

## 3. مودالات إضافة/تعديل العناصر

### 📄 [AddUsedCarModal.tsx](src/app/components/modals/usedCar/AddUsedCarModal.tsx)

**الموقع:** `src/app/components/modals/usedCar/`

**العنوان المستخدم:**

- `إضافة سيارة جديدة` (AR) / `Add Car` (EN)
- أو `تعديل السيارة` (AR) عند التعديل

**كيفية الفتح:**

```tsx
const addCar = h.useUsedCarModal();
// addCar.onOpen("create") - لإنشاء
// addCar.onOpen("edit", data) - للتعديل
// addCar.onClose() - للإغلاق
```

**الأوضاع:**

- `create` - إنشاء سيارة جديدة
- `edit` - تعديل سيارة موجودة

---

### 📄 [AddRealEstateModal.tsx](src/app/components/modals/real-estate/AddRealEstateModal.tsx)

**الموقع:** `src/app/components/modals/real-estate/`

**العنوان المستخدم:**

- `إضافة عقار جديد` (AR) / `Add Property` (EN)

**كيفية الفتح:**

```tsx
const propertyModal = h.usePropertyModal();
propertyModal.onOpen();
propertyModal.onClose();
```

---

### 📄 [AddOther.tsx](src/app/components/modals/otherItems/AddOther.tsx)

**الموقع:** `src/app/components/modals/otherItems/`

**العنوان المستخدم:**

- `إضافة عنصر جديد` (AR) / `Add new item` (EN)

**كيفية الفتح:**

```tsx
const addOther = h.useAddOther();
addOther.onOpen();
addOther.onClose();
```

---

## 4. مودالات أخرى مهمة

### 📄 [SearchModal.tsx](src/app/components/modals/searchModal/SearchModal.tsx)

**الموقع:** `src/app/components/modals/searchModal/`

**العنوان:**

- `بحث متقدم` (AR) / `Advanced Search` (EN)

**كيفية الفتح:**

```tsx
const searchModal = useSearchModal();
searchModal.onOpen();
searchModal.onClose();
```

---

### 📄 [LoginModal.tsx](src/app/components/modals/LoginModal.tsx)

**الموقع:** `src/app/components/modals/`

**العنوان:**

- `تسجيل الدخول` (AR) / `Login` (EN)

**كيفية الفتح:**

```tsx
const loginModal = useLoginModal();
loginModal.onOpen();
loginModal.onClose();
```

---

### 📄 [RegisterModal.tsx](<src/app/components/modals/(register)/RegisterModal.tsx>)

**الموقع:** `src/app/components/modals/(register)/`

**العنوان:**

- `إنشاء حساب` (AR) / `Register` (EN)

**كيفية الفتح:**

```tsx
const registerModal = useRegisterModal();
registerModal.onOpen();
registerModal.onClose();
```

---

### 📄 [ActivationModal.tsx](<src/app/components/modals/(activationModal)/ActivationModal.tsx>)

**الموقع:** `src/app/components/modals/(activationModal)/`

**العنوان:**

- `تفعيل الحساب` (AR) / `Activate Account` (EN)

---

### 📄 [PaymentPasswordModal.tsx](<src/app/components/modals/(paymentPassword)/PaymentPasswordModal.tsx>)

**الموقع:** `src/app/components/modals/(paymentPassword)/`

**العنوان:**

- `كلمة مرور إعدادات الدفع` (AR) / `Payment Settings Password` (EN)

---

## 5. Hooks المستخدمة

### قائمة Hooks الرئيسية:

```typescript
// طلبات الشراء والإيجار
useLoginModal(); // للتحقق من تسجيل الدخول
useSearchModal(); // للبحث المتقدم

// إضافة/تعديل العناصر
useUsedCarModal(); // إضافة/تعديل السيارات المستعملة
usePropertyModal(); // إضافة/تعديل العقارات
useAddOther(); // إضافة عناصر أخرى

// الحسابات
useLoginModal(); // تسجيل الدخول
useRegisterModal(); // التسجيل الجديد
useActivationModal(); // تفعيل الحساب
usePaymentPasswordModal(); // كلمة مرور الدفع

// الإشعارات والدعوات
useInviteModal(); // إرسال الدعوات
useChatAssistantModal(); // مساعد الذكاء الاصطناعي
```

---

## 6. نمط فتح المودالات

### النمط 1: باستخدام Zustand Store

```tsx
// مثال من AddUsedCarModal.tsx
const addCar = h.useUsedCarModal();

return (
  <Modal
    disabled={isLoading}
    isOpen={addCar.isOpen}
    title={isArabic ? "إضافة سيارة جديدة" : "Add Car"}
    actionLabel={isArabic ? "حفظ" : "Save"}
    onClose={addCar.onClose}
    onSubmit={handleSubmit(onSubmit)}
    body={<FormUsedCar {...props} />}
  />
);
```

### النمط 2: باستخدام State مباشر

```tsx
// مثال من PurchaseElement.tsx
const [open, setOpen] = useState(false);

return (
  <>
    <button onClick={() => setOpen(true)}>طلب الشراء</button>
    {open && <div className="fixed inset-0...">{/* Modal content */}</div>}
  </>
);
```

### النمط 3: مكون Modal منفصل

```tsx
// مثال من ContactElement.tsx
const [open, setOpen] = useState(false);

return (
  <>
    <button onClick={() => setOpen(true)}>التواصل</button>
    {open && <ContactModal isOpen={open} setOpen={setOpen} {...props} />}
  </>
);
```

---

## 7. ملخص سريع: طلبات الشراء والإيجار

| الملف               | الموقع                 | النوع        | العنوان AR           | العنوان EN              | الطريقة     |
| ------------------- | ---------------------- | ------------ | -------------------- | ----------------------- | ----------- |
| ContactElement.tsx  | `/items/details/[id]/` | شراء + إيجار | طلب شراء / طلب إيجار | Purchase/Rental request | Modal منفصل |
| PurchaseElement.tsx | `/items/details/[id]/` | شراء فقط     | طلب شراء             | Purchase request        | State مباشر |
| ContactModal.tsx    | `/items/details/[id]/` | شراء + إيجار | التواصل مع المالك    | Contact owner           | مكون منفصل  |

---

## 8. ملاحظات مهمة

### 🔑 المتغيرات الرئيسية:

- `isArabic` - للتحقق من اللغة الحالية
- `isOpen` - لفتح/إغلاق المودال
- `onOpen()` / `onClose()` - للتحكم بالمودال
- `disabled` - لتعطيل الأزرار أثناء التحميل

### 🎨 التصميم:

- جميع المودالات تدعم الوضع الليلي (Dark Mode)
- جميع المودالات تدعم الاتجاهات (RTL/LTR)
- تحتوي على رسوم متحركة سلسة

### 🔄 تدفق البيانات:

1. المستخدم ينقر على زر (مثل "طلب الشراء")
2. يتم فتح المودال
3. يملأ المستخدم البيانات المطلوبة
4. ينقر على "إرسال"
5. يتم إرسال البيانات إلى API
6. يتم إغلاق المودال وإظهار رسالة نجاح/خطأ

---

## 9. المسارات الرئيسية

```
src/app/
├── components/
│   └── modals/
│       ├── Modal.tsx ⭐
│       ├── SearchModal.tsx
│       ├── LoginModal.tsx
│       ├── usedCar/
│       │   └── AddUsedCarModal.tsx
│       ├── real-estate/
│       │   └── AddRealEstateModal.tsx
│       ├── otherItems/
│       │   └── AddOther.tsx
│       └── ...
├── items/details/[id]/
│   ├── ContactElement.tsx ⭐
│   ├── ContactModal.tsx ⭐
│   └── PurchaseElement.tsx ⭐
├── hooks/
│   ├── useLoginModal.ts
│   ├── useSearchModal.ts
│   ├── useUsedCarModal.ts
│   └── ...
└── ...
```

---

## 10. كيفية البحث والعثور

### للبحث عن استخدام Modal:

```bash
# البحث عن كل المودالات المفتوحة
grep -r "isOpen" src/app --include="*.tsx"

# البحث عن العناوين
grep -r "طلب شراء\|طلب إيجار" src/app --include="*.tsx"

# البحث عن hooks المودال
grep -r "useModal\|onOpen\|onClose" src/app/hooks --include="*.ts"
```

---

**آخر تحديث:** مايو 2026
**المنتج:** Barrow Marketplace
