# 🗂️ دليل الملفات - المساعد الذكي

## ملفات جديدة (يجب فهمها)

### 1. 🎯 `src/app/hooks/useChatAssistant.ts` - الدماغ الرئيسي

**الدور:** يحتوي على جميع الأسئلة والمنطق

**أهم العناصر:**

```typescript
interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  timestamp: Date;
  options?: { label: string; value: string }[];
}

interface IFormData {
  // جميع الحقول المحتملة
  itemType?: string;
  brand?: string;
  // ... و أكثر
}

const QUESTIONS = {
  initial: { ... },  // اختيار النوع
  car: { ... },      // أسئلة السيارات
  real_estate: { ... }, // أسئلة العقارات
  item: { ... },     // أسئلة المنتجات
}
```

**الدوال:**

- `useChatAssistant()` - hook تعيد الأسئلة والدوال
- `getNextQuestion(formData, index)` - الحصول على السؤال التالي
- `getTotalQuestionsCount(itemType)` - عد الأسئلة

**الاستخدام:**

```typescript
const { QUESTIONS, getNextQuestion, getTotalQuestionsCount } =
  useChatAssistant();
```

**متى تعدله:**

- إضافة أسئلة جديدة
- تغيير أسئلة موجودة
- تعديل الشروط

---

### 2. 💬 `src/app/components/ChatInterface.tsx` - الواجهة

**الدور:** عرض المحادثة والرسائل

**الخصائص:**

```typescript
interface Props {
  messages: ChatMessage[];
  onOptionSelect: (value: string) => void;
  onTextSubmit: (text: string) => void;
  isLoading: boolean;
  currentQuestion?: any;
}
```

**الميزات:**

- رسائل محركة مع Framer Motion
- إدخال متكيف حسب نوع السؤال:
  - أزرار للخيارات
  - حقل نص عادي
  - حقل رقمي
  - منتقي ألوان
  - textarea للنصوص الطويلة

**الاستخدام:**

```typescript
<ChatInterface
  messages={messages}
  onOptionSelect={handleOptionSelect}
  onTextSubmit={handleTextSubmit}
  isLoading={isLoading}
  currentQuestion={currentQuestion}
/>
```

**متى تعدله:**

- تغيير تصميم الرسائل
- تغيير أنواع الإدخال
- تحسين الرسوميات

---

### 3. 🎚️ `src/app/components/modals/ChatAssistantModal.tsx` - المنسق الرئيسي

**الدور:** إدارة التدفق العام (محادثة → صور → إرسال)

**الحالات:**

1. **chat** - عرض المحادثة
2. **images** - رفع الصور

**الدوال الرئيسية:**

- `handleOptionSelect()` - معالجة اختيار خيار
- `handleTextSubmit()` - معالجة إدخال نص
- `handleImagesSubmit()` - معالجة رفع الصور والإرسال

**الاستخدام:**

```typescript
<ChatAssistantModal
  isOpen={isOpen}
  onClose={onClose}
  onSuccess={onSuccess}
/>
```

**متى تعدله:**

- تغيير الخطوات
- تعديل المنطق
- إضافة التحقق
- التغييرات الكبرى

---

### 4. 🔄 `src/app/hooks/useChatAssistantModal.ts` - إدارة الحالة

**الدور:** Zustand store لإدارة فتح/غلق المودال

**الحالة:**

```typescript
interface ChatAssistantModalStore {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}
```

**الاستخدام:**

```typescript
const { isOpen, onOpen, onClose } = useChatAssistantModal();
```

**متى تعدله:**

- إضافة حالات جديدة
- تغيير منطق الفتح/الإغلاق
- ندرة جداً

---

### 5. 🔌 `src/app/components/modals/ChatAssistantModalWrapper.tsx` - الدمج

**الدور:** ربط Zustand مع المكون

```typescript
const ChatAssistantModalWrapper = () => {
  const { isOpen, onClose } = useChatAssistantModal();
  return <ChatAssistantModal isOpen={isOpen} onClose={onClose} />;
};
```

**متى تعدله:**

- نادراً جداً

---

## ملفات معدلة (ملخص التعديلات)

### 📄 `src/app/layout.tsx`

```typescript
// أضيف:
import ChatAssistantModalWrapper from "./components/modals/ChatAssistantModalWrapper";

// في JSX:
<ChatAssistantModalWrapper />
```

### 🍔 `src/app/components/header/PublishMenue.tsx`

```typescript
// تعديل الاستيراد:
const chatAssistant = h.useChatAssistantModal();

// في الزر:
onClick={() => chatAssistant.onOpen()}
```

### 🎣 `src/app/hooks/index.ts`

