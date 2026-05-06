# عملي: أمثلة محددة لـ Modal في طلبات الشراء والإيجار

# Practical Examples: Modal for Purchase & Rental Requests

---

## السيناريو 1️⃣: طلب شراء عنصر من صفحة التفاصيل

### المسار الكامل: `src/app/items/details/[id]/`

#### 1. ملف الصفحة الرئيسية (ItemDetails.tsx - مثال مبسط)

```tsx
"use client";

import { useState } from "react";
import ContactElement from "./ContactElement";
import PurchaseElement from "./PurchaseElemet";

interface ItemDetailsProps {
  id: string;
  data: {
    id: string;
    title: string;
    price: number;
    currency: string;
    status: string;
    ownerId: string;
    sellOrRent: "SELL" | "RENT";
  };
}

export default function ItemDetailsPage({ id, data }: ItemDetailsProps) {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* العنوان والوصف */}
      <div>
        <h1 className="text-3xl font-bold">{data.title}</h1>
        <p className="text-gray-600">
          {data.price} {data.currency}
        </p>
      </div>

      {/* الصور */}
      <div className="bg-gray-200 h-96 rounded-lg">{/* Gallery here */}</div>

      {/* الأقسام الجانبية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* المحتوى الرئيسي */}
        <div className="lg:col-span-2">
          <div className="space-y-4">{/* تفاصيل العنصر */}</div>
        </div>

        {/* الشريط الجانبي - مكان المودالات */}
        <aside className="space-y-4">
          {/* ❌ لا تستخدم PurchaseElement و ContactElement معاً */}
          {/* ✅ استخدم ContactElement فقط - يدعم الشراء والإيجار */}

          <ContactElement
            itemType={data.itemType}
            data={{
              id: data.id,
              title: data.title,
              price: data.price,
              currency: data.currency,
              status: data.status,
              ownerId: data.ownerId,
              sellOrRent: data.sellOrRent,
            }}
          />
        </aside>
      </div>
    </div>
  );
}
```

---

#### 2. مكون ContactElement - الاستخدام الكامل

```tsx
// filepath: src/app/items/details/[id]/ContactElement.tsx

"use client";

import { memo, useState } from "react";
import { Availability, ItemType } from "@prisma/client";
import toast from "react-hot-toast";
import ContactModal from "./ContactModal";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";
import { useSession } from "next-auth/react";
import useLoginModal from "@/app/hooks/useLoginModal";

interface ContactOwnerElementProps {
  itemType: ItemType;
  data: {
    id: string;
    ownerId?: string | null;
    price: number;
    currency?: string;
    status?: Availability;
    title?: string;
    sellOrRent?: string;
  };
}

const ContactOwnerElement = ({ data, itemType }: ContactOwnerElementProps) => {
  const { isArabic } = useAppPreferences();
  const { data: session } = useSession();
  const loginModal = useLoginModal();

  // State للتحكم بالمودال
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(session?.user?.name || "");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // تحديد نوع الطلب
  const requestKind = data.sellOrRent === "RENT" ? "RENT" : "BUY";
  const requestTitle =
    requestKind === "RENT"
      ? isArabic
        ? "طلب إيجار"
        : "Rental request"
      : isArabic
        ? "طلب شراء"
        : "Purchase request";

  // دالة الإرسال
  const submitContact = async () => {
    try {
      // التحقق من البيانات
      if (!fullName.trim()) {
        toast.error(isArabic ? "يرجى إدخال الاسم" : "Please enter your name");
        return;
      }

      if (!phoneNumber.trim()) {
        toast.error(
          isArabic ? "يرجى إدخال رقم الهاتف" : "Please enter phone number",
        );
        return;
      }

      setLoading(true);

      // إرسال الطلب
      const res = await fetch("/api/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: data.id,
          itemType,
          fullName,
          requestKind, // "BUY" أو "RENT" ← المهم جداً
          phoneNumber,
          note: note || undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message);
      }

      // النجاح
      toast.success(
        isArabic
          ? "تم إرسال معلومات التواصل بنجاح"
          : "Contact info sent successfully",
      );

      // إغلاق المودال وتنظيف البيانات
      setOpen(false);
      setFullName(session?.user?.name || "");
      setPhoneNumber("");
      setNote("");
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : isArabic
            ? "فشل الإرسال"
            : "Failed to send",
      );
    } finally {
      setLoading(false);
    }
  };

  // الواجهة
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 space-y-4">
      {/* العنوان والسعر */}
      <div>
        <p className="text-sm text-gray-600">
          {isArabic ? "التواصل" : "Contact"}
        </p>
        <h3 className="text-xl font-bold">{data.title}</h3>
        <p className="text-2xl font-bold text-emerald-600">
          {data.price} {data.currency}
        </p>
      </div>

      {/* حالة التوفر */}
      <div className="flex items-center gap-2">
        {data.status === Availability.AVAILABLE ? (
          <>
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-sm text-green-600">
              {isArabic ? "متوفر حالياً" : "Available"}
            </span>
          </>
        ) : (
          <>
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-sm text-red-600">
              {isArabic ? "غير متوفر" : "Unavailable"}
            </span>
          </>
        )}
      </div>

      {/* زر التواصل */}
      <button
        onClick={() => {
          // التحقق من تسجيل الدخول
          if (!session?.user?.id) {
            loginModal.onOpen();
            return;
          }
          setOpen(true);
        }}
        disabled={data.status !== Availability.AVAILABLE}
        className={`w-full py-3 rounded-lg font-bold transition ${
          data.status === Availability.AVAILABLE
            ? "bg-emerald-600 text-white hover:bg-emerald-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {requestTitle}
      </button>

      {/* المودال */}
      {open && (
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
      )}

      {/* ملاحظة */}
      <p className="text-xs text-gray-500 text-center">
        {isArabic
          ? "سيتم إرسال بيانات الاتصال مباشرة إلى مالك العنصر"
          : "Your contact info will be sent directly to the owner"}
      </p>
    </div>
  );
};

