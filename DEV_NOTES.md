# Mashhoor Platform — Developer Notes

> **آخر تحديث**: مايو 2026 | مرجع سريع للصيانة والتطوير. يُغني عن إعادة قراءة كل الكود من الصفر.

---

## 1. Stack التقني

| الطبقة         | التقنية                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| Framework      | Next.js 15 (App Router) + React 19 RC                                             |
| Database       | PostgreSQL (Supabase) + Prisma 6                                                  |
| Auth           | NextAuth v4 — JWT strategy, roles: isAdmin, isOwner, isActive, isIdentityVerified |
| State          | Zustand v5 (`useSearchFilters`)                                                   |
| Styling        | Tailwind CSS v4                                                                   |
| Images         | Cloudinary CDN                                                                    |
| Realtime       | WebSocket (`ws` lib) + SSE (`/api/notifications/stream`)                          |
| Notifications  | Firebase FCM v12 (tokens stored in PostgreSQL)                                    |
| Cache (server) | `unstable_cache` من Next.js (TTL: 5 دقائق)                                        |
| Cache (client) | In-memory Map + sessionStorage (في `useItem.ts`)                                  |
| Payments       | ShamCash (Playwright automation + worker queue)                                   |
| Animations     | Framer Motion v12                                                                 |
| Maps           | Leaflet + react-leaflet                                                           |
| Language       | TypeScript 5.9 strict mode                                                        |

---

## 2. بنية المشروع

```
barrow/
├── prisma/
│   ├── schema.prisma          ← تعريف كل الجداول
│   ├── seed.ts                ← بيانات تجريبية
│   └── migrations/            ← ملفات migration
│
├── src/
│   ├── auth.config.ts         ← إعداد NextAuth (providers, callbacks)
│   ├── auth.ts                ← تصدير { auth, handlers, signIn, signOut }
│   ├── middleware.ts           ← حماية الـ routes (redirect بناءً على session)
│   │
│   ├── actions/               ← Server Actions (auth.actions.ts، item.actions.ts...)
│   │
│   ├── features/
│   │   └── items/
│   │       └── types.ts       ← DTOs: ItemSearchQueryDto, ItemSearchItemDto, ItemSearchResponseDto
│   │
│   ├── lib/
│   │   ├── prisma.ts          ← Prisma client singleton (يُضيف SSL + pgbouncer params تلقائياً)
│   │   ├── validators/
│   │   │   └── item-search.ts ← Zod schema لـ query params الـ API
│   │   ├── seo.ts             ← buildMetadata(), SITE_NAME, SITE_URL
│   │   ├── primaryCategories.ts ← تعريف التبويبات الرئيسية (REAL_ESTATE, NEW_CAR...)
│   │   └── featuredAds.ts     ← getFeaturedCutoffDate()
│   │
│   ├── server/
│   │   ├── repositories/
│   │   │   └── item-search.repository.ts  ← DB queries للـ ListingSearchIndex
│   │   └── services/
│   │       └── item-search.service.ts     ← Logic البحث + unstable_cache
│   │
│   ├── types/                 ← أنواع TypeScript مشتركة
│   │
│   └── app/                   ← Next.js App Router
│       ├── page.tsx           ← الصفحة الرئيسية (Server Component، ISR 5 دقائق)
│       ├── HomePageClient.tsx ← منطق الصفحة الرئيسية (Client Component)
│       ├── layout.tsx         ← Layout المشترك + Providers
│       │
│       ├── hooks/
│       │   ├── useItem.ts            ← جلب وتخزين العناصر (in-memory + sessionStorage)
│       │   ├── useSearchFilters.ts   ← Zustand store للفلاتر
│       │   ├── useSearchHelper.ts    ← تعديل الفلاتر من الـ UI
│       │   └── useStaleResource.ts   ← SWR-like hook للـ featured items
│       │
│       ├── components/
│       │   ├── home/
│       │   │   ├── HomeBody.tsx       ← يعرض FeaturedSection + CardList + Map toggle
│       │   │   ├── CardList.tsx       ← Grid من Card components
│       │   │   ├── getItems.ts        ← fetchItems() + formatRawItems() + FormattedItem type
│       │   │   ├── Pagination.tsx     ← pagination component (dynamic import)
│       │   │   └── MobileCategoryPicker.tsx ← Overlay اختيار الفئة على الموبايل
│       │   ├── card/
│       │   │   ├── Card.tsx           ← بطاقة الإعلان الواحد
│       │   │   └── ImageCard.tsx      ← صورة البطاقة (next/image، quality=60)
│       │   ├── header/
│       │   │   └── Navbar.tsx         ← شريط البحث + الفلاتر
│       │   ├── category/
│       │   │   └── CategorySlider.tsx ← شريط الفئات الأفقي
│       │   ├── providers/
│       │   │   └── AppPreferencesProvider.tsx ← isArabic، locale
│       │   └── modals/                ← جميع الـ modals (إضافة إعلان، تسجيل، دخول...)
│       │
│       └── api/
│           ├── items/
│           │   └── route.ts           ← GET /api/items?page=&limit=&type=&catName=...
│           ├── notifications/
│           │   └── stream/route.ts    ← SSE stream
│           ├── chat/                  ← Chat API
│           ├── pay/                   ← ShamCash payment routes
│           └── lib/
│               └── errors/
│                   └── dbGuard.ts     ← withTimeout() + RequestTimeoutError
│
├── scripts/
│   ├── rental-reminder-worker.ts     ← Worker تذكيرات الإيجار
│   ├── shamcash-incoming-worker.ts   ← Worker استقبال مدفوعات ShamCash
│   └── shamcash-payout-worker.ts     ← Worker صرف المدفوعات
│
└── server.ts                         ← WebSocket server (يعمل بجانب Next.js)
```

