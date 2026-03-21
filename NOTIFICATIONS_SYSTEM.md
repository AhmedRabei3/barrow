# نظام الإشعارات في الوقت الفعلي - Realtime Notifications System

## 🎯 النظام الحالي

تم تطبيق نظام إشعارات حديث وفعّال يستخدم **Server-Sent Events (SSE)** بدلاً من WebSocket أو Polling البسيط.

### لماذا SSE وليس WebSocket؟

| الميزة              | WebSocket | SSE          | Polling           |
| ------------------- | --------- | ------------ | ----------------- |
| **الوقت الفعلي**    | ✅ فوري   | ✅ فوري      | ❌ تأخير 10+ ثوان |
| **سهولة التطبيق**   | ❌ معقد   | ✅ بسيط جداً | ✅ بسيط           |
| **استهلاك الموارد** | ⚠️ عالي   | ✅ منخفض     | ❌ عالي           |
| **دعم HTTPS**       | ✅ نعم    | ✅ نعم       | ✅ نعم            |
| **التوافقية**       | ✅ جيد    | ✅ جيد       | ✅ عام            |

**النتيجة: SSE هو الخيار الأمثل = فوري + بسيط + منخفض الموارد**

---

## 📁 الملفات الجديدة المضافة

### 1. **`src/lib/socketClient.ts`**

- عميل WebSocket (للاستخدام المستقبلي)
- يحتوي على دوال إعادة اتصال تلقائية
- معالجة الأخطاء المتقدمة

### 2. **`src/app/hooks/useSocketNotifications.ts`**

- Hook للاستماع على SSE
- إدارة دورة حياة الاتصال
- إعادة اتصال تلقائي (exponential backoff)

### 3. **`src/app/api/notifications/stream/route.ts`** ([NEW])

- SSE server endpoint
- يرسل الإشعارات الحالية أولاً
- يستمع للإشعارات الجديدة كل 5 ثوانٍ
- heartbeat كل 30 ثانية للحفاظ على الاتصال

---

## 🔄 آلية العمل

### خطوة 1️⃣: الاتصال الأولي

```
المستخدم يفتح Notification Bell
    ↓
يتم استدعاء useNotifications(open=true)
    ↓
يتم جلب الإشعارات الحالية من `/api/notifications`
    ↓
يتم فتح اتصال SSE مع `/api/notifications/stream`
```

### خطوة 2️⃣: استقبال الإشعارات الفورية

```
DB: إشعار جديد يُضاف
    ↓
SSE Stream: يكتشفها كل 5 ثوانٍ
    ↓
Browser: يستقبل الإشعار فوراً
    ↓
UI: عداد الإشعارات يتحدث مباشرة
```

### خطوة 3️⃣: الحفاظ على الاتصال

```
كل 30 ثانية: heartbeat
كل 5 ثوانٍ: فحص إشعارات جديدة
عند الفصل: إعادة اتصال تلقائية (max 5 محاولات)
```

---

## 🚀 كيفية استخدام النظام

### في Frontend (NotificationBell.tsx)

```tsx
const {
  notifications, // قائمة الإشعارات
  unreadCount, // عدد غير المقروءة (يتحدث فوراً!)
  loading, // حالة التحميل
  markAsRead, // وضع علامة مقروء
  loadMore, // تحميل المزيد
} = useNotifications(open);
```

### في Backend (لإرسال إشعار)

```typescript
// في أي API route أو server action
await prisma.notification.create({
  data: {
    userId: "user-id",
    title: "عنوان الإشعار",
    message: "الرسالة",
    type: "purchase" | "rating" | "message",
  },
});

// SSE stream سيكتشفه تلقائياً وسيرسله
```

---

## ⚙️ التحسينات المستقبلية

### إذا أردت Full WebSocket في المستقبل:

```bash
npm install socket.io socket.io-client
```

ثم استخدم `src/lib/socketServer.ts` (موجود بالفعل)

---

## 📊 مقارنة الأداء

| الحالة            | الوقت     | التفاصيل             |
| ----------------- | --------- | -------------------- |
| **Polling (10s)** | ~10 ثوانٍ | تأخير كبير           |
| **SSE (الآن)**    | ~5 ثوانٍ  | فوري جداً            |
| **WebSocket**     | ~200ms    | فوري جداً (لكن معقد) |

---

## ✅ الحالة الحالية

- ✅ SSE endpoint يعمل
- ✅ Hook يستمع للإشعارات
- ✅ Auto-reconnect مع exponential backoff
- ✅ Heartbeat للحفاظ على الاتصال
- ✅ عدم التكرار (deduplication)
- ✅ دعم كامل للعربية

---

## 🐛 التصحيح في حالة المشاكل

إذا توقف الاتصال:

1. افتح Developer Tools (F12)
2. اذهب إلى Network tab
3. ابحث عن `stream`
4. يجب أن تكون Status 200 و Content-Type: text/event-stream

---

## 📝 الملاحظات

- السيرفر يفحص الإشعارات الجديدة كل **5 ثوانٍ** (قابل للتعديل)
- يتم إرسال heartbeat كل **30 ثانية** (لمنع timeout)
- عدد محاولات إعادة الاتصال: **5 محاولات بحد أقصى**
- الفاصل الزمني للإعادة يتضاعف (exponential backoff)