export default memo(ContactOwnerElement);
```

---

#### 3. مكون ContactModal - النموذج

```tsx
// filepath: src/app/items/details/[id]/ContactModal.tsx

"use client";

import React, { Dispatch, SetStateAction, useEffect } from "react";
import { useAppPreferences } from "@/app/components/providers/AppPreferencesProvider";

interface ContactModalProps {
  fullName: string;
  setFullName: Dispatch<SetStateAction<string>>;
  phoneNumber: string;
  setPhoneNumber: Dispatch<SetStateAction<string>>;
  note: string;
  setNote: Dispatch<SetStateAction<string>>;
  submitContact: () => Promise<void>;
  loading: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const ContactModal = ({
  fullName,
  setFullName,
  phoneNumber,
  setPhoneNumber,
  note,
  setNote,
  submitContact,
  loading,
  setOpen,
}: ContactModalProps) => {
  const { isArabic } = useAppPreferences();

  // منع التمرير في الخلفية
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md space-y-4"
      >
        {/* رأس المودال */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isArabic ? "التواصل مع المالك" : "Contact Owner"}
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* النص التعريفي */}
        <p className="text-sm text-gray-600">
          {isArabic
            ? "أدخل بيانات الاتصال الخاصة بك. سيتم إرسالها مباشرة إلى مالك العنصر."
            : "Enter your contact details. They will be sent directly to the owner."}
        </p>

        {/* الحقول */}
        <div className="space-y-3">
          {/* الاسم */}
          <input
            type="text"
            placeholder={isArabic ? "الاسم الكامل" : "Full name"}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          {/* الهاتف */}
          <input
            type="tel"
            placeholder={isArabic ? "رقم الهاتف" : "Phone number"}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />

          {/* الملاحظة */}
          <textarea
            placeholder={isArabic ? "ملاحظة (اختياري)" : "Note (optional)"}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* الأزرار */}
        <div className="flex gap-2 pt-4">
          <button
            onClick={submitContact}
            disabled={loading}
            className="flex-1 bg-emerald-600 text-white py-3 rounded-lg font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading
              ? isArabic
                ? "جاري الإرسال..."
                : "Sending..."
              : isArabic
                ? "إرسال رقم الهاتف"
                : "Send Phone Number"}
          </button>

          <button
            onClick={() => setOpen(false)}
            className="flex-1 bg-gray-200 dark:bg-gray-700 py-3 rounded-lg font-bold hover:bg-gray-300"
          >
            {isArabic ? "إلغاء" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;
```

---

## السيناريو 2️⃣: إضافة سيارة جديدة مع الشراء والإيجار

### المسار: `src/app/components/modals/usedCar/AddUsedCarModal.tsx`

```tsx
"use client";

import { memo, useEffect, useState } from "react";
import h from "@/app/hooks";
import Modal from "../Modal";
import { FieldValues, SubmitHandler } from "react-hook-form";
import FormUsedCar from "../body/FormUsedCar";
import toast from "react-hot-toast";
import { useAppPreferences } from "../../providers/AppPreferencesProvider";

const AddUsedCarModal = () => {
  const router = useRouter();
  const addCar = h.useUsedCarModal();
  const { isArabic } = useAppPreferences();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const { register, handleSubmit, watch, reset, formState } =
    useAddUsedCarForm();

  // التعامل مع الأوضاع: إنشاء أو تعديل
  useEffect(() => {
    if (addCar.isOpen && addCar.mode === "edit" && addCar.initialData) {
      // ملء البيانات للتعديل
      reset({
        brand: addCar.initialData.brand,
        model: addCar.initialData.model,
        year: addCar.initialData.year,
        price: addCar.initialData.price,
        // ... باقي البيانات
      });
    } else if (addCar.isOpen && addCar.mode === "create") {
      reset();
    }
  }, [addCar.isOpen, addCar.mode]);

  // دالة الإرسال
  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    try {
      // التحقق من الصور
      if (!selectedImages.length) {
        toast.error(isArabic ? "الصور مطلوبة" : "Images required");
        return;
      }

      setIsLoading(true);

      const formData = new FormData();
      formData.append("brand", data.brand);
      formData.append("model", data.model);
      formData.append("year", data.year);
      formData.append("price", data.price);
      formData.append("sellOrRent", data.sellOrRent); // ← مهم
      formData.append("rentType", data.rentType || ""); // ← مهم للإيجار
      formData.append("gearType", data.gearType);
      formData.append("fuelType", data.fuelType);
      // ... باقي البيانات

      selectedImages.forEach((file) => {
        formData.append("images", file);
      });

      const url =
        addCar.mode === "create" ? "/api/cars/used_car" : "/api/cars/used_car";
      const method = addCar.mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      toast.success(
        isArabic ? "تم حفظ السيارة بنجاح" : "Car saved successfully",
      );

      addCar.onClose();
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
      body={
        <FormUsedCar
          register={register}
          watch={watch}
          selectedImages={selectedImages}
          setSelectedImages={setSelectedImages}
        />
      }
    />
  );
};

export default memo(AddUsedCarModal);
```

---

## السيناريو 3️⃣: كيفية فتح المودالات من أماكن مختلفة

### من صفحة الملف الشخصي (Profile)

```tsx
// filepath: src/app/(user)/profile/Profile.tsx

"use client";

import { useRouter } from "next/navigation";
import h from "@/app/hooks";

export default function ProfilePage() {
  const router = useRouter();
  const addCar = h.useUsedCarModal();
  const addProperty = h.usePropertyModal();
  const addOther = h.useAddOther();

  return (
    <div className="p-6 space-y-6">
      {/* قسم الإجراءات */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">إضافة عنصر جديد - Add New Item</h2>

        <button
          onClick={() => addCar.onOpen("create")}
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          إضافة سيارة - Add Car
        </button>

        <button
          onClick={() => addProperty.onOpen()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          إضافة عقار - Add Property
        </button>

        <button
          onClick={() => addOther.onOpen()}
          className="w-full bg-blue-600 text-white py-3 rounded-lg"
        >
          إضافة عنصر آخر - Add Other Item
        </button>
      </section>

      {/* قسم طلباتي */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">
          طلبات الشراء والإيجار - My Requests
        </h2>

        <div className="bg-white p-4 rounded-lg">{/* قائمة الطلبات */}</div>
      </section>
    </div>
  );
}
```

---

### من قائمة النشر (Publish Menu)

```tsx
// filepath: src/app/components/header/PublishMenu.tsx

"use client";

import h from "@/app/hooks";
import useLoginModal from "@/app/hooks/useLoginModal";
import { useSession } from "next-auth/react";

export default function PublishMenu() {
  const { data: session } = useSession();
  const loginModal = useLoginModal();
  const addCar = h.useUsedCarModal();
  const addProperty = h.usePropertyModal();
  const addOther = h.useAddOther();

  const handlePublish = (type: string) => {
    if (!session?.user?.id) {
      loginModal.onOpen();
      return;
    }

    switch (type) {
      case "car":
        addCar.onOpen("create");
        break;
      case "property":
        addProperty.onOpen();
        break;
      case "other":
        addOther.onOpen();
        break;
    }
  };

  return (
    <div className="space-y-2">
      <button onClick={() => handlePublish("car")}>إضافة سيارة</button>
      <button onClick={() => handlePublish("property")}>إضافة عقار</button>
      <button onClick={() => handlePublish("other")}>إضافة عنصر</button>
    </div>
  );
}
```

---

## 🔑 النقاط المهمة جداً

### ✅ استخدام الصيح:

1. **طلب الشراء:**

   ```tsx
   requestKind: "BUY";
   ```

2. **طلب الإيجار:**

   ```tsx
   requestKind: "RENT";
   sellOrRent: "RENT";
   rentType: "MONTHLY"; // أو أي نوع إيجار آخر
   ```

3. **فتح Modal:**

   ```tsx
   // Zustand
   const modal = useUsedCarModal();
   modal.onOpen("create"); // للإنشاء
   modal.onOpen("edit", data); // للتعديل
   modal.onClose();

   // State عادي
   const [open, setOpen] = useState(false);
   setOpen(true); // للفتح
   setOpen(false); // للإغلاق
   ```

### ❌ تجنب:

1. **لا تنسى `requestKind`:**

   ```tsx
   ❌ WRONG
   const res = await fetch("/api/purchase", {
     body: JSON.stringify({
       itemId,
       phoneNumber,
     })
   })

   ✅ CORRECT
   const res = await fetch("/api/purchase", {
     body: JSON.stringify({
       itemId,
       requestKind: "BUY", // ← مهم جداً
       phoneNumber,
     })
   })
   ```

2. **لا تفتح مودالين معاً:**

   ```tsx
   ❌ WRONG
   <ContactElement ... />
   <PurchaseElement ... />

   ✅ CORRECT
   <ContactElement ... />
   ```

3. **لا تنسى تحقق البيانات:**

   ```tsx
   ❌ WRONG
   const submitForm = async () => {
     const res = await fetch(...)
   }

   ✅ CORRECT
   const submitForm = async () => {
     if (!phoneNumber.trim()) {
       toast.error("Phone required")
       return
     }
     const res = await fetch(...)
   }
   ```

---

**آخر تحديث:** مايو 2026