---

## 3. تدفق البحث الرئيسي (Critical Path)

```
Browser → GET /api/items?...
  → src/app/api/items/route.ts
    → parseItemSearchQuery() [Zod validator]
    → withTimeout(searchItems(query), 8000ms)
      → src/server/services/item-search.service.ts :: searchItems()
        → [non-geo] getCachedNonGeoSearch() [unstable_cache TTL=300s]
          → searchItemsUncached()
            → findCategoryIdByName() [unstable_cache TTL=300s]
            → buildIndexWhere()
            → findAndCountByIndex() ← $transaction([count, findMany]) — 1 connection
            → attachMetadataBatch() ← $transaction([images, reviews, pins, newCars, oldCars]) — 1 connection
            → sortFeaturedFirst()
        → [geo] searchItemsUncached() directly (no cache)
          → findByIndex() [جلب الكل]
          → attachMetadataBatch()
          → sortByNearest() [haversine in-memory]
```

### نتيجة: 2 connections فقط لكل طلب (بدلاً من 7)

---

## 4. الصفحة الرئيسية — منطق التحميل

```
page.tsx (Server Component, revalidate=300)
  → await searchItems() [cold: ~1-3s, warm: <50ms من unstable_cache]
  → passes initialItems[] to HomePageClient

HomePageClient.tsx (Client Component)
  → الحالة الأولى: يعرض initialItems فوراً (بدون skeleton)
  → بعد hydration: اختار initial tab → يستدعي /api/items عبر useItem.ts
  → useItem.ts: in-memory cache → sessionStorage → fetch API
```

**تحذير**: `HomePageClient` لا يُفعّل fetch (`shouldFetchItems = false`) حتى يختار المستخدم فئة أو يدخل فلتر. العرض الأولي يعتمد على `initialFormattedItems` من server.

---

## 5. نقاط حرجة — اعرفها قبل التعديل

### أ) Supabase Connection Pool

- ملف: `src/lib/prisma.ts`
- **على Vercel فقط**: يُضيف `pgbouncer=true&connection_limit=1&pool_timeout=20`
- **محلياً**: لا connection_limit → Prisma يستخدم `num_cpus*2+1` connections
- **للـ read-only queries**: استخدم `Promise.all` دائماً — تعمل بالتوازي وأسرع بـ 3-5× من `$transaction` التسلسلي
- **`$transaction`**: للكتابة فقط أو حين تحتاج atomicity، ليس للقراءة

### ب) Timeout Cascade

```
API withTimeout: 8000ms    (dbGuard.ts)
Client fetch abort: 6500ms  (getItems.ts)
SSR page.tsx: بلا timeout   (try/catch يكفي)
```

**⚠️ تحذير حرج**: لا تستدعِ `searchItems()` من `page.tsx` — استخدم `searchItemsUncached()` بدلاً عنه.

السبب: `searchItems()` يستدعي `unstable_cache` الذي يستخدم `AbortSignal.timeout()` داخلياً في Next.js Data Cache layer.
عندما تكون الـ DB بطيئة، يُلقي هذا `TimeoutError` (code: 23) غير معالج حتى مع `try/catch`.
`searchItemsUncached()` يذهب مباشرة إلى Prisma بدون cache layer → آمن في RSC.

### ج) unstable_cache تداخل

- `getCachedNonGeoSearch` في `item-search.service.ts` ← cache key: "item-search-results-v4"
- `getCachedCategoryIdByName` في `item-search.repository.ts` ← cache key: "item-search-category-id"
- إعادة التحقق بـ `revalidateTag("item-search")` أو `revalidateTag("categories")`

### د) ISR الصفحة الرئيسية

- `export const revalidate = 300` في `page.tsx`
- يعني: الصفحة تُعاد بناؤها في الخلفية كل 5 دقائق
- المستخدم يرى النسخة القديمة حتى تنتهي إعادة البناء (stale-while-revalidate)

---

## 6. نماذج البيانات الأساسية (Prisma)

