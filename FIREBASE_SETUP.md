# Firebase Admin SDK – إعداد Service Account Credentials

## الخطوات

### 1. افتح Firebase Console
https://console.firebase.google.com/project/mashhoor-afea3/settings/serviceaccounts/adminsdk

### 2. أنشئ مفتاح جديد
- اضغط **Generate new private key**
- ستنزل ملف JSON يحتوي:
  ```json
  {
    "project_id": "mashhoor-afea3",
    "client_email": "firebase-adminsdk-xxxxx@mashhoor-afea3.iam.gserviceaccount.com",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\nMIIEo...\n-----END RSA PRIVATE KEY-----\n"
  }
  ```

### 3. أضف القيم إلى .env
افتح ملف `.env` في جذر المشروع وأضف:

```env
FIREBASE_PROJECT_ID="mashhoor-afea3"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@mashhoor-afea3.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEo...\n-----END RSA PRIVATE KEY-----\n"
```

> **مهم**: في `FIREBASE_PRIVATE_KEY` يجب أن تكون كل줄 رديف `\n` (ليس سطرًا حقيقيًا) - انسخ القيمة كما هي من JSON مع `\n`.

### 4. إنشاء Firestore Index مطلوب
اذهب إلى:
https://console.firebase.google.com/project/mashhoor-afea3/firestore/indexes

أنشئ Composite Index:
- **Collection**: `conversations`
- **Fields**:
  - `participants` → Arrays
  - `lastMessageAt` → Descending
- **Query scope**: Collection

### 5. تحقق من العمل
بعد إضافة المتغيرات، شغّل:

```powershell
# اختبار Firebase Admin مباشرة
node tmp/test-firebase-admin.js
```

---

## ملاحظة مهمة
بدون هذه المتغيرات، كل routes `/api/chat/*` تفشل بـ:
```
{"message": "Failed to send message"}
```
لأن `adminFirestore` لا يستطيع الاتصال بـ Firestore.
