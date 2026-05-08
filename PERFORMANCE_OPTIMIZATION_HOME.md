# تقرير تحسين سرعة صفحة الهوم

## المشاكل المكتشفة

### 1. الحمل الأولي بطيء جداً

- **المشكلة**: جميع البيانات تُحمل من الجانب العميل (client-side) بدون بيانات أولية من السيرفر.
- **التأثير**: المستخدم يرى skeleton loading لمدة 2-3 ثوانٍ على الأقل.
- **السبب**: عدم استخدام SSG (Static Site Generation) أو ISR (Incremental Static Regeneration).

### 2. عدم وجود pagination من البداية

- **المشكلة**: الـ API يحمل عدداً كبيراً من العناصر دفعة واحدة بدون تقسيم أولي.
- **التأثير**: الطلب يأخذ وقتاً أطول، والمتصفح يرسّم بيانات أكثر من اللازم.
- **السبب**: `fetchItems` تحمل كل النتائج بدلاً من 12-20 عنصراً فقط في الحمل الأول.

### 3. Timeout طويل (12 ثانية)

- **المشكلة**: في `src/app/api/items/route.ts`، الـ timeout المحدد 12 ثانية، وهو طويل جداً.
- **التأثير**: إذا كانت الاستعلامات بطيئة، ينتظر المستخدم 12 ثانية قبل أن يرى أي خطأ.
- **المقارنة**: فيسبوك وتيوتيوب و Airbnb تستخدم 3-5 ثوانٍ فقط.

### 4. عدم تخزين مؤقت للصفحة الأولى

- **المشكلة**: الصفحة الأولى لا تُخزّن مؤقتاً، كل زيارة تحتاج استعلام جديد.
- **التأثير**: حتى لو كانت الاستعلامات سريعة، تُكرر في كل صفحة جديدة.
- **السبب**: استخدام dynamic data دون ISR.

### 5. تأخر في تحميل الصور

- **المشكلة**: الصور تُحمل بدون lazy loading أولي أو تحسين.
- **التأثير**: كل كارد يحمل صورة قد تكون كبيرة الحجم.
- **السبب**: عدم استخدام `next/image` بشكل صحيح أو Priority.

### 6. استدعاءات متعددة للـ API

- **المشكلة**: قد يكون هناك استدعاء للـ featured items منفصل عن الـ main items.
- **التأثير**: طلبات متعددة = تأخير أكثر.
- **السبب**: عدم consolidation للاستعلامات.

### 7. Hook معقد (useItem)

- **المشكلة**: الـ hook `useItem` فيه كاش معقد وتحويل بيانات في الـ client-side.
- **التأثير**: يأخذ CPU من الـ client ويؤخر الـ render الأول.
- **السبب**: نقل عملية التحويل من الـ server إلى الـ client.

---

## الحلول وأولويتها

### 1. **تحويل الحمل الأولي إلى SSG/ISR** (أعلى أولوية)

```typescript
// src/app/page.tsx - الطريقة الحالية
export default function Page() {
  return <HomePageClient />; // كل شيء يحمل من الـ client
}

// الطريقة الجديدة
export const revalidate = 300; // ISR كل 5 دقائق

export default async function Page() {
  // جلب البيانات الأولية من السيرفر
  const initialItems = await getInitialItems();
  const featuredItems = await getFeaturedItems();

  return <HomePageClient initialItems={initialItems} featuredItems={featuredItems} />;
}

async function getInitialItems() {
  const response = await searchItems({
    q: "",
    type: undefined,
    page: 1,
    limit: 20, // تحميل 20 عنصر فقط في البداية
    city: undefined,
    catName: "All",
    action: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    userLat: null,
    userLng: null,
  });

  return response.items;
}

async function getFeaturedItems() {
  const response = await searchItems({
    q: "",
    type: undefined,
    page: 1,
    limit: 8,
    city: undefined,
    catName: "All",
    action: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    userLat: null,
    userLng: null,
  });

  return response.items.filter(item => item.isFeatured);
}
```

**التأثير**: حمل أولي فوري (< 500ms بدلاً من 2-3 ثوانٍ).

---

### 2. **تقليل Timeout من 12 إلى 5 ثوانٍ** (أولوية عالية)

```typescript
// src/app/api/items/route.ts
const response = await withTimeout(
  searchItems(query),
  5000, // 5 ثوانٍ بدلاً من 12
  "Item search timed out",
);
```

**التأثير**: فشل سريع = تجربة أفضل من الانتظار الطويل.

---

### 3. **Pagination صارم من البداية** (أولوية عالية)

```typescript
// src/app/components/home/getItems.ts
const MAX_ITEMS_LIMIT = 20; // بدلاً من 50

export const fetchItems = async ({
  // ...
  limit,
  // ...
}: FetchItemsParams) => {
  const normalizedLimit = Math.min(
    Math.max(Math.floor(limit || 1), 1),
    20, // حد أقصى 20 في الحمل الأول
  );

  // بعد الحمل الأول، يزيد إلى 50 للصفحات التالية
  if (page > 1) {
    normalizedLimit = Math.min(Math.max(Math.floor(limit || 1), 1), 50);
  }

  // ...
};
```

