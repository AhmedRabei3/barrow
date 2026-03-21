# مثال: إضافة نوع عنصر جديد - دراجات ناريّة 🏍️

هذا المثال يوضح كيفية إضافة نوع عنصر جديد إلى المساعد الذكي.

## الخطوات:

### 1. تحديث الواجهة IFormData

في `src/app/hooks/useChatAssistant.ts`:

```typescript
export interface IFormData {
  itemType?: string;

  // Car fields
  brand?: string;
  model?: string;
  // ... باقي الحقول ...

  // دراجات ناريّة الجديدة
  bikeType?: "SPORT" | "CRUISER" | "TOURING" | "DIRT";
  engineCapacity?: number; // cc
  condition?: "NEW" | "USED";
  mileage?: number;
  engineType?: "2-STROKE" | "4-STROKE";
}
```

### 2. إضافة الأسئلة

في `QUESTIONS` object:

```typescript
const QUESTIONS = {
  // ... الأسئلة السابقة ...

  bike: {
    bikeType: {
      text: "🏍️ ما نوع الدراجة؟",
      options: [
        { label: "🏁 رياضية", value: "SPORT" },
        { label: "🪑 كروزر", value: "CRUISER" },
        { label: "🛣️ سياحية", value: "TOURING" },
        { label: "🏜️ طرق وعرة", value: "DIRT" },
      ],
      field: "bikeType",
    },

    brand: {
      text: "ما هي الماركة؟",
      field: "brand",
      type: "text",
    },

    model: {
      text: "ما هو الموديل؟",
      field: "model",
      type: "text",
    },

    condition: {
      text: "هل الدراجة جديدة أم مستعملة؟",
      options: [
        { label: "✨ جديدة", value: "NEW" },
        { label: "🔧 مستعملة", value: "USED" },
      ],
      field: "condition",
    },

    // أسئلة شرطية - تظهر فقط للمستعملة
    mileage: {
      text: "كم عدد الكيلومترات؟",
      field: "mileage",
      type: "number",
      condition: (formData: IFormData) => formData.condition === "USED",
    },

    engineCapacity: {
      text: "سعة المحرك (cc)؟",
      field: "engineCapacity",
      type: "number",
    },

    engineType: {
      text: "نوع المحرك؟",
      options: [
        { label: "⚒️ 2-سكتة", value: "2-STROKE" },
        { label: "🔧 4-سكتة", value: "4-STROKE" },
      ],
      field: "engineType",
    },

    color: {
      text: "ما لون الدراجة؟",
      field: "color",
      type: "color",
    },

    price: {
      text: "كم السعر؟",
      field: "price",
      type: "number",
    },

    description: {
      text: "وصف إضافي؟",
      field: "description",
      type: "textarea",
      optional: true,
    },
  },
};
```

### 3. تحديث القائمة الأولى

في الأسئلة الأولى:

```typescript
const QUESTIONS = {
  initial: {
    text: "مرحباً! 👋 ما نوع العنصر الذي تريد إضافته؟",
    options: [
      { label: "🚗 سيارة", value: "car" },
      { label: "🏠 عقار", value: "real_estate" },
      { label: "🏍️ دراجة ناريّة", value: "bike" }, // ✨ الجديد
      { label: "📦 منتج عام", value: "item" },
    ],
    field: "itemType",
  },
};
```

### 4. تحديث ChatAssistantModal

تحديث بيانات الإرسال:

```typescript
const response = await fetch(endpoint, {
  method: "POST",
  body: formDataObj,
});

// إضافة حالة جديدة:
const endpoint =
  formData.itemType === "car"
    ? "/api/cars"
    : formData.itemType === "bike"
      ? "/api/bikes" // ✨ الجديد
      : formData.itemType === "real_estate"
        ? "/api/realestate"
        : "/api/items";
```

### 5. إنشاء API endpoint (اختياري)

إذا كنت تريد endpoint منفصل في `src/app/api/bikes/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    const formData = await req.formData();

    const bikeData = {
      bikeType: formData.get("bikeType"),
      brand: formData.get("brand"),
      model: formData.get("model"),
      condition: formData.get("condition"),
      mileage: parseInt(formData.get("mileage") as string) || 0,
      engineCapacity: parseInt(formData.get("engineCapacity") as string),
      engineType: formData.get("engineType"),
      color: formData.get("color"),
      price: parseFloat(formData.get("price") as string),
      description: formData.get("description"),
      images: formData.getAll("images"),
    };

    // حفظ في قاعدة البيانات
    // const bike = await db.bike.create({ data: bikeData });

    return NextResponse.json(
      { message: "تم إضافة الدراجة بنجاح" },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: "خطأ في إضافة الدراجة" },
      { status: 500 },
    );
  }
}
```

---

## 🎯 النقاط المهمة:

✅ **ترتيب الأسئلة**: يتم الترتيب حسب ترتيب المفاتيح في الكائن  
✅ **الأسئلة الشرطية**: استخدم `condition` للأسئلة المشروطة  
✅ **أنواع الإدخال**: اختر النوع المناسب (text, number, color, textarea, options)  
✅ **الرموز التعبيرية**: اجعل النصوص أكثر حيوية  
✅ **التوثيق**: وثّق الحقول الجديدة في الواجهات

---

## 🧪 اختبار:

```bash
npm run dev
# ثم انقر على 🤖 مساعد ذكي
# اختر "🏍️ دراجة ناريّة"
# مرّر الأسئلة
```

---

## 💡 نصائح إضافية:

- استخدم الأسئلة الشرطية لتقليل الارتباك
- اجعل ترتيب الأسئلة منطقياً (شيء عام ثم تفاصيل)
- استخدم الرموز التعبيرية بحكمة لا تكثرها
- اختبر الأسئلة الشرطية جيداً

---

## 📝 مثال على النتيجة:

```
🤖: مرحباً! 👋 ما نوع العنصر الذي تريد إضافته؟
👤: 🏍️ دراجة ناريّة

🤖: 🏍️ ما نوع الدراجة؟
👤: 🏁 رياضية

🤖: ما هي الماركة؟
👤: Yamaha

🤖: ما هو الموديل؟
👤: YZF-R1

🤖: هل الدراجة جديدة أم مستعملة؟
👤: ✨ جديدة

🤖: سعة المحرك (cc)؟
👤: 1000

🤖: نوع المحرك؟
👤: 🔧 4-سكتة

🤖: ما لون الدراجة؟
👤: [أحمر]

🤖: كم السعر؟
👤: 15000

🤖: وصف إضافي؟
👤: حالة ممتازة

🤖: 🖼️ أضف صوراً للدراجة
👤: [اختيار 3 صور]

✅ تم إضافة الدراجة بنجاح!
```