| Model                                           | الدور                                     |
| ----------------------------------------------- | ----------------------------------------- |
| `ListingSearchIndex`                            | جدول مُوحّد للبحث (يحل محل 6 جداول سابقة) |
| `ItemImage`                                     | صور الإعلانات (Cloudinary URLs)           |
| `PinnedItem`                                    | الإعلانات المميزة (featured)              |
| `Review`                                        | التقييمات                                 |
| `NewCar`, `OldCar`                              | بيانات السيارات (model, year)             |
| `ChatConversation`, `ChatMessage`, `ChatUnread` | نظام الدردشة                              |
| `UserFcmToken`                                  | FCM tokens للإشعارات                      |
| `ShamCashActivationRequest`, `Payment`          | نظام المدفوعات                            |
| `SupportTicket`                                 | تذاكر الدعم                               |

---

## 7. إعدادات مهمة (.env)

| المتغير                  | الاستخدام                 |
| ------------------------ | ------------------------- |
| `DATABASE_URL`           | Prisma direct connection  |
| `NEXTAUTH_SECRET`        | JWT secret                |
| `NEXTAUTH_URL`           | Base URL للموقع           |
| `CLOUDINARY_*`           | إعدادات Cloudinary        |
| `NEXT_PUBLIC_FIREBASE_*` | إعدادات Firebase (client) |
| `FIREBASE_ADMIN_*`       | Firebase Admin (server)   |
| `SHAMCASH_*`             | بوابة الدفع ShamCash      |

---

## 8. تغييرات الأداء المطبقة (مايو 2026)

### المشكلة الأصلية: الصفحة الرئيسية بطيئة جداً (3-5 ثوانٍ skeleton)

| الملف                                               | التغيير                                                                 | السبب                                |
| --------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------ |
| `src/app/page.tsx`                                  | أضفنا `export const revalidate = 300` + `async` + `await searchItems()` | ISR + initial data بدون skeleton     |
| `src/app/HomePageClient.tsx`                        | أضفنا `initialItems` prop + `initialFormattedItems`                     | عرض المحتوى فوراً                    |
| `src/app/api/items/route.ts`                        | timeout: ~~12000~~ → 8000ms                                             | ردود فعل أسرع                        |
| `src/app/components/home/getItems.ts`               | `MAX_ITEMS_LIMIT`: ~~50~~ → 20, client timeout: ~~8000~~ → 6500ms       | تقليل payload                        |
| `src/app/HomePageClient.tsx`                        | `limit`: ~~24~~ → 20                                                    | تقليل payload                        |
| `src/app/components/home/CardList.tsx`              | priority images: ~~index===0~~ → `index < 4`                            | LCP أسرع                             |
| `src/server/repositories/item-search.repository.ts` | `Promise.all` للـ read-only queries المتوازية                           | أسرع 3-5× من `$transaction` التسلسلي |

### المشكلة الثانية: `TimeoutError: The operation was aborted` (code: 23)

**السبب الجذري**:
ـ `searchItems()` يستدعي `getCachedNonGeoSearch()` المغلّف بـ `unstable_cache`  
ـ Next.js 15 Data Cache يستخدم `AbortSignal.timeout()` داخلياً في cache layer  
ـ عند إبطاء قاعدة البيانات، يُطلق Next.js `TimeoutError` (DOMException code:23) كـ unhandled error حتى داخل `try/catch`  
ـ محاولة `$transaction` التسلسلي زادت الأمر سوءاً لأن `sum(queries) >> max(queries)`

**الإصلاح النهائي** (مطبق):  
ـ `page.tsx` يستدعي `searchItemsUncached()` مباشرةً (تجاوز unstable_cache بالكامل)  
ـ `Promise.all` للـ read-only queries (عودة للتوازي السريع)  
ـ `searchItems()` يبقى للـ API routes فقط (لها cache مناسب للـ HTTP layer)

---

## 9. أوامر مفيدة

```bash
npm run dev          # تشغيل الـ dev server
npm run build        # بناء للإنتاج
npm run lint         # فحص الكود
npx prisma studio    # فتح Prisma Studio (عرض DB)
npx prisma db push   # مزامنة schema مع DB بدون migration
npx prisma migrate dev --name <name>  # إنشاء migration جديد
```

---

## 10. نقاط التوسعة المستقبلية

- **Redis**: مثبّت كـ dependency لكن غير مستخدم — يمكن استخدامه لـ rate limiting أو distributed cache بديلاً عن `unstable_cache`
- **`/api/items/featured`**: لا يوجد! `HomePageClient` يُحاول استدعاءه عبر `useStaleResource`، لكنه يفشل صامتاً ويعيد `[]`. يمكن إنشاء هذا الـ endpoint أو إلغاء الـ call
- **`prisma.$transaction` interactive**: إذا احتجت transactions أعقد، استخدم `prisma.$transaction(async (tx) => {...})`