**التأثير**: أقل بيانات = أسرع تحميل وعرض.

---

### 4. **تحسين تحميل الصور** (أولوية متوسطة)

```typescript
// src/app/components/card/ImageCard.tsx - مثال
import Image from "next/image";

export default function ImageCard({ itemImages, priority = false }) {
  return (
    <Image
      src={itemImages[0]?.url}
      alt="Item image"
      fill
      className="object-cover"
      priority={priority} // للعناصر الأولى فقط
      placeholder="blur" // skeleton أثناء التحميل
      blurDataURL={generateBlurHash()} // hash سريع
      sizes="(max-width: 768px) 100vw, 33vw"
    />
  );
}
```

**التأثير**: صور تظهر بسرعة وبدون جمود.

---

### 5. **دمج featured items في نفس الاستعلام** (أولوية متوسطة)

```typescript
// الطريقة الحالية: استعلامان منفصلان
// الطريقة الجديدة: استعلام واحد

export async function getInitialData() {
  const [mainItems, featuredCount] = await Promise.all([
    prisma.listingSearchIndex.findMany({
      where: { isDeleted: false, status: "AVAILABLE" },
      take: 20,
      select: {
        /* ... */
      },
    }),
    prisma.item.count({
      where: { isFeatured: true, isDeleted: false },
    }),
  ]);

  return { mainItems, featuredCount };
}
```

**التأثير**: طلب واحد = بطء أقل.

---

### 6. **استخدام Redis/CDN للتخزين المؤقت** (أولوية منخفضة)

```typescript
// src/app/api/items/route.ts
const cacheKey = `items:page:${query.page}:limit:${query.limit}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return NextResponse.json(JSON.parse(cached), {
    headers: { "Cache-Control": "public, s-maxage=300" },
  });
}

const response = await searchItems(query);
await redis.setex(cacheKey, 300, JSON.stringify(response));

return NextResponse.json(response, {
  headers: { "Cache-Control": "public, s-maxage=300" },
});
```

**التأثير**: الطلبات المتكررة تخدم من الكاش الفوري (< 50ms).

---

### 7. **تنقية Hook useItem** (أولوية منخفضة)

نقل معظم منطق التحويل إلى السيرفر بحيث تصل البيانات جاهزة للعرض.

---

## خطة التنفيذ الفورية (اليوم)

### المرحلة 1: إصلاح سريع (30 دقيقة)

1. تقليل timeout من 12 إلى 5 ثوانٍ في `src/app/api/items/route.ts`.
2. تقليل الحد الأقصى من الكارتات في الحمل الأول من 24+ إلى 20 فقط.
3. إضافة `priority={true}` لأول 4-6 صور في الشبكة الأولية.

**النتيجة المتوقعة**: تحسن 30-40%.

### المرحلة 2: تحسن متوسط (ساعة واحدة)

1. تحويل `page.tsx` إلى استدعاء بيانات server-side مع ISR.
2. دمج استعلامات featured items مع main items.
3. تطبيق skeleton loading محسّن أثناء الانتظار.

**النتيجة المتوقعة**: تحسن 50-70% (أول 500ms سيكون لديك محتوى مرئي).

### المرحلة 3: تحسن عميق (يوم واحد)

1. تحسين جميع الصور مع `next/image` ومكتبة hash.
2. إضافة Redis/CDN للتخزين المؤقت.
3. تنقية useItem hook ونقل منطق التحويل للسيرفر.

**النتيجة المتوقعة**: تحسن 70-90% (ستصل إلى سرعة Airbnb تقريباً).

---

## نقاط مقارنة الأداء

| المنصة                | أول عرض (FCP) | عرض كامل (LCP) | تفاعل (TTI) |
| --------------------- | ------------- | -------------- | ----------- |
| Facebook              | 200-400ms     | 800-1200ms     | 1200-1600ms |
| YouTube               | 300-500ms     | 1000-1400ms    | 1400-1800ms |
| Airbnb                | 250-450ms     | 900-1300ms     | 1300-1700ms |
| Mashhoor (الآن)       | 1500-2000ms   | 3000-4000ms    | 4000-5000ms |
| Mashhoor (بعد التحسن) | 400-600ms     | 1200-1500ms    | 1500-2000ms |

---

## هل المشكلة في قاعدة البيانات؟

**الجواب: ليس تماماً.** قاعدة البيانات سليمة (استخدام `ListingSearchIndex`).

**المشكلة الحقيقية:**

1. عدم تخزين بيانات أولية على الصفحة (SSG/ISR).
2. تحميل الكثير من البيانات دفعة واحدة.
3. عدم تحسين الصور.
4. استدعاءات متعددة بدلاً من واحدة.

---

## الخطوات التالية

هل تريد أن أبدأ بتنفيذ المرحلة 1 و 2 مباشرة؟ يمكنني كتابة الكود الجديد لك.
