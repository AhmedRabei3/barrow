# Modal Files Quick Reference - قائمة الملفات السريعة

## 📋 جدول المحتويات

1. [الملفات الأساسية](#الملفات-الأساسية)
2. [مودالات طلبات الشراء والإيجار](#مودالات-طلبات-الشراء-والإيجار)
3. [مودالات إضافة العناصر](#مودالات-إضافة-العناصر)
4. [مودالات التحقق والحسابات](#مودالات-التحقق-والحسابات)
5. [ملفات الـ Hooks](#ملفات-الـ-hooks)
6. [الملفات ذات الصلة](#الملفات-ذات-الصلة)

---

## الملفات الأساسية

### 🔧 [Modal.tsx](src/app/components/modals/Modal.tsx)

**النوع:** Base Component (مكون أساسي)
**الموقع:** `src/app/components/modals/`
**الحجم:** ~250 سطر
**الوصف:** المكون الأساسي الذي تستخدمه جميع المودالات الأخرى
**العناوين المدعومة:**

- ✅ Purchase Request / طلب شراء
- ✅ Rental Request / طلب إيجار
- ✅ Add Car / إضافة سيارة جديدة
- ✅ Edit Car / تعديل السيارة
- ✅ Login / تسجيل الدخول
- ✅ Register / إنشاء حساب
- و10+ عناوين أخرى

**الـ Props الرئيسية:**

```typescript
isOpen: boolean
disabled: boolean
title?: string
body?: React.ReactNode
actionLabel?: string
onClose: () => void
onSubmit?: () => void
footer?: React.ReactElement
```

---

## مودالات طلبات الشراء والإيجار

### 🛒 [ContactElement.tsx](src/app/items/details/[id]/ContactElement.tsx)

**النوع:** Page Component (مكون صفحة)
**الموقع:** `src/app/items/details/[id]/`
**الحجم:** ~250 سطر
**الوصف:** عنصر التواصل مع مالك العنصر، يدعم الشراء والإيجار
**الحالات:**

- 🟢 معتمد و متوفر
- 🔴 غير متوفر

**العناوين:**

- AR: `طلب شراء` / `طلب إيجار`
- EN: `Purchase request` / `Rental request`

**الحقول:**

- ✅ الاسم الكامل (Full name)
- ✅ رقم الهاتف (Phone number)
- ✅ ملاحظة (Note)

**الـ API:**

- `POST /api/purchase`

**المكونات المستخدمة:**

- `ContactModal` - مكون المودال المنفصل
- `useLoginModal()` - للتحقق من تسجيل الدخول

---

### 💬 [ContactModal.tsx](src/app/items/details/[id]/ContactModal.tsx)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/items/details/[id]/`
**الحجم:** ~125 سطر
**الوصف:** مكون منفصل يعرض نموذج التواصل
**العنوان:**

- AR: `التواصل مع المالك`
- EN: `Contact owner`

**المتغيرات المستقبلة:**

```typescript
fullName: string
setFullName: (value: string) => void
phoneNumber: string
setPhoneNumber: (value: string) => void
note: string
setNote: (value: string) => void
submitContact: () => Promise<void>
loading: boolean
setOpen: (value: boolean) => void
```

**التصميم:**

- 📱 مستجيب (Responsive)
- 🌙 دعم الوضع الليلي
- 🔄 دعم RTL/LTR

---

### 🛍️ [PurchaseElement.tsx](src/app/items/details/[id]/PurchaseElemet.tsx)

**النوع:** Page Component (مكون صفحة)
**الموقع:** `src/app/items/details/[id]/`
**الحجم:** ~200 سطر
**الوصف:** عنصر منفصل لطلبات الشراء فقط
**الحالات:**

- 🟢 متوفر - زر نشط
- 🔴 غير متوفر - زر معطل

**العنوان:**

- AR: `طلب شراء`

**الحقول:**

- ✅ رقم الهاتف (Phone number) - مطلوب
- ❓ السعر المقترح (Offered price) - اختياري
- ❓ ملاحظة (Note) - اختياري

**الـ API:**

- `POST /api/purchase`

**خصوصيات:**

- يوجد به Modal مدمج (Inline Modal)
- لا يستخدم مكون منفصل
- HTML مباشر

---

## مودالات إضافة العناصر

### 🚗 [AddUsedCarModal.tsx](src/app/components/modals/usedCar/AddUsedCarModal.tsx)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/components/modals/usedCar/`
**الحجم:** ~150 سطر
**الوصف:** مودال إضافة/تعديل السيارات المستعملة
**الأوضاع:**

- 🆕 Create - إنشاء جديد
- ✏️ Edit - تعديل موجود

**العناوين:**

- AR: `إضافة سيارة جديدة` / `تعديل السيارة`
- EN: `Add Car` / `Edit Car`

**الـ Hook المستخدم:**

```typescript
const addCar = h.useUsedCarModal();
addCar.isOpen; // حالة الفتح
addCar.mode; // "create" أو "edit"
addCar.initialData; // البيانات الأولية للتعديل
addCar.onOpen(mode, data); // فتح المودال
addCar.onClose(); // إغلاق المودال
```

**الحقول:**

```
الخطوة 1: البيانات الأساسية
- brand (الماركة)
- model (الموديل)
- year (السنة)
- color (اللون)
- price (السعر)

الخطوة 2: الخيارات الإضافية
- gearType (نوع الناقل)
- fuelType (نوع الوقود)
- mileage (المسافة)
- status (الحالة)
- repainted (معاد الطلاء)

الخطوة 3: الصور
- selectedImages (الصور المختارة)

الخطوة 4: الموقع
- latitude, longitude
- address, city, state, country
```

**الـ API:**

- `POST /api/cars/used_car` (create)
- `PUT/PATCH` (edit - إن توفر)

**المكونات المستخدمة:**

- `FormUsedCar` - نموذج البيانات
- `Wizard` - معالج متعدد الخطوات
- `LocationSelector` - محدد الموقع

---

### 🏢 [AddRealEstateModal.tsx](src/app/components/modals/real-estate/AddRealEstateModal.tsx)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/components/modals/real-estate/`
**الحجم:** ~120 سطر
**الوصف:** مودال إضافة العقارات
**الأوضاع:**

- 🆕 Create - إنشاء عقار جديد

**العنوان:**

- AR: `إضافة عقار جديد`
- EN: `Add Property`

**الـ Hook المستخدم:**

```typescript
const propertyModal = h.usePropertyModal();
propertyModal.isOpen;
propertyModal.onOpen();
propertyModal.onClose();
```

**الخطوات:**

1. StepBasicInfo - البيانات الأساسية
2. StepExtraInfo - معلومات إضافية
3. StepImages - الصور
4. StepNumbers - الأرقام والتفاصيل
5. LocationSelector - الموقع

**الـ API:**

- `POST /api/realestate`

---

### 📦 [AddOther.tsx](src/app/components/modals/otherItems/AddOther.tsx)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/components/modals/otherItems/`
**الحجم:** ~90 سطر
**الوصف:** مودال إضافة العناصر الأخرى
**الأوضاع:**

- 🆕 Create - إنشاء عنصر جديد

**العنوان:**

- AR: `إضافة عنصر جديد`
- EN: `Add new item`

**الـ Hook المستخدم:**

```typescript
const addOther = h.useAddOther();
addOther.isOpen;
addOther.onOpen();
addOther.onClose();
```

**الخطوات:**

1. OtherBasicInfo - البيانات الأساسية
2. StepImages - الصور
3. LocationSelector - الموقع

**الـ API:**

- `POST /api/otherItems`

---

## مودالات التحقق والحسابات

### 🔐 [LoginModal.tsx](src/app/components/modals/LoginModal.tsx)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/components/modals/`
**الحجم:** ~400+ سطر
**الوصف:** مودال تسجيل الدخول
**العنوان:**

- AR: `تسجيل الدخول`
- EN: `Login`

**الحقول:**

- البريد الإلكتروني
- كلمة المرور
- نسيان كلمة المرور (Forgot password)
- تحقق من البريد

**الـ Hook المستخدم:**

```typescript
const loginModal = useLoginModal();
loginModal.isOpen;
loginModal.onOpen();
loginModal.onClose();
```

---

### 📝 [RegisterModal.tsx](<src/app/components/modals/(register)/RegisterModal.tsx>)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/components/modals/(register)/`
**الحجم:** ~300+ سطر
**الوصف:** مودال التسجيل الجديد
**العنوان:**

- AR: `إنشاء حساب`
- EN: `Register`

**الحقول:**

- الاسم الكامل
- البريد الإلكتروني
- كلمة المرور
- تأكيد كلمة المرور
- رقم الهاتف
- (خيارات إضافية)

---

### ✅ [ActivationModal.tsx](<src/app/components/modals/(activationModal)/ActivationModal.tsx>)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/components/modals/(activationModal)/`
**الوصف:** مودال تفعيل الحساب
**العنوان:**

- AR: `تفعيل الحساب`
- EN: `Activate Account`

---

### 🔑 [PaymentPasswordModal.tsx](<src/app/components/modals/(paymentPassword)/PaymentPasswordModal.tsx>)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/components/modals/(paymentPassword)/`
**الوصف:** مودال إنشاء/تعديل كلمة مرور الدفع
**العنوان:**

- AR: `كلمة مرور إعدادات الدفع`
- EN: `Payment Settings Password`

---

### 🔍 [SearchModal.tsx](src/app/components/modals/searchModal/SearchModal.tsx)

**النوع:** Modal Component (مكون مودال)
**الموقع:** `src/app/components/modals/searchModal/`
**الوصف:** مودال البحث المتقدم
**العنوان:**

- AR: `بحث متقدم`
- EN: `Advanced Search`

**الـ Hook المستخدم:**

```typescript
const searchModal = useSearchModal();
searchModal.isOpen;
searchModal.onOpen();
searchModal.onClose();
```

---

## ملفات الـ Hooks

### 🎣 Hooks في `src/app/hooks/`

| اسم الـ Hook              | الملف                   | الغرض                        |
| ------------------------- | ----------------------- | ---------------------------- |
| `useLoginModal()`         | `useLoginModal.ts`      | التحكم بمودال تسجيل الدخول   |
| `useRegisterModal()`      | `useRegisterModal.ts`   | التحكم بمودال التسجيل        |
| `useSearchModal()`        | `useSearchModal.ts`     | التحكم بمودال البحث          |
| `useUsedCarModal()`       | `useUsedCarModal.ts`    | التحكم بمودال السيارات       |
| `usePropertyModal()`      | (في hooks index)        | التحكم بمودال العقارات       |
| `useAddOther()`           | (في hooks index)        | التحكم بمودال العناصر الأخرى |
| `useActivationModal()`    | `useActivationModal.ts` | التحكم بمودال التفعيل        |
| `useInviteModal()`        | `useInviteHook.ts`      | التحكم بمودال الدعوات        |
| `useChatAssistantModal()` | (في hooks)              | التحكم بمودال المساعد        |

**مثال على بنية الـ Hook:**

```typescript
interface ModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const useModal = create<ModalStore>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));

export default useModal;
```

---

## الملفات ذات الصلة

### 📄 ملفات التحقق والصحة (Validation)

- `src/app/validations/purchaseValidations.ts` - التحقق من بيانات الشراء
- `src/app/validations/usedCarValidations.ts` - التحقق من بيانات السيارات

### 📄 ملفات الإجراءات (Actions)

- `src/app/components/modals/(register)/registerSubmit.ts` - إجراء التسجيل
- `src/app/actions/` - جميع الإجراءات الأخرى

### 📄 ملفات الخدمات (Services)

- `src/app/utils/submiteMethod.ts` - طريقة الإرسال العام
- `src/lib/` - مكتبات مختلفة

---

## قائمة التحقق السريعة

### ✅ عند إنشاء مودال جديد:

- [ ] هل أضفت العنوان إلى `ACTION_TITLES` في `Modal.tsx`؟
- [ ] هل أضفت الـ Hook الخاص إن لزم الأمر؟
- [ ] هل أضفت دعم RTL/LTR؟
- [ ] هل أضفت رسائل نجاح/خطأ واضحة؟
- [ ] هل اختبرت على الهاتف (Mobile)؟
- [ ] هل اختبرت الوضع الليلي (Dark Mode)؟
- [ ] هل أضفت تحقق من البيانات (Validation)؟
- [ ] هل أضفت رسالة تحميل أثناء الإرسال؟

### ✅ عند استخدام ContactModal:

- [ ] هل استخدمت `requestKind` للتمييز بين الشراء والإيجار؟
- [ ] هل تحققت من تسجيل دخول المستخدم؟
- [ ] هل أرسلت البيانات إلى `/api/purchase`؟
- [ ] هل أغلقت المودال بعد النجاح؟

### ✅ عند استخدام Add Modals:

- [ ] هل استخدمت المعالج (Wizard)؟
- [ ] هل تحققت من الصور؟
- [ ] هل تحققت من الموقع؟
- [ ] هل أضفت `loading` state؟

---

## جداول مرجعية سريعة

### جدول الملفات والمسارات

```
src/app/
├── components/
│   ├── modals/
│   │   ├── Modal.tsx ⭐ (الأساسي)
│   │   ├── SearchModal.tsx
│   │   ├── LoginModal.tsx
│   │   ├── ChatAssistantModal.tsx
│   │   │
│   │   ├── usedCar/
│   │   │   ├── AddUsedCarModal.tsx ⭐
│   │   │   ├── FormUsedCar.tsx
│   │   │   └── ...
│   │   │
│   │   ├── real-estate/
│   │   │   ├── AddRealEstateModal.tsx ⭐
│   │   │   ├── StepBasicInfo.tsx
│   │   │   └── ...
│   │   │
│   │   ├── otherItems/
│   │   │   ├── AddOther.tsx ⭐
│   │   │   └── OtherBasicInfo.tsx
│   │   │
│   │   ├── (register)/
│   │   │   ├── RegisterModal.tsx
│   │   │   └── registerSubmit.ts
│   │   │
│   │   ├── (activationModal)/
│   │   │   └── ActivationModal.tsx
│   │   │
│   │   ├── (paymentPassword)/
│   │   │   └── PaymentPasswordModal.tsx
│   │   │
│   │   └── ...
│   │
│   └── ...
│
├── items/
│   └── details/
│       └── [id]/
│           ├── ContactElement.tsx ⭐
│           ├── ContactModal.tsx ⭐
│           ├── PurchaseElement.tsx ⭐
│           └── ...
│
├── hooks/
│   ├── useLoginModal.ts
│   ├── useRegisterModal.ts
│   ├── useSearchModal.ts
│   ├── useUsedCarModal.ts
│   ├── useActivationModal.ts
│   └── ...
│
└── ...
```

---

## الاختصارات المستخدمة

| الاختصار | المعنى              |
| -------- | ------------------- |
| ⭐       | ملف مهم جداً        |
| 🔧       | مكون أساسي          |
| 🛒       | خاص بالشراء         |
| 📝       | نموذج               |
| 🎣       | Hooks               |
| 🔐       | أمان/تحقق           |
| 🔍       | بحث                 |
| 📱       | مستجيب (Responsive) |
| 🌙       | دعم الوضع الليلي    |
| 🔄       | دعم RTL/LTR         |

---

**آخر تحديث:** مايو 2026
**عدد الملفات المغطاة:** 20+ ملف
**عدد الـ Hooks:** 10+ hooks