```typescript
// أضيف:
import useChatAssistantModal from "./useChatAssistantModal";

const h = {
  // ... باقي الـ hooks
  useChatAssistantModal,
};
```

---

## 🔀 تدفق البيانات

```
المستخدم ينقر
    ↓
PublishMenue يفتح المساعد
    ↓
useChatAssistantModal.onOpen()
    ↓
ChatAssistantModalWrapper يظهر المودال
    ↓
ChatAssistantModal يبدأ
    ↓
useChatAssistant توفر الأسئلة
    ↓
ChatInterface تعرض المحادثة
    ↓
المستخدم يجيب
    ↓
البيانات تُحفظ في formData
    ↓
السؤال التالي يظهر
    ↓
...
    ↓
انتهاء الأسئلة
    ↓
صفحة الصور
    ↓
رفع الصور والبيانات
    ↓
نجاح أو فشل
```

---

## 🔍 أماكن البحث عند التعديل

### إذا أردت تغيير:

| التغيير           | الملف                    | السطر        |
| ----------------- | ------------------------ | ------------ |
| إضافة سؤال        | `useChatAssistant.ts`    | ~50-180      |
| تغيير النص        | `useChatAssistant.ts`    | anywhere     |
| تغيير الخيارات    | `useChatAssistant.ts`    | Q definition |
| تغيير شكل الرسالة | `ChatInterface.tsx`      | rendering    |
| تغيير شكل المودال | `ChatAssistantModal.tsx` | JSX          |
| تغيير API         | `ChatAssistantModal.tsx` | ~188-212     |
| إضافة حقل         | `IFormData`              | ~14-40       |

---

## 📚 الملفات المرجعية

| الملف                                   | الغرض       | الحجم     |
| --------------------------------------- | ----------- | --------- |
| `SMART_CHAT_ASSISTANT_DOCUMENTATION.md` | شرح شامل    | 1200 كلمة |
| `EXAMPLE_ADD_NEW_ITEM_TYPE.md`          | مثال عملي   | 500 كلمة  |
| `TESTING_CHECKLIST.md`                  | اختبار      | 800 كلمة  |
| `QUICK_TEST.md`                         | اختبار سريع | 300 كلمة  |
| `EXECUTIVE_SUMMARY.md`                  | ملخص إدارة  | 600 كلمة  |

---

## 🚀 البدء السريع

### لفهم النظام (15 دقيقة):

1. اقرأ هذا الملف
2. افتح `useChatAssistant.ts`
3. انظر للأسئلة
4. افهم الهيكل

### لإضافة سؤال (5 دقائق):

1. افتح `useChatAssistant.ts`
2. أضف في القاموس المناسب:

```typescript
newQuestion: {
  text: "السؤال؟",
  field: "fieldName",
  type: "text",
}
```

### لإضافة نوع عنصر (15 دقيقة):

1. اقرأ `EXAMPLE_ADD_NEW_ITEM_TYPE.md`
2. اتبع الخطوات
3. اختبر

---

## 🎓 كيفية تعلم النظام

### المبتدئ:

```
1. اقرأ هذا الملف
2. افتح المساعد في المتصفح
3. اختبره يدوياً
```

### المتوسط:

```
1. افتح الملفات الجديدة
2. افهم البنية
3. أضف سؤال جديد
```

### المتقدم:

```
1. فهم التدفق الكامل
2. أضف نوع عنصر جديد
3. حسّن الأداء
```

---

## ⚙️ الأدوات المستخدمة

| الأداة        | الاستخدام    |
| ------------- | ------------ |
| React 19      | الواجهات     |
| TypeScript    | نوع البيانات |
| Zustand       | إدارة الحالة |
| Framer Motion | الرسوميات    |
| Tailwind CSS  | التصميم      |
| Next.js 15    | الإطار       |

---

## 💾 قاعدة البيانات

**نقطة النهاية:** `/api/cars` أو `/api/realestate` أو `/api/items`

**البيانات المرسلة:**

```
FormData {
  brand: string
  model: string
  year: number
  color: string
  price: number
  description: string
  images: File[]
  // ... و أكثر
}
```

---

## 📞 الدعم

- ❓ **سؤال عن نوع سؤال؟** → `EXAMPLE_ADD_NEW_ITEM_TYPE.md`
- ❓ **كيف أختبر؟** → `TESTING_CHECKLIST.md`
- ❓ **ملخص سريع؟** → `README_SMART_CHAT_ASSISTANT.md`
- ❓ **لمحة عامة؟** → `EXECUTIVE_SUMMARY.md`

---

**الملف الأخير:** `FINAL_INVENTORY.md` للتفاصيل الكاملة ✅
